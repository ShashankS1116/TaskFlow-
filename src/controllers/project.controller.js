const prisma = require('../utils/prisma');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  color: true,
  isArchived: true,
  deadline: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, email: true, avatar: true } },
  members: {
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
  _count: { select: { tasks: true, members: true } },
};

/**
 * GET /api/projects
 */
async function listProjects(req, res, next) {
  try {
    const { search, archived, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Admins see all; members only see their own
    const where = { isArchived: archived === 'true' };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (req.user.role !== 'ADMIN') {
      where.members = { some: { userId: req.user.id } };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: PROJECT_SELECT,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    return sendSuccess(res, {
      projects,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects
 */
async function createProject(req, res, next) {
  try {
    const { name, description, color, deadline } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        color: color || '#6366f1',
        deadline: deadline ? new Date(deadline) : null,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'ADMIN' },
        },
      },
      select: PROJECT_SELECT,
    });

    return sendCreated(res, { project }, 'Project created successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:projectId
 */
async function getProject(req, res, next) {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ...PROJECT_SELECT,
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            tags: true,
            assignee: { select: { id: true, name: true, avatar: true } },
            creator: { select: { id: true, name: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) return sendError(res, 'Project not found', 404);

    // Membership check for non-admins
    if (req.user.role !== 'ADMIN') {
      const isMember = project.members.some((m) => m.user.id === req.user.id);
      if (!isMember) return sendError(res, 'Access denied', 403);
    }

    return sendSuccess(res, { project });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/projects/:projectId
 */
async function updateProject(req, res, next) {
  try {
    const { projectId } = req.params;
    const { name, description, color, deadline, isArchived } = req.body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(isArchived !== undefined && { isArchived }),
      },
      select: PROJECT_SELECT,
    });

    return sendSuccess(res, { project }, 'Project updated');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:projectId
 */
async function deleteProject(req, res, next) {
  try {
    const { projectId } = req.params;
    await prisma.project.delete({ where: { id: projectId } });
    return sendSuccess(res, {}, 'Project deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects/:projectId/members
 */
async function addMember(req, res, next) {
  try {
    const { projectId } = req.params;
    const { userId, role = 'MEMBER' } = req.body;

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 'User not found', 404);

    // Check not already a member
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) return sendError(res, 'User is already a member', 409);

    const member = await prisma.projectMember.create({
      data: { projectId, userId, role },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return sendCreated(res, { member }, 'Member added successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/projects/:projectId/members/:userId
 */
async function updateMemberRole(req, res, next) {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(res, { member }, 'Member role updated');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:projectId/members/:userId
 */
async function removeMember(req, res, next) {
  try {
    const { projectId, userId } = req.params;

    // Prevent removing the owner
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project.ownerId === userId) {
      return sendError(res, 'Cannot remove the project owner', 400);
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    return sendSuccess(res, {}, 'Member removed');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
};
