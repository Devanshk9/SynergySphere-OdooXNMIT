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

// load a thread (to get its project)
async function getThreadCtx(threadId) {
  const { rows } = await pool.query(
    `SELECT id, project_id, title, created_by FROM discussion_threads WHERE id = $1`,
    [threadId]
  );
  return rows[0] || null;
}

// load a message with its thread + project
async function getMessageCtx(messageId) {
  const { rows } = await pool.query(
    `
    SELECT m.id, m.thread_id, m.author_id, m.body, m.parent_message_id,
           t.project_id
      FROM discussion_messages m
      JOIN discussion_threads t ON t.id = m.thread_id
     WHERE m.id = $1
    `,
    [messageId]
  );
  return rows[0] || null;
}

/* ---------------- ROUTES ---------------- */

/**
 * GET /threads/:threadId/messages
 * Query: page?, limit?, parentId? (only replies), order? (asc|desc, default asc)
 * Ordered by created_at.
 */
router.get("/threads/:threadId/messages", authRequired, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const { parentId, order = "asc" } = req.query;

    if (!isUUID(threadId)) return res.status(400).json({ error: "Invalid threadId" });

    const thread = await getThreadCtx(threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    if (!(await canViewProject(thread.project_id, req.user.id))) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const { page, limit, offset } = parsePagination(req.query);
    const sortOrder = String(order).toLowerCase() === "desc" ? "DESC" : "ASC";

    const where = ["m.thread_id = $1"];
    const vals = [threadId];

    if (typeof parentId === "string" && parentId) {
      if (!isUUID(parentId)) return res.status(400).json({ error: "Invalid parentId" });
      vals.push(parentId);
      where.push(`m.parent_message_id = $${vals.length}`);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM discussion_messages m ${whereSQL}`,
      vals
    );
    const total = cnt[0]?.total ?? 0;

    const dataVals = [...vals, limit, offset];
    const { rows: items } = await pool.query(
      `
      SELECT m.id, m.thread_id, m.author_id, u.full_name, u.email, u.avatar_url,
             m.body, m.parent_message_id, m.created_at, m.updated_at
        FROM discussion_messages m
        JOIN users u ON u.id = m.author_id
       ${whereSQL}
       ORDER BY m.created_at ${sortOrder}, m.id ASC
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
 * POST /threads/:threadId/messages
 * Body: { body: string, parent_message_id?: uuid }
 * Allowed: any project member (including owner)
 */
router.post("/threads/:threadId/messages", authRequired, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const { body, parent_message_id = null } = req.body || {};

    if (!isUUID(threadId)) return res.status(400).json({ error: "Invalid threadId" });
    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "body is required" });
    }

    const thread = await getThreadCtx(threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    if (!(await canViewProject(thread.project_id, req.user.id))) {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (parent_message_id !== null) {
      if (!isUUID(parent_message_id)) {
        return res.status(400).json({ error: "Invalid parent_message_id" });
      }
      // parent must belong to same thread
      const { rows: p } = await pool.query(
        `SELECT 1 FROM discussion_messages WHERE id = $1 AND thread_id = $2`,
        [parent_message_id, threadId]
      );
      if (!p.length) {
        return res.status(400).json({ error: "parent_message_id not found for this thread" });
      }
    }

    const { rows } = await pool.query(
      `
      INSERT INTO discussion_messages (thread_id, author_id, body, parent_message_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, thread_id, author_id, body, parent_message_id, created_at, updated_at
      `,
      [threadId, req.user.id, body.trim(), parent_message_id]
    );

    // Get the message with user details
    const { rows: messageWithUser } = await pool.query(
      `
      SELECT m.id, m.thread_id, m.author_id, u.full_name, u.email, u.avatar_url,
             m.body, m.parent_message_id, m.created_at, m.updated_at
      FROM discussion_messages m
      JOIN users u ON u.id = m.author_id
      WHERE m.id = $1
      `,
      [rows[0].id]
    );

    res.status(201).json(messageWithUser[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /messages/:messageId
 * Body: { body: string }
 * Allowed: message author OR project owner/admin
 */
router.patch("/messages/:messageId", authRequired, async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { body } = req.body || {};

    if (!isUUID(messageId)) return res.status(400).json({ error: "Invalid messageId" });
    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "body is required" });
    }

    const msg = await getMessageCtx(messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const isAuthor = msg.author_id === req.user.id;
    const canModerate = await isOwnerOrAdmin(msg.project_id, req.user.id);
    if (!isAuthor && !canModerate) return res.status(403).json({ error: "Not allowed" });

    const { rows } = await pool.query(
      `
      UPDATE discussion_messages
         SET body = $2
       WHERE id = $1
       RETURNING id, thread_id, author_id, body, parent_message_id, created_at, updated_at
      `,
      [messageId, body.trim()]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /messages/:messageId
 * Allowed: message author OR project owner/admin
 * (Replies cascade delete via FK.)
 */
router.delete("/messages/:messageId", authRequired, async (req, res, next) => {
  try {
    const { messageId } = req.params;
    if (!isUUID(messageId)) return res.status(400).json({ error: "Invalid messageId" });

    const msg = await getMessageCtx(messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const isAuthor = msg.author_id === req.user.id;
    const canModerate = await isOwnerOrAdmin(msg.project_id, req.user.id);
    if (!isAuthor && !canModerate) return res.status(403).json({ error: "Not allowed" });

    const r = await pool.query(`DELETE FROM discussion_messages WHERE id = $1`, [messageId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Message not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
