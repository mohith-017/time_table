// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Authentication middleware
 * Checks for JWT token in cookies or Authorization header.
 * Adds req.user = { id, role } if valid.
 */
export function auth(req, res, next) {
  try {
    // Get token from cookie or header
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Attach user to request
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
