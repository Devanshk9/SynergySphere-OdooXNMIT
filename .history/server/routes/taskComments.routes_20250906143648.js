import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/* ---------------- helpers ---------------- */

function isUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

function parsePagination(query) {
  let page = Number(query.page ?? 1);
  let limit = Number(query.limit ?? 20);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Verify task exists AND requester can at least view its project (owner or member)
async function getTaskAndVisibility(taskId, requesterId) {
  const { rows } = await pool.query(
    `
    SELECT t.id, t.project_id, p.created_by AS project_owner
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1
    `,
    [taskId]
  );
  if (!rows.length) return { code: 404, error: "Task not found" };
  const task = rows[0];

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
    [task.project_id, requesterId]
  );
  if (!vis.length) return { code: 403, error: "Not allowed" };

  return { task };
}

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

// Load comment with its task/project
async function getCommentCtx(commentId) {
  const { rows } = await pool.query(
    `
    SELECT c.id, c.task_id, c.author_id, c.body, c.parent_comment_id,
           t.project_id, p.created_by AS project_owner
      FROM task_comments c
      JOIN tasks t   ON t.id = c.task_id
      JOIN projects p ON p.id = t.project_id
     WHERE c.id = $1
    `,
    [commentId]
  );
  return rows[0] || null;
}

/* ---------------- ROUTES ---------------- */

/**
 * GET /tasks/:taskId/comments
 * Query: page?, limit?, parentId? (to fetch only replies of a parent)
 * Ordered by created_at ASC.
 */
router.get("/tasks/:taskId/comments", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { parentId } = req.query;
    if (!isUUID(taskId)) return res.status(400).json({ error: "Invalid taskId" });

    const ctx = await getTaskAndVisibility(taskId, req.user.id);
    if (ctx.error) return res.status(ctx.code).json({ error: ctx.error });

    const { page, limit, offset } = parsePagination(req.query);

    const where = ["c.task_id = $1"];
    const vals = [taskId];

    if (typeof parentId === "string" && parentId) {
      if (!isUUID(parentId)) return res.status(400).json({ error: "Invalid parentId" });
      vals.push(parentId);
      where.push("c.parent_comment_id = $" + vals.length);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM task_comments c ${whereSQL}`,
      vals
    );
    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataVals = [...vals, limit, offset];
    const { rows: items } = await pool.query(
      `
      SELECT c.id, c.task_id, c.author_id, u.full_name, u.email, u.avatar_url,
             c.body, c.parent_comment_id, c.created_at, c.updated_at
        FROM task_comments c
        JOIN users u ON u.id = c.author_id
       ${whereSQL}
       ORDER BY c.created_at ASC
       LIMIT $${dataVals.length - 1} OFFSET $${dataVals.length}
      `,
      dataVals
    );

    res.json({ items, page, limit, total, totalPages });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks/:taskId/comments
 * Body: { body: string, parent_comment_id?: uuid }
 * Requires project membership (owner or member).
 */
router.post("/tasks/:taskId/comments", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { body, parent_comment_id = null } = req.body || {};

    if (!isUUID(taskId)) return res.status(400).json({ error: "Invalid taskId" });
    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "body is required" });
    }

    const ctx = await getTaskAndVisibility(taskId, req.user.id);
    if (ctx.error) return res.status(ctx.code).json({ error: ctx.error });

    // if replying, parent must exist and belong to the same task
    if (parent_comment_id !== null) {
      if (!isUUID(parent_comment_id)) {
        return res.status(400).json({ error: "Invalid parent_comment_id" });
      }
      const { rows: p } = await pool.query(
        `SELECT 1 FROM task_comments WHERE id = $1 AND task_id = $2`,
        [parent_comment_id, taskId]
      );
      if (!p.length) {
        return res.status(400).json({ error: "parent_comment_id not found for this task" });
      }
    }

    const { rows } = await pool.query(
      `
      INSERT INTO task_comments (task_id, author_id, body, parent_comment_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, task_id, author_id, body, parent_comment_id, created_at, updated_at
      `,
      [taskId, req.user.id, body.trim(), parent_comment_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /task-comments/:commentId
 * Body: { body: string }
 * Allowed: comment author OR project owner/admin
 */
router.patch("/task-comments/:commentId", authRequired, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body || {};

    if (!isUUID(commentId)) return res.status(400).json({ error: "Invalid commentId" });
    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "body is required" });
    }

    const c = await getCommentCtx(commentId);
    if (!c) return res.status(404).json({ error: "Comment not found" });

    const isAuthor = c.author_id === req.user.id;
    const canModerate = await isOwnerOrAdmin(c.project_id, req.user.id);

    if (!isAuthor && !canModerate) return res.status(403).json({ error: "Not allowed" });

    const { rows } = await pool.query(
      `
      UPDATE task_comments
         SET body = $2
       WHERE id = $1
       RETURNING id, task_id, author_id, body, parent_comment_id, created_at, updated_at
      `,
      [commentId, body.trim()]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /task-comments/:commentId
 * Allowed: comment author OR project owner/admin
 * (Replies are deleted automatically via ON DELETE CASCADE.)
 */
router.delete("/task-comments/:commentId", authRequired, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    if (!isUUID(commentId)) return res.status(400).json({ error: "Invalid commentId" });

    const c = await getCommentCtx(commentId);
    if (!c) return res.status(404).json({ error: "Comment not found" });

    const isAuthor = c.author_id === req.user.id;
    const canModerate = await isOwnerOrAdmin(c.project_id, req.user.id);
    if (!isAuthor && !canModerate) return res.status(403).json({ error: "Not allowed" });

    const r = await pool.query(`DELETE FROM task_comments WHERE id = $1`, [commentId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Comment not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
