const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { getDashboard, getProjectStats } = require('../controllers/dashboard.controller');

const router = Router();

router.use(authenticate);

router.get('/', getDashboard);
router.get('/project/:projectId', getProjectStats);

module.exports = router;
