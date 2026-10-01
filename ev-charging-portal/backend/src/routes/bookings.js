const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

// Authenticated User routes
router.post('/', authenticateToken, bookingController.createBooking);
router.get('/my', authenticateToken, bookingController.getUserBookings);
router.get('/:id', authenticateToken, bookingController.getBookingById);
router.put('/:id/cancel', authenticateToken, bookingController.cancelBooking);

// Admin-only view all bookings
router.get('/admin/all', authenticateToken, requireAdmin, bookingController.getAllBookings);

module.exports = router;
