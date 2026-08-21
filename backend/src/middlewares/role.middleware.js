/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks whether the authenticated user (from authMiddleware / req.user)
 * has one of the allowed roles.
 *
 * @param  {...string} allowedRoles Roles allowed to access the route
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
    }

    const userRole = (req.user.role || '').toLowerCase().trim();

    const isAuthorized = allowedRoles.some((allowed) => {
      const normalizedAllowed = (allowed || '').toLowerCase().trim();
      if (normalizedAllowed === 'admin') {
        return userRole === 'admin' || userRole === 'school admin';
      }
      return userRole === normalizedAllowed;
    });

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
        data: null,
      });
    }

    next();
  };
}

module.exports = authorizeRoles;
