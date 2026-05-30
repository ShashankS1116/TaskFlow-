const prisma = require('../utils/prisma');
const { sendSuccess } = require('../utils/response');

/**
 * GET /api/dashboard — Aggregated stats for authenticated user
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const now = new Date();

    // Scope filters
    const taskFilter = isAdmin
      ? {}
      : { project: { members: { some: { userId } } } };

    const projectFilter = isAdmin
      ? {}
      : { members: { some: { userId } } };

    const [
      totalProjects,
      totalTasks,
      tasksByStatus,
      overdueTasks,
      myTasks,
      recentTasks,
      upcomingDeadlines,
      teamActivity,
    ] = await Promise.all([
      // Total projects
      prisma.project.count({ where: { ...projectFilter, isArchived: false } }),

      // Total tasks
      prisma.task.count({ where: taskFilter }),

      // Tasks grouped by status
      prisma.task.groupBy({
        by: ['status'],
        where: taskFilter,
        _count: { status: true },
      }),

      // Overdue tasks
      prisma.task.count({
        where: {
          ...taskFilter,
          dueDate: { lt: now },
          status: { not: 'DONE' },
        },
      }),

      // My assigned tasks
      prisma.task.findMany({
        where: { assigneeId: userId, status: { not: 'DONE' } },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 10,
      }),

      // Recently updated tasks
      prisma.task.findMany({
        where: taskFilter,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          updatedAt: true,
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),

      // Projects with upcoming deadlines (next 14 days)
      prisma.project.findMany({
        where: {
          ...projectFilter,
          isArchived: false,
          deadline: {
            gte: now,
            lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          name: true,
          color: true,
          deadline: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),

      // Team task completion this week (admin)
      isAdmin
        ? prisma.task.findMany({
            where: {
              completedAt: {
                gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
              },
              status: 'DONE',
            },
            select: {
              completedAt: true,
              assignee: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Build status map
    const statusMap = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    tasksByStatus.forEach(({ status, _count }) => {
      statusMap[status] = _count.status;
    });

    // Completion rate
    const completionRate = totalTasks > 0
      ? Math.round((statusMap.DONE / totalTasks) * 100)
      : 0;

    // Weekly completions by day (for chart)
    const weeklyCompletions = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(day.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      return {
        date: day.toISOString().split('T')[0],
        count: teamActivity.filter((t) => {
          const completed = new Date(t.completedAt);
          return completed >= day && completed < nextDay;
        }).length,
      };
    });

    return sendSuccess(res, {
      summary: {
        totalProjects,
        totalTasks,
        overdueTasks,
        completionRate,
        tasksByStatus: statusMap,
      },
      myTasks,
      recentTasks,
      upcomingDeadlines,
      weeklyCompletions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/project/:projectId — Per-project stats
 */
async function getProjectStats(req, res, next) {
  try {
    const { projectId } = req.params;

    const [project, tasksByStatus, tasksByPriority, tasksByAssignee, overdueCount] =
      await Promise.all([
        prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, name: true, color: true, deadline: true },
        }),

        prisma.task.groupBy({
          by: ['status'],
          where: { projectId },
          _count: { status: true },
        }),

        prisma.task.groupBy({
          by: ['priority'],
          where: { projectId },
          _count: { priority: true },
        }),

        prisma.task.groupBy({
          by: ['assigneeId'],
          where: { projectId, assigneeId: { not: null } },
          _count: { assigneeId: true },
        }),

        prisma.task.count({
          where: {
            projectId,
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
        }),
      ]);

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Resolve assignee names
    const assigneeIds = tasksByAssignee.map((t) => t.assigneeId).filter(Boolean);
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, avatar: true },
    });

    const assigneeMap = Object.fromEntries(assignees.map((u) => [u.id, u]));
    const tasksByAssigneeNamed = tasksByAssignee.map((t) => ({
      assignee: assigneeMap[t.assigneeId],
      count: t._count.assigneeId,
    }));

    return sendSuccess(res, {
      project,
      tasksByStatus: Object.fromEntries(tasksByStatus.map((t) => [t.status, t._count.status])),
      tasksByPriority: Object.fromEntries(tasksByPriority.map((t) => [t.priority, t._count.priority])),
      tasksByAssignee: tasksByAssigneeNamed,
      overdueCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard, getProjectStats };
