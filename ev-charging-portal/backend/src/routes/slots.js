const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

// Get slots for station & date (Public/Auth)
router.get('/station/:stationId', slotController.getSlotsByStationAndDate);

// Admin slot status update (e.g. set maintenance or manual release)
router.put('/:slotId/status', authenticateToken, requireAdmin, slotController.updateSlotStatus);

module.exports = router;
