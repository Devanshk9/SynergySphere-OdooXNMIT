// middleware/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET; 

/**
 * authRequired:
 * - Expects Authorization: Bearer <token>
 * - Attaches req.user = { id, email, fullName }
 */
export function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const [scheme, token] = auth.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized: Bearer token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, fullName }
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
}
