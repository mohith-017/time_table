// server/src/middleware/roles.js

/**
 * Authorization middleware
 * Usage: router.use(auth, requireRole('ADMIN'))
 *        router.use(auth, requireRole('ADMIN','TEACHER'))
 */
export function requireRole(...roles) {
  const allowed = Array.isArray(roles[0]) ? roles[0] : roles;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Backward-compatible alias so files importing { authorize } still work
export const authorize = requireRole;
