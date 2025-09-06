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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

/* ---------------- ROUTES ---------------- */

/**
 * GET /notifications
 * Your notifications (newest first)
 * Query:
 *   page?, limit?
 *   is_read? (true|false)
 *   type? (matches your notification_type enum)
 *   project_id?, task_id? (uuid)
 */
router.get("/notifications", authRequired, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { is_read, type, project_id, task_id } = req.query;

    const where = ["n.user_id = $1"];
    const vals = [req.user.id];

    if (typeof is_read !== "undefined") {
      vals.push(String(is_read) === "true");
      where.push(`n.is_read = $${vals.length}`);
    }
    if (typeof type === "string" && type.trim()) {
      vals.push(type.trim());
      where.push(`n.type = $${vals.length}`);
    }
    if (project_id) {
      if (!isUUID(project_id)) return res.status(400).json({ error: "Invalid project_id" });
      vals.push(project_id);
      where.push(`n.project_id = $${vals.length}`);
    }
    if (task_id) {
      if (!isUUID(task_id)) return res.status(400).json({ error: "Invalid task_id" });
      vals.push(task_id);
      where.push(`n.task_id = $${vals.length}`);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;

    // total count
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notifications n ${whereSQL}`,
      vals
    );
    const total = cnt[0]?.total ?? 0;

    // page data (include actor info; project/task ids for linking)
    const dataVals = [...vals, limit, offset];
    const { rows: items } = await pool.query(
      `
      SELECT
        n.id, n.type, n.payload, n.project_id, n.task_id,
        n.actor_id, a.full_name AS actor_name, a.email AS actor_email, a.avatar_url AS actor_avatar,
        n.is_read, n.created_at
      FROM notifications n
      LEFT JOIN users a ON a.id = n.actor_id
      ${whereSQL}
      ORDER BY n.created_at DESC, n.id DESC
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
 * PATCH /notifications/:id/read
 * Mark a single notification as read (only if it belongs to me)
 * Body: (none)
 */
router.patch("/notifications/:id/read", authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "Invalid notification id" });

    const { rows } = await pool.query(
      `
      UPDATE notifications
         SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, type, payload, project_id, task_id,
                 actor_id, is_read, created_at
      `,
      [id, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: "Notification not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /notifications/read-all
 * Mark all my notifications as read.
 * Optional filters in body: { type?, project_id?, task_id? }
 */
router.post("/notifications/read-all", authRequired, async (req, res, next) => {
  try {
    const { type, project_id, task_id } = req.body || {};

    const where = ["user_id = $1", "is_read = FALSE"];
    const vals = [req.user.id];

    if (typeof type === "string" && type.trim()) {
      vals.push(type.trim());
      where.push(`type = $${vals.length}`);
    }
    if (project_id) {
      if (!isUUID(project_id)) return res.status(400).json({ error: "Invalid project_id" });
      vals.push(project_id);
      where.push(`project_id = $${vals.length}`);
    }
    if (task_id) {
      if (!isUUID(task_id)) return res.status(400).json({ error: "Invalid task_id" });
      vals.push(task_id);
      where.push(`task_id = $${vals.length}`);
    }

    const sql = `
      UPDATE notifications
         SET is_read = TRUE
       WHERE ${where.join(" AND ")}
    `;
    const result = await pool.query(sql, vals);
    res.json({ updated: result.rowCount });
  } catch (err) {
    next(err);
  }
});

export default router;
