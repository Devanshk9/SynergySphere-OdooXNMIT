import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import "dotenv/config";

const router = Router();

/**
 * GET /projects/:projectId/members
 * List members of a project
 */
router.get("/:projectId/members", authRequired, async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const { rows } = await pool.query(
      `
      SELECT pm.user_id, pm.role, pm.added_at,
             u.full_name, u.email, u.avatar_url
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY pm.added_at ASC
      `,
      [projectId]
    );

    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /projects/:projectId/members
 * Add a new member to project
 * body: { userId: uuid, role: 'admin' | 'member' | 'viewer' }
 */
router.post("/:projectId/members", authRequired, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId, role = "member" } = req.body || {};

    if (!userId) return res.status(400).json({ error: "userId is required" });

    const { rows } = await pool.query(
      `
      INSERT INTO project_members (project_id, user_id, role, added_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (project_id, user_id)
      DO UPDATE SET role = EXCLUDED.role
      RETURNING project_id, user_id, role, added_at
      `,
      [projectId, userId, role]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /projects/:projectId/members/:userId
 * Change a member’s role
 * body: { role }
 */
router.patch("/:projectId/members/:userId", authRequired, async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body || {};

    if (!role) return res.status(400).json({ error: "role is required" });

    const { rows } = await pool.query(
      `
      UPDATE project_members
      SET role = $3
      WHERE project_id = $1 AND user_id = $2
      RETURNING project_id, user_id, role, added_at
      `,
      [projectId, userId, role]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Member not found" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /projects/:projectId/members/:userId
 * Remove a member from a project
 */
router.delete("/:projectId/members/:userId", authRequired, async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const result = await pool.query(
      `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Member not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// quick UUID check
const isUUID = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));

/**
 * GET /projects/:projectId/members/:userId
 * -> returns membership (404 if not a member)
 */
router.get("/:projectId/members/:userId", authRequired, async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    if (!isUUID(projectId) || !isUUID(userId)) {
      return res.status(400).json({ error: "Invalid projectId or userId" });
    }

    const q = await pool.query(
      `
      SELECT pm.project_id, pm.user_id, pm.role, pm.added_at,
             u.full_name, u.email, u.avatar_url
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1 AND pm.user_id = $2
      `,
      [projectId, userId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ error: "User is not a member of this project" });
    }

    return res.json(q.rows[0]);
  } catch (err) {
    next(err);
  }
});
router.get("/:projectId/members/me", authRequired, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    if (!isUUID(projectId)) {
      return res.status(400).json({ error: "Invalid projectId" });
    }

    const q = await pool.query(
      `
      SELECT pm.project_id, pm.user_id, pm.role, pm.added_at
      FROM project_members pm
      WHERE pm.project_id = $1 AND pm.user_id = $2
      `,
      [projectId, userId]
    );

    if (q.rowCount === 0) return res.status(404).json({ error: "Not a member" });
    return res.json(q.rows[0]);
  } catch (err) {
    next(err);
  }
});


export default router;
