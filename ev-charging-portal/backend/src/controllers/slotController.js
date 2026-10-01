const db = require('../config/db');

exports.getSlotsByStationAndDate = async (req, res) => {
  try {
    const { stationId } = req.params;
    let { date } = req.query;

    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    const station = db.prepare('SELECT id, name, total_slots, price_per_kwh, power_kw FROM stations WHERE id = ?').get(stationId);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found.' });
    }

    let slots = db.prepare(`
      SELECT s.*, 
        b.booking_ref, 
        b.vehicle_number,
        u.name as booked_by_name
      FROM slots s
      LEFT JOIN bookings b ON b.slot_id = s.id AND b.booking_status = 'confirmed'
      LEFT JOIN users u ON u.id = b.user_id
      WHERE s.station_id = ? AND s.date = ?
      ORDER BY s.slot_number ASC, s.start_time ASC
    `).all(stationId, date);

    // If no slots exist for this date yet, dynamically generate them on the fly
    if (slots.length === 0) {
      const timeWindows = [
        { start: '06:00', end: '07:00' },
        { start: '07:00', end: '08:00' },
        { start: '08:00', end: '09:00' },
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' },
        { start: '12:00', end: '13:00' },
        { start: '13:00', end: '14:00' },
        { start: '14:00', end: '15:00' },
        { start: '15:00', end: '16:00' },
        { start: '16:00', end: '17:00' },
        { start: '17:00', end: '18:00' },
        { start: '18:00', end: '19:00' },
        { start: '19:00', end: '20:00' },
        { start: '20:00', end: '21:00' },
        { start: '21:00', end: '22:00' }
      ];

      const insertSlot = db.prepare(`
        INSERT OR IGNORE INTO slots (station_id, slot_number, date, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, 'available')
      `);

      const genTx = db.transaction(() => {
        for (let slotNum = 1; slotNum <= station.total_slots; slotNum++) {
          for (const tw of timeWindows) {
            insertSlot.run(stationId, slotNum, date, tw.start, tw.end);
          }
        }
      });
      genTx();

      slots = db.prepare(`
        SELECT * FROM slots 
        WHERE station_id = ? AND date = ?
        ORDER BY slot_number ASC, start_time ASC
      `).all(stationId, date);
    }

    const availableCount = slots.filter(s => s.status === 'available').length;
    const bookedCount = slots.filter(s => s.status === 'booked').length;
    const maintenanceCount = slots.filter(s => s.status === 'maintenance').length;

    return res.json({
      success: true,
      station,
      date,
      summary: {
        total: slots.length,
        available: availableCount,
        booked: bookedCount,
        maintenance: maintenanceCount
      },
      slots
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve slots.' });
  }
};

exports.updateSlotStatus = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { status } = req.body;

    if (!['available', 'booked', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid slot status value.' });
    }

    const existing = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    db.prepare('UPDATE slots SET status = ? WHERE id = ?').run(status, slotId);

    const updated = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId);

    return res.json({
      success: true,
      message: 'Slot status updated successfully.',
      slot: updated
    });
  } catch (error) {
    console.error('Error updating slot:', error);
    return res.status(500).json({ success: false, message: 'Failed to update slot.' });
  }
};
