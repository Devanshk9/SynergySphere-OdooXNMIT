// routes/threads.routes.js
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

function isUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}

// can the user view this project? (owner or any member)
async function canViewProject(projectId, userId) {
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
  return !!rows.length;
}

// owner/admin on project?
async function isOwnerOrAdmin(projectId, userId) {
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM projects p
    LEFT JOIN project_members pm
      ON pm.project_id = p.id AND pm.user_id = $2
    WHERE p.id = $1
      AND (p.created_by = $2 OR pm.role IN ('owner','admin'))
    LIMIT 1
    `,
    [projectId, userId]
  );
  return !!rows.length;
}

// load a thread with its project id + author
async function getThreadCtx(threadId) {
  const { rows } = await pool.query(
    `
    SELECT dt.id, dt.project_id, dt.title, dt.created_by, dt.created_at, dt.updated_at
    FROM discussion_threads dt
    WHERE dt.id = $1
    `,
    [threadId]
  );
  return rows[0] || null;
}

/* ---------------- ROUTES ---------------- */

/**
 * GET /projects/:projectId/threads – list threads
 * Query:
 *   q? (search title), page?, limit?, sort? (created_at|updated_at|title), order? (asc|desc)
 */
router.get("/projects/:projectId/threads", authRequired, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (!isUUID(projectId)) return res.status(400).json({ error: "Invalid projectId" });

    if (!(await canViewProject(projectId, req.user.id))) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { q, sort = "updated_at", order = "desc" } = req.query;

    const sortCols = { created_at: "dt.created_at", updated_at: "dt.updated_at", title: "dt.title" };
    const sortCol = sortCols[sort] ?? "dt.updated_at";
    const sortOrder = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

    const where = ["dt.project_id = $1"];
    const vals = [projectId];

    if (q?.trim()) {
      vals.push(`%${q.trim()}%`);
      where.push(`LOWER(dt.title) LIKE LOWER($${vals.length})`);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM discussion_threads dt ${whereSQL}`,
      vals
    );
    const total = cnt[0]?.total ?? 0;

    const dataVals = [...vals, limit, offset];

    // include creator info + message_count for convenience
    const { rows: items } = await pool.query(
      `
      SELECT
        dt.id, dt.project_id, dt.title, dt.created_by, u.full_name AS author_name,
        u.email AS author_email, dt.created_at, dt.updated_at,
        COALESCE(m.msg_count, 0)::int AS message_count
      FROM discussion_threads dt
      JOIN users u ON u.id = dt.created_by
      LEFT JOIN (
        SELECT thread_id, COUNT(*) AS msg_count
        FROM discussion_messages
        GROUP BY thread_id
      ) m ON m.thread_id = dt.id
      ${whereSQL}
      ORDER BY ${sortCol} ${sortOrder}, dt.id ASC
      LIMIT $${dataVals.length - 1} OFFSET $${dataVals.length}
      `,
      dataVals
    );

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasPrev: page > 1,
      hasNext: page * limit < total,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /projects/:projectId/threads – create thread
 * Body: { title: string }
 * Allowed: any project member (including owner)
 */
router.post("/projects/:projectId/threads", authRequired, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title } = req.body || {};

    if (!isUUID(projectId)) return res.status(400).json({ error: "Invalid projectId" });
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }

    if (!(await canViewProject(projectId, req.user.id))) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO discussion_threads (project_id, title, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, project_id, title, created_by, created_at, updated_at
      `,
      [projectId, title.trim(), req.user.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /threads/:threadId – thread details
 */
router.get("/threads/:threadId", authRequired, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    if (!isUUID(threadId)) return res.status(400).json({ error: "Invalid threadId" });

    const t = await getThreadCtx(threadId);
    if (!t) return res.status(404).json({ error: "Thread not found" });

    if (!(await canViewProject(t.project_id, req.user.id))) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const { rows } = await pool.query(
      `
      SELECT dt.id, dt.project_id, dt.title, dt.created_by,
             u.full_name AS author_name, u.email AS author_email,
             dt.created_at, dt.updated_at
      FROM discussion_threads dt
      JOIN users u ON u.id = dt.created_by
      WHERE dt.id = $1
      `,
      [threadId]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /threads/:threadId – update thread (title)
 * Allowed: thread author OR project owner/admin
 * Body: { title }
 */
router.patch("/threads/:threadId", authRequired, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const { title } = req.body || {};

    if (!isUUID(threadId)) return res.status(400).json({ error: "Invalid threadId" });
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }

    const t = await getThreadCtx(threadId);
    if (!t) return res.status(404).json({ error: "Thread not found" });

    const isAuthor = t.created_by === req.user.id;
    const canModerate = await isOwnerOrAdmin(t.project_id, req.user.id);
    if (!isAuthor && !canModerate) return res.status(403).json({ error: "Not allowed" });

    const { rows } = await pool.query(
      `
      UPDATE discussion_threads
         SET title = $2
       WHERE id = $1
       RETURNING id, project_id, title, created_by, created_at, updated_at
      `,
      [threadId, title.trim()]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /threads/:threadId – delete thread
 * Allowed: thread author OR project owner/admin
 * (Messages will cascade delete via FK.)
 */
router.delete("/threads/:threadId", authRequired, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    if (!isUUID(threadId)) return res.status(400).json({ error: "Invalid threadId" });

    const t = await getThreadCtx(threadId);
    if (!t) return res.status(404).json({ error: "Thread not found" });

    const isAuthor = t.created_by === req.user.id;
    const canModerate = await isOwnerOrAdmin(t.project_id, req.user.id);
    if (!isAuthor && !canModerate) return res.status(403).json({ error: "Not allowed" });

    const r = await pool.query(`DELETE FROM discussion_threads WHERE id = $1`, [threadId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Thread not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
