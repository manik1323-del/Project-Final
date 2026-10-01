const db = require('../config/db');

exports.getDashboardMetrics = async (req, res) => {
  try {
    const totalStations = db.prepare("SELECT COUNT(*) as count FROM stations WHERE status != 'inactive'").get().count;
    const totalSlots = db.prepare('SELECT COUNT(*) as count FROM slots').get().count;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
    const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;

    const bookingStats = db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as active_bookings,
        SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN estimated_kwh ELSE 0 END), 0) as total_kwh
      FROM bookings
    `).get();

    // Environmental Impact SDG Calculation
    const totalKwh = bookingStats.total_kwh || 0;
    // Standard EV emission saving: ~0.82 kg CO2 per kWh vs fossil fuels
    const co2SavedKg = Number((totalKwh * 0.82).toFixed(1));
    // 1 mature tree absorbs ~21.77 kg CO2/year
    const treesEquivalent = Math.max(1, Math.round(co2SavedKg / 21.77));
    // 1 kWh powers approx 6.5 - 7 km in average EV
    const greenKmPowered = Math.round(totalKwh * 6.8);

    const stationUtilization = db.prepare(`
      SELECT 
        s.id, s.name, s.city, s.power_kw, s.total_slots,
        COUNT(b.id) as total_sessions,
        COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) as revenue
      FROM stations s
      LEFT JOIN bookings b ON b.station_id = s.id
      GROUP BY s.id
      ORDER BY total_sessions DESC
      LIMIT 5
    `).all();

    const recentBookings = db.prepare(`
      SELECT b.*, s.name as station_name, u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN users u ON u.id = b.user_id
      ORDER BY b.created_at DESC
      LIMIT 8
    `).all();

    return res.json({
      success: true,
      metrics: {
        totalStations,
        totalSlots,
        totalUsers,
        totalAdmins,
        totalBookings: bookingStats.total_bookings,
        activeBookings: bookingStats.active_bookings,
        completedBookings: bookingStats.completed_bookings,
        cancelledBookings: bookingStats.cancelled_bookings,
        totalRevenue: Number(bookingStats.total_revenue.toFixed(2)),
        totalKwh: Number(totalKwh.toFixed(1)),
        sdgImpact: {
          co2SavedKg,
          treesEquivalent,
          greenKmPowered,
          sdg7CleanEnergy: '100% Zero Direct Emissions',
          sdg9Infrastructure: `${totalStations} Connected Charging Hubs`,
          sdg11SustainableCities: `${greenKmPowered.toLocaleString()} Clean Urban Km`
        }
      },
      stationUtilization,
      recentBookings
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin metrics.' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.role, u.phone, u.vehicle_model, u.vehicle_number, u.created_at,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id ASC
    `).all();

    return res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be user or admin.' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    const updated = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id);

    return res.json({
      success: true,
      message: 'User role updated successfully.',
      user: updated
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
};
