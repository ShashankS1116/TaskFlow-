const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { listUsers, getUser, updateUser, deleteUser } = require('../controllers/user.controller');

const router = Router();

router.use(authenticate);

router.get('/', requireAdmin, listUsers);
router.get('/:id', getUser);
router.patch(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
    body('role').optional().isIn(['ADMIN', 'MEMBER']),
    validate,
  ],
  updateUser
);
router.delete('/:id', requireAdmin, deleteUser);

module.exports = router;
