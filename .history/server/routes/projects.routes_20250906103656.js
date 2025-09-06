import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// 🔹 Local helper function
function parsePagination(query) {
  let page = Number(query.page ?? 1);
  let limit = Number(query.limit ?? 20);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// ------------------ Routes ------------------ //

/**
 * POST /projects – create new project
 */
router.post("/projects", requireAuth, async (req, res, next) => {
  try {
    const { name, description = null, status = "active" } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });

    const { rows } = await pool.query(
      `INSERT INTO projects (owner_id, name, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, owner_id, name, description, status, created_at, updated_at`,
      [req.user.id, name.trim(), description, status]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects – list my projects (paginated + filters)
 */
router.get("/projects", requireAuth, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { q, status, sort = "created_at", order = "desc" } = req.query;

    const sortCols = { created_at: "created_at", updated_at: "updated_at", name: "name", status: "status" };
    const sortCol = sortCols[sort] ?? "created_at";
    const sortOrder = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

    const values = [req.user.id];
    const where = [`owner_id = $1`];

    if (q?.trim()) {
      values.push(`%${q.trim()}%`);
      where.push(`(LOWER(name) LIKE LOWER($${values.length}) OR LOWER(COALESCE(description,'')) LIKE LOWER($${values.length}))`);
    }

    if (status?.trim()) {
      values.push(status.trim());
      where.push(`status = $${values.length}`);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM projects ${whereSQL}`,
      values
    );
    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const safeOffset = (safePage - 1) * limit;

    const dataValues = [...values, limit, safeOffset];

    const { rows: items } = await pool.query(
      `SELECT id, owner_id, name, description, status, created_at, updated_at
       FROM projects
       ${whereSQL}
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
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
 * GET /projects/:projectId – project details
 */
router.get("/projects/:projectId", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, owner_id, name, description, status, created_at, updated_at
       FROM projects
       WHERE id = $1 AND owner_id = $2`,
      [projectId, req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Project not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /projects/:projectId – update project
 */
router.patch("/projects/:projectId", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, status } = req.body || {};

    const sets = [];
    const values = [];
    let idx = 1;

    if (typeof name === "string") {
      sets.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (typeof description === "string" || description === null) {
      sets.push(`description = $${idx++}`);
      values.push(description);
    }
    if (typeof status === "string") {
      sets.push(`status = $${idx++}`);
      values.push(status.trim());
    }

    if (sets.length === 0) return res.status(400).json({ error: "No valid fields to update" });

    values.push(projectId, req.user.id);

    const { rows } = await pool.query(
      `UPDATE projects
       SET ${sets.join(", ")}
       WHERE id = $${idx++} AND owner_id = $${idx}
       RETURNING id, owner_id, name, description, status, created_at, updated_at`,
      values
    );

    if (rows.length === 0) return res.status(404).json({ error: "Project not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /projects/:projectId – delete project
 */
router.delete("/projects/:projectId", requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `DELETE FROM projects WHERE id = $1 AND owner_id = $2`,
      [projectId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Project not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
