const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

// All admin routes require token + admin role
router.use(authenticateToken, requireAdmin);

router.get('/metrics', adminController.getDashboardMetrics);
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);

module.exports = router;
