// routes/users.routes.js
import { Router } from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/**
 * Helper: parse and clamp pagination safely
 */
function parsePagination(query) {
  let page = Number(query.page ?? 1);
  let limit = Number(query.limit ?? 20);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100; // cap to prevent huge scans

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Helper: quick UUID v4-ish check (enough to reject obvious bad input)
 */
function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(str || "")
  );
}

/**
 * GET /users
 * Search users by name/email, paginated.
 * Requires auth so we don’t expose directory to the internet.
 * Query: q?, page?, limit?
 */
router.get("/", authRequired, async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const needle = String(q).trim();
    const { page, limit, offset } = parsePagination(req.query);

    // If no query, still list (useful for pickers). You can require q if you prefer.
    const like = `%${needle}%`;

    const list = await pool.query(
      `
        SELECT id, full_name, email, avatar_url
        FROM users
        WHERE ($1 = '' OR full_name ILIKE $2 OR email ILIKE $2)
        ORDER BY full_name ASC
        LIMIT $3 OFFSET $4
      `,
      [needle, like, limit, offset]
    );

    const totalRes = await pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE ($1 = '' OR full_name ILIKE $2 OR email ILIKE $2)
      `,
      [needle, like]
    );

    const total = totalRes.rows[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      items: list.rows,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /users/:id
 * Fetch a public user profile by id
 */
router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const result = await pool.query(
      `
        SELECT id, full_name, email, avatar_url, is_active, created_at
        FROM users
        WHERE id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
