const db = require('../config/db');

exports.getAllStations = async (req, res) => {
  try {
    const { city, search, connectorType, minPower, status } = req.query;

    let query = `
      SELECT s.*,
        COALESCE(AVG(r.rating), 4.8) as avg_rating,
        COUNT(DISTINCT r.id) as review_count,
        (
          SELECT COUNT(*) 
          FROM slots sl 
          WHERE sl.station_id = s.id 
            AND sl.date = date('now') 
            AND sl.status = 'available'
        ) as today_available_slots
      FROM stations s
      LEFT JOIN reviews r ON r.station_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (city && city !== 'All') {
      query += ` AND LOWER(s.city) = LOWER(?)`;
      params.push(city);
    }

    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    } else {
      query += ` AND s.status != 'inactive'`;
    }

    if (connectorType && connectorType !== 'All') {
      query += ` AND s.connector_types LIKE ?`;
      params.push(`%${connectorType}%`);
    }

    if (minPower) {
      query += ` AND s.power_kw >= ?`;
      params.push(Number(minPower));
    }

    if (search) {
      query += ` AND (LOWER(s.name) LIKE LOWER(?) OR LOWER(s.address) LIKE LOWER(?) OR LOWER(s.city) LIKE LOWER(?))`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY s.id ORDER BY s.id ASC`;

    const stations = db.prepare(query).all(...params);

    const formatted = stations.map(st => ({
      ...st,
      connector_types: st.connector_types ? st.connector_types.split(',').map(s => s.trim()) : [],
      amenities: st.amenities ? st.amenities.split(',').map(s => s.trim()) : [],
      avg_rating: Number(Number(st.avg_rating).toFixed(1))
    }));

    return res.json({
      success: true,
      count: formatted.length,
      stations: formatted
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stations.' });
  }
};

exports.getStationById = async (req, res) => {
  try {
    const { id } = req.params;

    const station = db.prepare(`
      SELECT s.*,
        COALESCE(AVG(r.rating), 4.8) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM stations s
      LEFT JOIN reviews r ON r.station_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(id);

    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found.' });
    }

    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.station_id = ?
      ORDER BY r.created_at DESC
    `).all(id);

    const formatted = {
      ...station,
      connector_types: station.connector_types ? station.connector_types.split(',').map(s => s.trim()) : [],
      amenities: station.amenities ? station.amenities.split(',').map(s => s.trim()) : [],
      avg_rating: Number(Number(station.avg_rating).toFixed(1)),
      reviews
    };

    return res.json({
      success: true,
      station: formatted
    });
  } catch (error) {
    console.error('Error fetching station details:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve station.' });
  }
};

exports.createStation = async (req, res) => {
  try {
    const {
      name, address, city, state, latitude, longitude,
      connector_types, power_kw, price_per_kwh, total_slots,
      amenities, image_url, status
    } = req.body;

    if (!name || !address || !city || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Name, address, city, and coordinates are required.' });
    }

    const connectorsStr = Array.isArray(connector_types) ? connector_types.join(',') : (connector_types || 'CCS2,Type 2');
    const amenitiesStr = Array.isArray(amenities) ? amenities.join(',') : (amenities || 'WiFi,Restroom');
    const slotsCount = total_slots ? parseInt(total_slots) : 4;

    const insert = db.prepare(`
      INSERT INTO stations (
        name, address, city, state, latitude, longitude,
        connector_types, power_kw, price_per_kwh, total_slots,
        amenities, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name, address, city, state || 'India',
      parseFloat(latitude), parseFloat(longitude),
      connectorsStr, parseFloat(power_kw || 60), parseFloat(price_per_kwh || 16.0),
      slotsCount, amenitiesStr, image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
      status || 'active'
    );

    const stationId = result.lastInsertRowid;

    // Generate slots for next 5 days
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
      INSERT INTO slots (station_id, slot_number, date, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, 'available')
    `);

    const generateSlotsTx = db.transaction(() => {
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        for (let slotNum = 1; slotNum <= slotsCount; slotNum++) {
          for (const tw of timeWindows) {
            insertSlot.run(stationId, slotNum, dateStr, tw.start, tw.end);
          }
        }
      }
    });

    generateSlotsTx();

    const created = db.prepare('SELECT * FROM stations WHERE id = ?').get(stationId);

    return res.status(201).json({
      success: true,
      message: 'Station created and slots initialized.',
      station: {
        ...created,
        connector_types: created.connector_types.split(','),
        amenities: created.amenities.split(',')
      }
    });
  } catch (error) {
    console.error('Error creating station:', error);
    return res.status(500).json({ success: false, message: 'Failed to create station.' });
  }
};

exports.updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, address, city, state, latitude, longitude,
      connector_types, power_kw, price_per_kwh, total_slots,
      amenities, image_url, status
    } = req.body;

    const existing = db.prepare('SELECT * FROM stations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Station not found.' });
    }

    const connectorsStr = Array.isArray(connector_types) ? connector_types.join(',') : connector_types;
    const amenitiesStr = Array.isArray(amenities) ? amenities.join(',') : amenities;

    db.prepare(`
      UPDATE stations
      SET name = COALESCE(?, name),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          connector_types = COALESCE(?, connector_types),
          power_kw = COALESCE(?, power_kw),
          price_per_kwh = COALESCE(?, price_per_kwh),
          total_slots = COALESCE(?, total_slots),
          amenities = COALESCE(?, amenities),
          image_url = COALESCE(?, image_url),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name, address, city, state,
      latitude !== undefined ? parseFloat(latitude) : null,
      longitude !== undefined ? parseFloat(longitude) : null,
      connectorsStr,
      power_kw !== undefined ? parseFloat(power_kw) : null,
      price_per_kwh !== undefined ? parseFloat(price_per_kwh) : null,
      total_slots !== undefined ? parseInt(total_slots) : null,
      amenitiesStr, image_url, status,
      id
    );

    const updated = db.prepare('SELECT * FROM stations WHERE id = ?').get(id);

    return res.json({
      success: true,
      message: 'Station updated successfully.',
      station: {
        ...updated,
        connector_types: updated.connector_types ? updated.connector_types.split(',') : [],
        amenities: updated.amenities ? updated.amenities.split(',') : []
      }
    });
  } catch (error) {
    console.error('Error updating station:', error);
    return res.status(500).json({ success: false, message: 'Failed to update station.' });
  }
};

exports.deleteStation = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM stations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Station not found.' });
    }

    db.prepare('DELETE FROM stations WHERE id = ?').run(id);

    return res.json({
      success: true,
      message: 'Station deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting station:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete station.' });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars.' });
    }

    const insert = db.prepare(`
      INSERT INTO reviews (station_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `);

    insert.run(id, userId, parseInt(rating), comment || '');

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.'
    });
  } catch (error) {
    console.error('Error adding review:', error);
    return res.status(500).json({ success: false, message: 'Failed to add review.' });
  }
};
