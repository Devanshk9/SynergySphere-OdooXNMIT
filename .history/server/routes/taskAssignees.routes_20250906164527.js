import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/* ------------ helpers ------------ */

function isUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}

// Load task + project, verify requester can at least see the project
async function getTaskAndVisibility(taskId, requesterId) {
  const { rows } = await pool.query(
    `SELECT t.id, t.project_id, t.created_by AS task_creator, p.created_by AS project_owner
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
      WHERE t.id = $1`,
    [taskId]
  );
  if (!rows.length) return { code: 404, error: "Task not found" };
  const task = rows[0];

  // requester is owner or member?
  const { rows: vis } = await pool.query(
    `SELECT 1
       FROM projects p
  LEFT JOIN project_members pm
         ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1
        AND (p.created_by = $2 OR pm.user_id IS NOT NULL)
      LIMIT 1`,
    [task.project_id, requesterId]
  );
  if (!vis.length) return { code: 403, error: "Not allowed" };

  return { task };
}

// Can requester add/remove assignees? (owner/admin or task creator)
async function canManageAssignees(projectId, taskCreatorId, requesterId) {
  if (requesterId === taskCreatorId) return true;
  const { rows } = await pool.query(
    `SELECT 1
       FROM projects p
  LEFT JOIN project_members pm
         ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1
        AND (p.created_by = $2 OR pm.role IN ('owner','admin'))
      LIMIT 1`,
    [projectId, requesterId]
  );
  return !!rows.length;
}

/* ------------ ROUTES ------------ */

/**
 * GET /tasks/:taskId/assignees
 * Get all assignees for a task
 */
router.get("/tasks/:taskId/assignees", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!isUUID(taskId)) return res.status(400).json({ error: "Invalid taskId" });

    const ctx = await getTaskAndVisibility(taskId, req.user.id);
    if (ctx.error) return res.status(ctx.code).json({ error: ctx.error });

    const { rows } = await pool.query(
      `
      SELECT ta.user_id, ta.assigned_at, u.full_name, u.email, u.avatar_url
      FROM task_assignees ta
      JOIN users u ON u.id = ta.user_id
      WHERE ta.task_id = $1
      ORDER BY ta.assigned_at ASC
      `,
      [taskId]
    );

    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks/:taskId/assignees
 * Body:
 *  - { "userId": "<uuid>" }  OR  { "userIds": ["<uuid>", ...] }
 * Adds assignees (idempotent). Only project owner/admin or task creator may add.
 */
router.post("/tasks/:taskId/assignees", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!isUUID(taskId)) return res.status(400).json({ error: "Invalid taskId" });

    const ctx = await getTaskAndVisibility(taskId, req.user.id);
    if (ctx.error) return res.status(ctx.code).json({ error: ctx.error });

    const allowed = await canManageAssignees(ctx.task.project_id, ctx.task.task_creator, req.user.id);
    if (!allowed) return res.status(403).json({ error: "Not allowed" });

    // normalize input to unique UUID array
    const body = req.body || {};
    let ids = [];
    if (typeof body.userId === "string") ids.push(body.userId);
    if (Array.isArray(body.userIds)) ids = ids.concat(body.userIds);
    ids = [...new Set(ids.map(String).filter(Boolean))];

    if (!ids.length) return res.status(400).json({ error: "userId or userIds required" });

    const invalid = ids.filter((x) => !isUUID(x));
    const candidates = ids.filter((x) => isUUID(x));
    if (!candidates.length) return res.status(400).json({ error: "No valid UUIDs provided", invalid });

    // keep only *project* members (and include project owner)
    const { rows: memberRows } = await pool.query(
      `
      SELECT uid AS user_id FROM (
        SELECT pm.user_id AS uid
          FROM project_members pm
         WHERE pm.project_id = $1
           AND pm.user_id = ANY($2::uuid[])
        UNION
        SELECT p.created_by
          FROM projects p
         WHERE p.id = $1
           AND p.created_by = ANY($2::uuid[])
      ) x
      `,
      [ctx.task.project_id, candidates]
    );
    const memberIds = memberRows.map((r) => r.user_id);
    if (!memberIds.length) {
      return res.status(400).json({
        error: "None of the provided users are members of this project",
        invalid,
        notMembers: candidates
      });
    }

    // skip already assigned
    const { rows: already } = await pool.query(
      `SELECT user_id FROM task_assignees WHERE task_id = $1 AND user_id = ANY($2::uuid[])`,
      [taskId, memberIds]
    );
    const alreadySet = new Set(already.map((r) => String(r.user_id)));
    const toInsert = memberIds.filter((u) => !alreadySet.has(String(u)));

    let added = [];
    if (toInsert.length) {
      const { rows } = await pool.query(
        `
        WITH payload AS (
          SELECT $1::uuid AS task_id, unnest($2::uuid[]) AS user_id
        ), ins AS (
          INSERT INTO task_assignees (task_id, user_id)
          SELECT task_id, user_id FROM payload
          ON CONFLICT (task_id, user_id) DO NOTHING
          RETURNING task_id, user_id, assigned_at
        )
        SELECT i.task_id, i.user_id, i.assigned_at, u.full_name, u.email
          FROM ins i
          JOIN users u ON u.id = i.user_id
         ORDER BY i.assigned_at ASC
        `,
        [taskId, toInsert]
      );
      added = rows;
    }

    return res.status(added.length ? 201 : 200).json({
      added,
      summary: {
        requested: ids.length,
        invalid: invalid.length,
        inserted: added.length,
        alreadyAssigned: alreadySet.size
      }
    });
  } catch (err) {
    // If the DB trigger throws because of a non-member, map to 400
    if (err.code === "23514") return res.status(400).json({ error: "One or more users are not project members" });
    next(err);
  }
});

/**
 * DELETE /tasks/:taskId/assignees/:userId
 * Remove an assignee.
 * Allowed: project owner/admin, task creator, or the user removing themselves.
 */
router.delete("/tasks/:taskId/assignees/:userId", authRequired, async (req, res, next) => {
  try {
    const { taskId, userId } = req.params;
    if (!isUUID(taskId) || !isUUID(userId)) {
      return res.status(400).json({ error: "Invalid taskId or userId" });
    }

    const ctx = await getTaskAndVisibility(taskId, req.user.id);
    if (ctx.error) return res.status(ctx.code).json({ error: ctx.error });

    const isSelf = req.user.id === userId;
    const allowed = isSelf || (await canManageAssignees(ctx.task.project_id, ctx.task.task_creator, req.user.id));
    if (!allowed) return res.status(403).json({ error: "Not allowed" });

    const result = await pool.query(
      `DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Assignee not found" });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
