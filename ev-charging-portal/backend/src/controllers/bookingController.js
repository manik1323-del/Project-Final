const db = require('../config/db');

exports.createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      station_id,
      slot_id,
      vehicle_number,
      connector_type,
      estimated_kwh,
      payment_method,
      payment_id
    } = req.body;

    if (!station_id || !slot_id || !connector_type) {
      return res.status(400).json({
        success: false,
        message: 'Station ID, Slot ID, and Connector Type are required.'
      });
    }

    const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(station_id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found.' });
    }

    const estKwh = estimated_kwh ? parseFloat(estimated_kwh) : 25.0;
    const ratePerKwh = station.price_per_kwh || 16.0;
    const totalAmount = parseFloat((estKwh * ratePerKwh).toFixed(2));
    const bookingRef = 'VP-BK-' + Math.floor(100000 + Math.random() * 900000);
    const txId = payment_id || ('pay_test_' + Math.random().toString(36).substring(2, 12));
    const vehNo = vehicle_number || req.user.vehicle_number || 'DL-EV-2026';

    // ATOMIC TRANSACTION to strictly prevent double-booking race condition
    let newBookingId;
    let slotDetails;

    const reserveBookingTx = db.transaction(() => {
      // Check slot with immediate lock
      const slot = db.prepare('SELECT * FROM slots WHERE id = ? AND station_id = ?').get(slot_id, station_id);

      if (!slot) {
        throw new Error('SLOT_NOT_FOUND');
      }

      if (slot.status !== 'available') {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      // Mark slot as booked
      db.prepare("UPDATE slots SET status = 'booked' WHERE id = ?").run(slot_id);

      const qrPayload = JSON.stringify({
        bookingRef,
        userId,
        userName: req.user.name,
        stationName: station.name,
        slotNumber: slot.slot_number,
        date: slot.date,
        time: `${slot.start_time} - ${slot.end_time}`,
        connector: connector_type,
        amount: totalAmount
      });

      // Insert booking
      const bRes = db.prepare(`
        INSERT INTO bookings (
          booking_ref, user_id, station_id, slot_id, vehicle_number, connector_type,
          date, start_time, end_time, estimated_kwh, total_amount, payment_status,
          payment_id, payment_method, booking_status, qr_code_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookingRef, userId, station_id, slot_id, vehNo, connector_type,
        slot.date, slot.start_time, slot.end_time, estKwh, totalAmount, 'paid',
        txId, payment_method || 'Card / Simulated Gateway', 'confirmed', qrPayload
      );

      newBookingId = bRes.lastInsertRowid;
      slotDetails = slot;

      // Insert payment record
      db.prepare(`
        INSERT INTO payments (booking_id, user_id, amount, currency, provider, transaction_id, status, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newBookingId, userId, totalAmount, 'INR', 'Razorpay', txId, 'success',
        JSON.stringify({ method: payment_method || 'Online Card', reference: txId })
      );
    });

    try {
      reserveBookingTx();
    } catch (txError) {
      if (txError.message === 'SLOT_ALREADY_BOOKED') {
        return res.status(409).json({
          success: false,
          message: 'This charging slot is no longer available. Please select an alternate slot.'
        });
      }
      if (txError.message === 'SLOT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Requested slot does not exist.'
        });
      }
      throw txError;
    }

    const booking = db.prepare(`
      SELECT b.*, s.name as station_name, s.address as station_address, s.city as station_city, s.power_kw
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      WHERE b.id = ?
    `).get(newBookingId);

    return res.status(201).json({
      success: true,
      message: 'Charging slot reserved and paid successfully!',
      booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete booking reservation.' });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT b.*, 
        s.name as station_name, 
        s.address as station_address, 
        s.city as station_city,
        s.power_kw,
        s.image_url as station_image,
        sl.slot_number
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN slots sl ON sl.id = b.slot_id
      WHERE b.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ` AND b.booking_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY b.date DESC, b.start_time DESC`;

    const bookings = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT b.*, 
        s.name as station_name, 
        s.address as station_address, 
        s.city as station_city,
        s.power_kw,
        s.price_per_kwh,
        sl.slot_number,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN slots sl ON sl.id = b.slot_id
      JOIN users u ON u.id = b.user_id
      WHERE b.id = ?
    `;
    const params = [id];

    if (!isAdmin) {
      query += ` AND b.user_id = ?`;
      params.push(userId);
    }

    const booking = db.prepare(query).get(...params);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve booking pass.' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (!isAdmin && booking.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this booking.' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    // Atomic cancellation & slot release
    const cancelTx = db.transaction(() => {
      db.prepare("UPDATE bookings SET booking_status = 'cancelled', payment_status = 'refunded' WHERE id = ?").run(id);
      db.prepare("UPDATE slots SET status = 'available' WHERE id = ?").run(booking.slot_id);
      db.prepare("UPDATE payments SET status = 'refunded' WHERE booking_id = ?").run(id);
    });

    cancelTx();

    return res.json({
      success: true,
      message: 'Booking cancelled successfully. Refund initiated.'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const { status, date } = req.query;

    let query = `
      SELECT b.*, 
        s.name as station_name, 
        s.city as station_city,
        sl.slot_number,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN slots sl ON sl.id = b.slot_id
      JOIN users u ON u.id = b.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND b.booking_status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND b.date = ?`;
      params.push(date);
    }

    query += ` ORDER BY b.created_at DESC`;

    const bookings = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
  }
};
