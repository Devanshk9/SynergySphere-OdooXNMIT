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
 * Query: page?, limit?, parentId? (only replies), order? (asc|de*
