import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/* ---------------- helpers ---------------- */

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(str || "")
  );
}

// load task + project owner; ensure requester can at least access the project
async function getTaskAndAuthorize(taskId, requesterId) {
  // task + project owner id
  const { rows } = await pool.query(
    `
    SELECT t.id, t.project_id, t.created_by AS task_creator, p.created_by AS project_owner
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = $1
    `,
    [taskId]
  );
  if (rows.length === 0) return { code: 404, error: "Task not found" };
  const t = rows[0];

  // is requester in project (owner or member)?
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
    [t.project_id, requesterId]
  );
  if (!vis.length) return { code: 403, error: "Not allowed" };

  return { task: t };
}

// can requester manage assignees? (project owner/admin or task creator)
async function canManageAssignees(projectId, taskCreatorId, requesterId) {
  if (requesterId === taskCreatorId) return true;

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
    [projectId, requesterId]
  );
  return rows.length > 0;
}

/* ---------------- ROUTES ---------------- */

/**
 * POST /tasks/:taskId/assignees
 * Add one or many assignees.
 * Body:
 *  - userId: uuid            (single)
 *  - OR userIds: uuid[]      (multiple)
 *
 * Only project owner/admin or task creator can assign.
 * Non-members are ignored (not inserted).
 */
router.post("/tasks/:taskId/assignees", authRequired, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!isUUID(taskId)) return res.status(400).json({ error: "Invalid taskId" });

    const auth = await getTaskAndAuthorize(taskId, req.user.id);
    if (auth.error) return res.status(auth.code).json({ error: auth.error });

    const canManage = await canManageAssignees(auth.task.project_id, auth.task.task_creator, req.user.id);
    if (!canManage) return res.status(403).json({ error: "Not allowed" });

    // normalize input → array of UUIDs
    let ids = [];
    const { userId, userIds } = req.body || {};
    if (typeof userId === "string") ids = [userId];
    if (Array.isArray(userIds)) ids = ids.concat(userIds);
    ids = [...new Set(ids.map(String).filter(Boolean))];

    if (!ids.length) return res.status(400).json({ error: "userId or userIds required" });

    const invalid = ids.filter((id) => !isUUID(id));
    const candidate = ids.filter((id) => isUUID(id));
    if (!candidate.length)
      return res.status(400).json({ error: "No valid UUIDs provided", invalid });

    // keep only project members (and include owner even if not listed in members)
    const { rows: memberRows } = await pool.query(
      `
      SELECT u_id AS user_id FROM (
        SELECT pm.user_id AS u_id
        FROM project_members pm
        WHERE pm.project_id = $1 AND pm.user_id = ANY($2::uuid[])
        UNION
        SELECT p.created_by
        FROM projects p
        WHERE p.id = $1 AND p.created_by = ANY($2::uuid[])
      ) x
      `,
      [auth.task.project_id, candidate]
    );
    const memberIds = memberRows.map((r) => r.user_id);

    if (!memberIds.length) {
      return res.status(400).json({
        error: "None of the provided users are members of this project",
        invalid,
        notMembers: candidate,
      });
    }

    // skip already assigned
    const { rows: already } = await pool.query(
      `SELECT user_id FROM task_assignees WHERE task_id = $1 AND user_id = ANY($2::uuid[])`,
      [taskId, memberIds]
    );
    const alreadySet = new Set(already.map((r) => String(r.user_id)));
    const toInsert = memberIds.filter((id) => !alreadySet.has(String(id)));

    let inserted = [];
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
      inserted = rows;
    }

    return res.status(inserted.length ? 201 : 200).json({
      added: inserted,
      summary: {
        requested: ids.length,
        invalid: invalid.length,
        notMembers: candidate.length - memberIds.length,
        alreadyAssigned: alreadySet.size,
        inserted: inserted.length,
      },
    });
  } catch (err) {
    // if trigger still throws, map constraint error nicely
    if (err.code === "23514") {
      return res.status(400).json({ error: "One or more users are not project members" });
    }
    next(err);
  }
});

/**
 * DELETE /tasks/:taskId/assignees/:userId
 * Remove an assignee.
 * Allowed:
 *  - project owner/admin
 *  - task creator
 *  - or the user removing themselves
 */
router.delete("/tasks/:taskId/assignees/:userId", authRequired, async (req, res, next) => {
  try {
    const { taskId, userId } = req.params;
    if (!isUUID(taskId) || !isUUID(userId)) {
      return res.status(400).json({ error: "Invalid taskId or userId" });
    }

    const auth = await getTaskAndAuthorize(taskId, req.user.id);
    if (auth.error) return res.status(auth.code).json({ error: auth.error });

    const isSelf = req.user.id === userId;
    const canManage = await canManageAssignees(auth.task.project_id, auth.task.task_creator, req.user.id);

    if (!isSelf && !canManage) return res.status(403).json({ error: "Not allowed" });

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
