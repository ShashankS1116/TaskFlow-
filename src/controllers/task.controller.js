const prisma = require('../utils/prisma');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true, color: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  creator: { select: { id: true, name: true, avatar: true } },
  _count: { select: { comments: true } },
};

/**
 * GET /api/tasks — Query tasks across projects
 */
async function listTasks(req, res, next) {
  try {
    const {
      projectId,
      status,
      priority,
      assigneeId,
      overdue,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    // Scope to accessible projects for members
    if (req.user.role !== 'ADMIN') {
      where.project = { members: { some: { userId: req.user.id } } };
    }

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'DONE' };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: TASK_SELECT,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.task.count({ where }),
    ]);

    return sendSuccess(res, {
      tasks,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tasks
 */
async function createTask(req, res, next) {
  try {
    const { title, description, status, priority, dueDate, assigneeId, projectId, tags } = req.body;

    // Verify project membership
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });
    if (!membership && req.user.role !== 'ADMIN') {
      return sendError(res, 'You are not a member of this project', 403);
    }

    // If assigning, verify assignee is a project member
    if (assigneeId) {
      const assigneeMembership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeId } },
      });
      if (!assigneeMembership && req.user.role !== 'ADMIN') {
        return sendError(res, 'Assignee is not a member of this project', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags || [],
        projectId,
        assigneeId: assigneeId || null,
        creatorId: req.user.id,
      },
      select: TASK_SELECT,
    });

    return sendCreated(res, { task }, 'Task created successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tasks/:taskId
 */
async function getTask(req, res, next) {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        ...TASK_SELECT,
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            author: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) return sendError(res, 'Task not found', 404);

    // Membership check
    if (req.user.role !== 'ADMIN') {
      const isMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.project.id, userId: req.user.id } },
      });
      if (!isMember) return sendError(res, 'Access denied', 403);
    }

    return sendSuccess(res, { task });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tasks/:taskId
 */
async function updateTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, dueDate, assigneeId, tags } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) return sendError(res, 'Task not found', 404);

    // Mark completedAt when transitioning to DONE
    let completedAt = existingTask.completedAt;
    if (status === 'DONE' && existingTask.status !== 'DONE') {
      completedAt = new Date();
    } else if (status && status !== 'DONE') {
      completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(tags && { tags }),
        completedAt,
      },
      select: TASK_SELECT,
    });

    return sendSuccess(res, { task }, 'Task updated');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/tasks/:taskId
 */
async function deleteTask(req, res, next) {
  try {
    const { taskId } = req.params;
    await prisma.task.delete({ where: { id: taskId } });
    return sendSuccess(res, {}, 'Task deleted');
  } catch (error) {
    next(error);
  }
}

// ─── Comments ───────────────────────────────────────────────────────────────

/**
 * POST /api/tasks/:taskId/comments
 */
async function addComment(req, res, next) {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) return sendError(res, 'Task not found', 404);

    // Membership check
    if (req.user.role !== 'ADMIN') {
      const isMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: req.user.id } },
      });
      if (!isMember) return sendError(res, 'Access denied', 403);
    }

    const comment = await prisma.comment.create({
      data: { content, taskId, authorId: req.user.id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    return sendCreated(res, { comment }, 'Comment added');
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tasks/:taskId/comments/:commentId
 */
async function updateComment(req, res, next) {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) return sendError(res, 'Comment not found', 404);

    if (existing.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return sendError(res, 'Can only edit your own comments', 403);
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      select: { id: true, content: true, updatedAt: true },
    });

    return sendSuccess(res, { comment }, 'Comment updated');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/tasks/:taskId/comments/:commentId
 */
async function deleteComment(req, res, next) {
  try {
    const { commentId } = req.params;

    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) return sendError(res, 'Comment not found', 404);

    if (existing.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return sendError(res, 'Can only delete your own comments', 403);
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return sendSuccess(res, {}, 'Comment deleted');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  updateComment,
  deleteComment,
};
