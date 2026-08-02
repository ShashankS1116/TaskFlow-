const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');
const { sendError } = require('../utils/response');

/**
 * Verify JWT and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired', 401);
    }
    next(error);
  }
}

/**
 * Require global ADMIN role
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return sendError(res, 'Admin access required', 403);
  }
  next();
}

/**
 * Require project membership (any role)
 */
async function requireProjectMember(req, res, next) {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    if (!projectId) return next();

    // Admins bypass membership check
    if (req.user.role === 'ADMIN') {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return sendError(res, 'Project not found', 404);
      req.project = project;
      return next();
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
      include: { project: true },
    });

    if (!membership) {
      return sendError(res, 'You are not a member of this project', 403);
    }

    req.project = membership.project;
    req.projectRole = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require project ADMIN role
 */
async function requireProjectAdmin(req, res, next) {
  try {
    const projectId = req.params.projectId || req.body.projectId;

    // Global admins pass
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return sendError(res, 'Project admin access required', 403);
    }

    req.projectRole = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate, requireAdmin, requireProjectMember, requireProjectAdmin };
