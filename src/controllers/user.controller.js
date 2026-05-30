const prisma = require('../utils/prisma');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * GET /api/users — List all users (Admin only)
 */
async function listUsers(req, res, next) {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          _count: { select: { assignedTasks: true, ownedProjects: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return sendSuccess(res, {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id
 */
async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            assignedTasks: true,
            ownedProjects: true,
          },
        },
      },
    });

    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/:id — Update own profile or admin updates any
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;

    // Only self or admin can update
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return sendError(res, 'Forbidden', 403);
    }

    const { name, avatar } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Only global admin can change roles
    if (req.body.role && req.user.role === 'ADMIN') {
      updateData.role = req.body.role;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, avatar: true },
    });

    return sendSuccess(res, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id (Admin only)
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return sendError(res, 'Cannot delete your own account', 400);
    }

    await prisma.user.delete({ where: { id } });
    return sendSuccess(res, {}, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = { listUsers, getUser, updateUser, deleteUser };
