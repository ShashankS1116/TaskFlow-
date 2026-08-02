const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, requireProjectAdmin } = require('../middleware/auth.middleware');
const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
} = require('../controllers/project.controller');

const router = Router();

router.use(authenticate);

// ─── Projects ───────────────────────────────────────────────────────────────
router.get('/', listProjects);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Project name required (max 100 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
    body('deadline').optional().isISO8601().withMessage('Invalid date format'),
    validate,
  ],
  createProject
);

router.get('/:projectId', getProject);

router.patch(
  '/:projectId',
  requireProjectAdmin,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('deadline').optional({ nullable: true }).isISO8601(),
    body('isArchived').optional().isBoolean(),
    validate,
  ],
  updateProject
);

router.delete('/:projectId', requireProjectAdmin, deleteProject);

// ─── Members ─────────────────────────────────────────────────────────────────
router.post(
  '/:projectId/members',
  requireProjectAdmin,
  [
    body('userId').notEmpty().withMessage('userId required'),
    body('role').optional().isIn(['ADMIN', 'MEMBER']),
    validate,
  ],
  addMember
);

router.patch(
  '/:projectId/members/:userId',
  requireProjectAdmin,
  [body('role').isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER'), validate],
  updateMemberRole
);

router.delete('/:projectId/members/:userId', requireProjectAdmin, removeMember);

module.exports = router;
