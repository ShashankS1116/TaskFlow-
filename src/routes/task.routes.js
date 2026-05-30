const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  updateComment,
  deleteComment,
} = require('../controllers/task.controller');

const router = Router();

router.use(authenticate);

// ─── Tasks ──────────────────────────────────────────────────────────────────
router.get('/', listTasks);

router.post(
  '/',
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Task title required (max 200 chars)'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
    body('projectId').notEmpty().withMessage('projectId required'),
    body('assigneeId').optional({ nullable: true }).isString(),
    body('tags').optional().isArray(),
    validate,
  ],
  createTask
);

router.get('/:taskId', getTask);

router.patch(
  '/:taskId',
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('tags').optional().isArray(),
    validate,
  ],
  updateTask
);

router.delete('/:taskId', deleteTask);

// ─── Comments ────────────────────────────────────────────────────────────────
router.post(
  '/:taskId/comments',
  [
    body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment content required (max 1000 chars)'),
    validate,
  ],
  addComment
);

router.patch(
  '/:taskId/comments/:commentId',
  [
    body('content').trim().isLength({ min: 1, max: 1000 }),
    validate,
  ],
  updateComment
);

router.delete('/:taskId/comments/:commentId', deleteComment);

module.exports = router;
