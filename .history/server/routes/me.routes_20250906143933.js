import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/* ------------ helpers ------------ */
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

/**
 * GET /me/tasks
 * Tasks assigned to the current user.
 * Query:
 *   q?                - search title/description
 *   status?           - 'todo' | 'in_progress' | 'done' | 'blocked'
 *   is_archived?      - true | false
 *   projectId?        - filter to one project (uuid)
 *   due_from?, due_to? (YYYY-MM-DD)
 *   sort?             - created_at | updated_at | due_date | title | status
 *   order?            - asc | desc
 *   page?, limit?
 */
router.get("/me/tasks", authRequired, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const {
      q,
      status,
      is_archived,
      projectId,
      due_from,
      due_to,
      sort = "due_date",
      order = "asc",
    } = req.query;

    const sortCols = {
      created_at: "t.created_at",
      updated_at: "t.updated_at",
      due_date: "t.due_date",
      title: "t.title",
      status: "t.status",
    };
    const sortCol = sortCols[sort] ?? "t.due_date";
    const sortOrder = String(order).toLowerCase() === "desc" ? "DESC" : "ASC";

    const where = ["ta.user_id = $1"]; // assigned to me
    const vals = [req.user.id];

    if (q?.trim()) {
      vals.push(`%${q.trim()}%`);
      where.push(
        `(LOWER(t.title) LIKE LOWER($${vals.length}) OR LOWER(COALESCE(t.description,'')) LIKE LOWER($${vals.length}))`
      );
    }
    if (typeof status === "string" && status.trim()) {
      vals.push(status.trim());
      where.push(`t.status = $${vals.length}`);
    }
    if (typeof is_archived !== "undefined") {
      vals.push(String(is_archived) === "true");
      where.push(`t.is_archived = $${vals.length}`);
    }
    if (projectId) {
      if (!isUUID(projectId)) return res.status(400).json({ error: "Invalid projectId" });
      vals.push(projectId);
      where.push(`t.project_id = $${vals.length}`);
    }
    if (due_from) {
      vals.push(due_from);
      where.push(`t.due_date >= $${vals.length}`);
    }
    if (due_to) {
      vals.push(due_to);
      where.push(`t.due_date <= $${vals.length}`);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;

    // total
    const { rows: cnt } = await pool.query(
      `
      SELECT COUNT(*)::int AS total
        FROM tasks t
        JOIN task_assignees ta ON ta.task_id = t.id
       ${whereSQL}
      `,
      vals
    );
    const total = cnt[0]?.total ?? 0;

    // page data
    const dataVals = [...vals, limit, offset];
    const { rows: items } = await pool.query(
      `
      SELECT
        t.id, t.project_id, p.name AS project_name,
        t.title, t.description, t.status, t.due_date,
        t.is_archived, t.created_by, t.created_at, t.updated_at,
        ta.assigned_at
      FROM tasks t
      JOIN task_assignees ta ON ta.task_id = t.id
      JOIN projects p        ON p.id = t.project_id
      ${whereSQL}
      ORDER BY ${sortCol} ${sortOrder}, t.id ASC
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

export default router;
