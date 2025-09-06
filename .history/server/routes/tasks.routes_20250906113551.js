import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/* ---------------- helpers ---------------- */

function parsePagination(query) {
  let page = Number(query.page ?? 1);
  let limit = Number(query.limit ?? 20);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Is the user allowed to access this project?
async function canAccessProject(projectId, userId) {
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM projects p
    LEFT JOIN project_members pm
           ON pm.project_id = p.id AND pm.user_id = $2
    WHERE p.id = $1
      AND (p.created_by = $2 OR pm.user_id IS NOT NULL)
    LIMIT 1
    `,
    [projectId, userId]
  );
  return rows.length > 0;
}

// Load task + project_id and check access
async function getTaskIfAllowed(taskId, userId) {
  const { rows } = await pool.query(
    `SELECT t.*, p.created_by AS project_owner
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
      WHERE t.id = $1`,
    [taskId]
  );
  if (rows.length === 0) return null;

  const t = rows[0];

  // If user is owner or member, allow
  const { rows: vis } = await pool.query(
    `
    SELECT 1
    FROM projects p
    LEFT JOIN project_members pm
           ON pm.project_id = p.id AND pm.user_id = $2
    WHERE p.id = $1
      AND (p.created_by = $2 OR pm.user_id IS NOT NULL)
    LIMIT 1
    `,
    [t.project_id, userId]
  );
  return vis.length ? t : undefined; // undefined = exists but forbidden
}

/* ---------------- Routes ---------------- */

/**
 * GET /projects/:projectId/tasks
 * Query: page, limit, q, status, is_archived, due_from (YYYY-MM-DD), due_to, sort, order
 * sort: created_at | updated_at | due_date | title | status
 */
router.get("/projects/:projectId/tasks", authRequired, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (!(await canAccessProject(projectId, req.user.id)))
      return res.status(404).json({ error: "Project not found" });

    const { page, limit } = parsePagination(req.query);
    const { q, status, is_archived, due_from, due_to, sort = "created_at", order = "desc" } = req.query;

    const sortCols = {
      created_at: "t.created_at",
      updated_at: "t.updated_at",
      due_date: "t.due_date",
      title: "t.title",
      status: "t.status",
    };
    const sortCol = sortCols[sort] ?? "t.created_at";
    const sortOrder = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

    const where = ["t.project_id = $1"];
    const values = [projectId];

    if (q?.trim()) {
      values.push(`%${q.trim()}%`);
      where.push(`(LOWER(t.title) LIKE LOWER($${values.length}) OR LOWER(COALESCE(t.description,'')) LIKE LOWER($${values.length}))`);
    }
    if (typeof status === "string" && status.trim()) {
      values.push(status.trim());
      where.push(`t.status = $${values.length}`);
    }
    if (typeof is_archived !== "undefined") {
      values.push(String(is_archived) === "true");
      where.push(`t.is_archived = $${values.length}`);
    }
    if (due_from) {
      values.push(due_from);
      where.push(`t.due_date >= $${values.length}`);
    }
    if (due_to) {
      values.push(due_to);
      where.push(`t.due_date <= $${values.length}`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // count
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM tasks t
        ${whereSQL}`,
      values
    );
    const total = cnt[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    // data
    const dataValues = [...values, limit, offset];
    const { rows: items } = await pool.query(
      `
      SELECT t.id, t.project_id, t.title, t.description, t.status, t.due_date,
             t.is_archived, t.created_by, t.created_at, t.updated_at
        FROM tasks t
       ${whereSQL}
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}
      `,
      dataValues
    );

    res.json({
      items,
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /projects/:projectId/tasks
 * Body: { title, description?, status?, due_date?, is_archived? }
 * status must match your task_status enum (e.g., 'todo'|'in_progress'|'done')
 */
router.post("/:projectId/tasks", authRequired, async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!(await canAccessProject(projectId, req.user.id)))
      return res.status(404).json({ error: "Project not found" });

    const {
      title,
      description = null,
      status = "todo",
      due_date = null,
      is_archived = false,
    } = req.body || {};

    if (!title?.trim()) return res.status(400).json({ error: "title is required" });

    const { rows } = await pool.query(
      `
      INSERT INTO tasks (project_id, title, description, status, due_date, is_archived, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, project_id, title, description, status, due_date,
                is_archived, created_by, created_at, updated_at
      `,
      [projectId, title.trim(), description, status, due_date, is_archived, req.user.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    // enum violations (invalid status) will come here from PG
    next(err);
  }
});

/**
 * GET /tasks/:taskId
 */
router.get("/tasks/:taskId", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await getTaskIfAllowed(taskId, req.user.id);
    if (task === null) return res.status(404).json({ error: "Task not found" });
    if (task === undefined) return res.status(403).json({ error: "Not allowed" });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /tasks/:taskId
 * Body: { title?, description?, status?, due_date?, is_archived? }
 */
router.patch("/tasks/:taskId", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await getTaskIfAllowed(taskId, req.user.id);
    if (task === null) return res.status(404).json({ error: "Task not found" });
    if (task === undefined) return res.status(403).json({ error: "Not allowed" });

    const { title, description, status, due_date, is_archived } = req.body || {};

    const sets = [];
    const values = [];
    let i = 1;

    if (typeof title === "string") {
      sets.push(`title = $${i++}`);
      values.push(title.trim());
    }
    if (typeof description === "string" || description === null) {
      sets.push(`description = $${i++}`);
      values.push(description);
    }
    if (typeof status === "string") {
      sets.push(`status = $${i++}`);
      values.push(status.trim());
    }
    if (typeof due_date === "string" || due_date === null) {
      sets.push(`due_date = $${i++}`);
      values.push(due_date);
    }
    if (typeof is_archived === "boolean") {
      sets.push(`is_archived = $${i++}`);
      values.push(is_archived);
    }

    if (sets.length === 0) return res.status(400).json({ error: "No valid fields to update" });

    values.push(taskId);

    const { rows } = await pool.query(
      `
      UPDATE tasks
         SET ${sets.join(", ")}
       WHERE id = $${i}
       RETURNING id, project_id, title, description, status, due_date,
                 is_archived, created_by, created_at, updated_at
      `,
      values
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /tasks/:taskId
 * Hard delete. If you prefer soft delete, swap to: SET is_archived = true
 */
router.delete("/tasks/:taskId", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await getTaskIfAllowed(taskId, req.user.id);
    if (task === null) return res.status(404).json({ error: "Task not found" });
    if (task === undefined) return res.status(403).json({ error: "Not allowed" });

    const result = await pool.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Task not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
