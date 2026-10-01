const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

// Public routes
router.get('/', stationController.getAllStations);
router.get('/:id', stationController.getStationById);

// Authenticated user routes
router.post('/:id/reviews', authenticateToken, stationController.addReview);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, stationController.createStation);
router.put('/:id', authenticateToken, requireAdmin, stationController.updateStation);
router.delete('/:id', authenticateToken, requireAdmin, stationController.deleteStation);

module.exports = router;
