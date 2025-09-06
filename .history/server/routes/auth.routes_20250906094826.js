import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool  from "../db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET 
const JWT_EXPIRES_IN = "7d";

// Helper: sign JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ---------------------- REGISTER ----------------------
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Email, password and fullName are required" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at`,
      [email, hashed, fullName]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

// ---------------------- LOGIN ----------------------
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Compare password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user);

    // Return safe fields only
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

// ---------------------- ME (Profile) ----------------------
router.get("/me", async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No token provided" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      "SELECT id, email, full_name, avatar_url, is_active, created_at FROM users WHERE id=$1",
      [decoded.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------- CHANGE PASSWORD ----------------------
router.patch("/password", async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No token provided" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword required" });
    }

    // Fetch user
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [decoded.id]);
    const user = result.rows[0];

    // Validate old password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Current password incorrect" });

    // Save new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hashed, decoded.id]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
