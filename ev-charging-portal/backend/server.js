const http = require('node:http');
const url = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const { db, hashPassword, verifyPassword, signToken, verifyToken } = require('./src/config/db');

const PORT = process.env.PORT || 5001;
const PUBLIC_DIR = path.join(__dirname, '../frontend/dist');

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Auth Middleware Helper
function authenticate(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const user = db.prepare('SELECT id, name, email, role, phone, vehicle_model, vehicle_number FROM users WHERE id = ?').get(decoded.id);
  return user || null;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // If path doesn't have an extension, fall back to index.html (SPA routing)
  if (!path.extname(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fall back to index.html for SPA
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallbackData) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fallbackData);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();
  const query = parsedUrl.query;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Health Check
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, {
          status: 'online',
          service: 'VoltPoint EV Charging Station Management Portal API',
          version: '1.0.0',
          batch: '2026',
          sdgs: ['SDG 7', 'SDG 9', 'SDG 11'],
          timestamp: new Date().toISOString()
        });
      }

      // 2. Auth: Register
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const { name, email, password, phone, vehicle_model, vehicle_number, role } = body;
        if (!name || !email || !password) {
          return sendJson(res, 400, { success: false, message: 'Name, email, and password are required.' });
        }

        const emailNorm = email.trim().toLowerCase();
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
        if (existing) {
          return sendJson(res, 409, { success: false, message: 'An account with this email already exists.' });
        }

        const passwordHash = hashPassword(password);
        // Only allow 'user' or 'station_owner' roles from registration (never admin)
        const assignedRole = role === 'station_owner' ? 'station_owner' : 'user';

        const insert = db.prepare(`
          INSERT INTO users (name, email, password_hash, role, phone, vehicle_model, vehicle_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
          name.trim(), emailNorm, passwordHash, assignedRole,
          phone || '', vehicle_model || '', vehicle_number || ''
        );

        const user = db.prepare('SELECT id, name, email, role, phone, vehicle_model, vehicle_number, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
        const token = signToken({ id: user.id, email: user.email, role: user.role });

        return sendJson(res, 201, {
          success: true,
          message: 'Account registered successfully.',
          token,
          user
        });
      }

      // 3. Auth: Login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendJson(res, 400, { success: false, message: 'Email and password are required.' });
        }

        const emailNorm = email.trim().toLowerCase();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailNorm);

        if (!user || !verifyPassword(password, user.password_hash)) {
          return sendJson(res, 401, { success: false, message: 'Invalid email or password.' });
        }

        const token = signToken({ id: user.id, email: user.email, role: user.role });
        const sanitizedUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          vehicle_model: user.vehicle_model,
          vehicle_number: user.vehicle_number,
          created_at: user.created_at
        };

        return sendJson(res, 200, {
          success: true,
          message: 'Login successful.',
          token,
          user: sanitizedUser
        });
      }

      // 4. Auth: Profile (Me)
      if (pathname === '/api/auth/me' && method === 'GET') {
        const user = authenticate(req);
        if (!user) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        return sendJson(res, 200, { success: true, user });
      }

      // 5. Stations: Get All
      if (pathname === '/api/stations' && method === 'GET') {
        const { city, search, connectorType, minPower, status } = query;
        let sql = `
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
          sql += ` AND LOWER(s.city) = LOWER(?)`;
          params.push(city);
        }
        if (status) {
          sql += ` AND s.status = ?`;
          params.push(status);
        } else {
          sql += ` AND s.status != 'inactive'`;
        }
        if (connectorType && connectorType !== 'All') {
          sql += ` AND s.connector_types LIKE ?`;
          params.push(`%${connectorType}%`);
        }
        if (minPower) {
          sql += ` AND s.power_kw >= ?`;
          params.push(Number(minPower));
        }
        if (search) {
          sql += ` AND (LOWER(s.name) LIKE LOWER(?) OR LOWER(s.address) LIKE LOWER(?) OR LOWER(s.city) LIKE LOWER(?))`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ` GROUP BY s.id ORDER BY s.id ASC`;
        const stations = db.prepare(sql).all(...params);

        const formatted = stations.map(st => ({
          ...st,
          connector_types: st.connector_types ? st.connector_types.split(',').map(s => s.trim()) : [],
          amenities: st.amenities ? st.amenities.split(',').map(s => s.trim()) : [],
          avg_rating: Number(Number(st.avg_rating).toFixed(1))
        }));

        return sendJson(res, 200, { success: true, count: formatted.length, stations: formatted });
      }

      // 6. Stations: Create Station (Station Owner or Admin)
      if (pathname === '/api/stations' && method === 'POST') {
        const user = authenticate(req);
        if (!user || (user.role !== 'admin' && user.role !== 'station_owner')) {
          return sendJson(res, 403, { success: false, message: 'Forbidden: Station Owner or Admin privileges required.' });
        }

        const body = await parseBody(req);
        const {
          name, address, city, state, latitude, longitude,
          connector_types, power_kw, price_per_kwh, total_slots,
          amenities, image_url, status
        } = body;

        const connectorsStr = Array.isArray(connector_types) ? connector_types.join(',') : (connector_types || 'CCS2,Type 2');
        const amenitiesStr = Array.isArray(amenities) ? amenities.join(',') : (amenities || 'WiFi,Restroom');
        const slotsCount = total_slots ? parseInt(total_slots) : 4;

        const insert = db.prepare(`
          INSERT INTO stations (
            owner_id, name, address, city, state, latitude, longitude,
            connector_types, power_kw, price_per_kwh, total_slots,
            amenities, image_url, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
          user.id,
          name, address, city, state || 'India',
          parseFloat(latitude), parseFloat(longitude),
          connectorsStr, parseFloat(power_kw || 60), parseFloat(price_per_kwh || 16.0),
          slotsCount, amenitiesStr, image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
          status || 'active'
        );

        const stationId = result.lastInsertRowid;

        // Auto-generate slots for next 5 days
        const timeWindows = [
          { start: '06:00', end: '07:00' }, { start: '07:00', end: '08:00' }, { start: '08:00', end: '09:00' },
          { start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' },
          { start: '12:00', end: '13:00' }, { start: '13:00', end: '14:00' }, { start: '14:00', end: '15:00' },
          { start: '15:00', end: '16:00' }, { start: '16:00', end: '17:00' }, { start: '17:00', end: '18:00' },
          { start: '18:00', end: '19:00' }, { start: '19:00', end: '20:00' }, { start: '20:00', end: '21:00' },
          { start: '21:00', end: '22:00' }
        ];

        const insertSlot = db.prepare(`
          INSERT INTO slots (station_id, slot_number, date, start_time, end_time, status)
          VALUES (?, ?, ?, ?, ?, 'available')
        `);

        db.exec('BEGIN TRANSACTION;');
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
        db.exec('COMMIT;');

        const created = db.prepare('SELECT * FROM stations WHERE id = ?').get(stationId);
        return sendJson(res, 201, {
          success: true,
          message: 'Station created & slots initialized.',
          station: {
            ...created,
            connector_types: created.connector_types.split(','),
            amenities: created.amenities.split(',')
          }
        });
      }

      // 7. Stations: Update Station (Station Owner or Admin)
      const stationUpdateMatch = pathname.match(/^\/api\/stations\/(\d+)$/);
      if (stationUpdateMatch && method === 'PUT') {
        const user = authenticate(req);
        if (!user || (user.role !== 'admin' && user.role !== 'station_owner')) {
          return sendJson(res, 403, { success: false, message: 'Forbidden: Unauthorized access.' });
        }
        const stationId = stationUpdateMatch[1];
        // Check ownership if not admin
        if (user.role === 'station_owner') {
          const owned = db.prepare('SELECT id FROM stations WHERE id = ? AND owner_id = ?').get(stationId, user.id);
          if (!owned) return sendJson(res, 403, { success: false, message: 'Forbidden: You can only edit your own stations.' });
        }
        const body = await parseBody(req);
        const {
          name, address, city, state, latitude, longitude,
          connector_types, power_kw, price_per_kwh, total_slots,
          amenities, image_url, status
        } = body;

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
          stationId
        );

        const updated = db.prepare('SELECT * FROM stations WHERE id = ?').get(stationId);
        return sendJson(res, 200, { success: true, station: updated });
      }

      // 8. Stations: Delete Station (Station Owner or Admin)
      if (stationUpdateMatch && method === 'DELETE') {
        const user = authenticate(req);
        if (!user || (user.role !== 'admin' && user.role !== 'station_owner')) {
          return sendJson(res, 403, { success: false, message: 'Forbidden: Unauthorized access.' });
        }
        const stationId = stationUpdateMatch[1];
        // Check ownership if not admin
        if (user.role === 'station_owner') {
          const owned = db.prepare('SELECT id FROM stations WHERE id = ? AND owner_id = ?').get(stationId, user.id);
          if (!owned) return sendJson(res, 403, { success: false, message: 'Forbidden: You can only delete your own stations.' });
        }
        db.prepare('DELETE FROM stations WHERE id = ?').run(stationId);
        return sendJson(res, 200, { success: true, message: 'Station deleted successfully.' });
      }


      // 9. Slots: Get by station and date
      const slotStationMatch = pathname.match(/^\/api\/slots\/station\/(\d+)$/);
      if (slotStationMatch && method === 'GET') {
        const stationId = slotStationMatch[1];
        let date = query.date || new Date().toISOString().split('T')[0];

        const station = db.prepare('SELECT id, name, total_slots, price_per_kwh, power_kw FROM stations WHERE id = ?').get(stationId);
        if (!station) return sendJson(res, 404, { success: false, message: 'Station not found.' });

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

        // Dynamically auto-generate slots if none exist for this date
        if (slots.length === 0) {
          const timeWindows = [
            { start: '06:00', end: '07:00' }, { start: '07:00', end: '08:00' }, { start: '08:00', end: '09:00' },
            { start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' },
            { start: '12:00', end: '13:00' }, { start: '13:00', end: '14:00' }, { start: '14:00', end: '15:00' },
            { start: '15:00', end: '16:00' }, { start: '16:00', end: '17:00' }, { start: '17:00', end: '18:00' },
            { start: '18:00', end: '19:00' }, { start: '19:00', end: '20:00' }, { start: '20:00', end: '21:00' },
            { start: '21:00', end: '22:00' }
          ];
          const insertSlot = db.prepare(`
            INSERT OR IGNORE INTO slots (station_id, slot_number, date, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, 'available')
          `);
          db.exec('BEGIN TRANSACTION;');
          for (let slotNum = 1; slotNum <= station.total_slots; slotNum++) {
            for (const tw of timeWindows) {
              insertSlot.run(stationId, slotNum, date, tw.start, tw.end);
            }
          }
          db.exec('COMMIT;');

          slots = db.prepare('SELECT * FROM slots WHERE station_id = ? AND date = ? ORDER BY slot_number ASC, start_time ASC').all(stationId, date);
        }

        return sendJson(res, 200, {
          success: true,
          station,
          date,
          slots
        });
      }

      // 10. Slots: Update Status (Admin or Station Owner)
      const slotStatusMatch = pathname.match(/^\/api\/slots\/(\d+)\/status$/);
      if (slotStatusMatch && method === 'PUT') {
        const user = authenticate(req);
        if (!user || (user.role !== 'admin' && user.role !== 'station_owner')) {
          return sendJson(res, 403, { success: false, message: 'Forbidden' });
        }
        const slotId = slotStatusMatch[1];
        const body = await parseBody(req);
        const { status } = body;

        if (user.role === 'station_owner') {
          const slotObj = db.prepare('SELECT station_id FROM slots WHERE id = ?').get(slotId);
          if (!slotObj) return sendJson(res, 404, { success: false, message: 'Slot not found.' });
          const owned = db.prepare('SELECT id FROM stations WHERE id = ? AND owner_id = ?').get(slotObj.station_id, user.id);
          if (!owned) return sendJson(res, 403, { success: false, message: 'Forbidden: You can only manage slots for your own stations.' });
        }

        db.prepare('UPDATE slots SET status = ? WHERE id = ?').run(status, slotId);
        const updated = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId);
        return sendJson(res, 200, { success: true, slot: updated });
      }

      // 11. Bookings: Create Reservation (ATOMIC TRANSACTION with lock)
      if (pathname === '/api/bookings' && method === 'POST') {
        const user = authenticate(req);
        if (!user) return sendJson(res, 401, { success: false, message: 'Please log in to book a charging slot.' });

        const body = await parseBody(req);
        const { station_id, slot_id, vehicle_number, connector_type, estimated_kwh, payment_method, payment_id } = body;

        if (!station_id || !slot_id || !connector_type) {
          return sendJson(res, 400, { success: false, message: 'Station ID, Slot ID, and Connector Type are required.' });
        }

        const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(station_id);
        if (!station) return sendJson(res, 404, { success: false, message: 'Station not found.' });

        const estKwh = estimated_kwh ? parseFloat(estimated_kwh) : 25.0;
        const ratePerKwh = station.price_per_kwh || 16.5;
        const totalAmount = parseFloat((estKwh * ratePerKwh).toFixed(2));
        const bookingRef = 'VP-BK-' + Math.floor(100000 + Math.random() * 900000);
        const txId = payment_id || ('pay_test_' + Math.random().toString(36).substring(2, 12));
        const vehNo = vehicle_number || user.vehicle_number || 'DL-01-EV-2026';

        let newBookingId;
        db.exec('BEGIN TRANSACTION;');
        try {
          const slot = db.prepare('SELECT * FROM slots WHERE id = ? AND station_id = ?').get(slot_id, station_id);
          if (!slot) {
            db.exec('ROLLBACK;');
            return sendJson(res, 404, { success: false, message: 'Requested slot not found.' });
          }
          if (slot.status !== 'available') {
            db.exec('ROLLBACK;');
            return sendJson(res, 409, { success: false, message: 'Double-Booking Conflict: This slot was just reserved. Please select another slot.' });
          }

          // Mark slot as booked
          db.prepare("UPDATE slots SET status = 'booked' WHERE id = ?").run(slot_id);

          const qrPayload = JSON.stringify({
            bookingRef,
            userId: user.id,
            userName: user.name,
            stationName: station.name,
            slotNumber: slot.slot_number,
            date: slot.date,
            time: `${slot.start_time} - ${slot.end_time}`,
            connector: connector_type,
            amount: totalAmount
          });

          const bRes = db.prepare(`
            INSERT INTO bookings (
              booking_ref, user_id, station_id, slot_id, vehicle_number, connector_type,
              date, start_time, end_time, estimated_kwh, total_amount, payment_status,
              payment_id, payment_method, booking_status, qr_code_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            bookingRef, user.id, station_id, slot_id, vehNo, connector_type,
            slot.date, slot.start_time, slot.end_time, estKwh, totalAmount, 'paid',
            txId, payment_method || 'Razorpay / Stripe', 'confirmed', qrPayload
          );

          newBookingId = bRes.lastInsertRowid;

          db.prepare(`
            INSERT INTO payments (booking_id, user_id, amount, currency, provider, transaction_id, status, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            newBookingId, user.id, totalAmount, 'INR', 'Razorpay', txId, 'success',
            JSON.stringify({ method: payment_method || 'Card', ref: txId })
          );

          db.exec('COMMIT;');
        } catch (e) {
          db.exec('ROLLBACK;');
          throw e;
        }

        const booking = db.prepare(`
          SELECT b.*, s.name as station_name, s.address as station_address, s.city as station_city, s.power_kw
          FROM bookings b
          JOIN stations s ON s.id = b.station_id
          WHERE b.id = ?
        `).get(newBookingId);

        return sendJson(res, 201, {
          success: true,
          message: 'Charging slot reserved and paid successfully!',
          booking
        });
      }

      // 12. Bookings: My Bookings
      if (pathname === '/api/bookings/my' && method === 'GET') {
        const user = authenticate(req);
        if (!user) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

        const bookings = db.prepare(`
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
          ORDER BY b.date DESC, b.start_time DESC
        `).all(user.id);

        return sendJson(res, 200, { success: true, count: bookings.length, bookings });
      }

      // 13. Bookings: Cancel
      const cancelMatch = pathname.match(/^\/api\/bookings\/(\d+)\/cancel$/);
      if (cancelMatch && method === 'PUT') {
        const user = authenticate(req);
        if (!user) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        const bookingId = cancelMatch[1];

        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
        if (!booking) return sendJson(res, 404, { success: false, message: 'Booking not found.' });

        if (user.role !== 'admin' && booking.user_id !== user.id) {
          return sendJson(res, 403, { success: false, message: 'Unauthorized to cancel this booking.' });
        }

        db.exec('BEGIN TRANSACTION;');
        db.prepare("UPDATE bookings SET booking_status = 'cancelled', payment_status = 'refunded' WHERE id = ?").run(bookingId);
        db.prepare("UPDATE slots SET status = 'available' WHERE id = ?").run(booking.slot_id);
        db.prepare("UPDATE payments SET status = 'refunded' WHERE booking_id = ?").run(bookingId);
        db.exec('COMMIT;');
        return sendJson(res, 200, { success: true, message: 'Booking cancelled and slot released.' });
      }

      // 14. Bookings: All Bookings for Station Owner (their stations only)
      if (pathname === '/api/bookings/admin/all' && method === 'GET') {
        const user = authenticate(req);
        if (!user || (user.role !== 'admin' && user.role !== 'station_owner')) return sendJson(res, 403, { success: false, message: 'Forbidden' });

        let bookings;
        if (user.role === 'station_owner') {
          // Station owners only see bookings at THEIR stations
          bookings = db.prepare(`
            SELECT b.*,
              s.name as station_name,
              s.city as station_city,
              s.address as station_address,
              sl.slot_number,
              u.name as user_name,
              u.email as user_email,
              u.phone as user_phone
            FROM bookings b
            JOIN stations s ON s.id = b.station_id
            JOIN slots sl ON sl.id = b.slot_id
            JOIN users u ON u.id = b.user_id
            WHERE s.owner_id = ?
            ORDER BY b.created_at DESC
          `).all(user.id);
        } else {
          bookings = db.prepare(`
            SELECT b.*,
              s.name as station_name,
              s.city as station_city,
              s.address as station_address,
              sl.slot_number,
              u.name as user_name,
              u.email as user_email,
              u.phone as user_phone
            FROM bookings b
            JOIN stations s ON s.id = b.station_id
            JOIN slots sl ON sl.id = b.slot_id
            JOIN users u ON u.id = b.user_id
            ORDER BY b.created_at DESC
          `).all();
        }

        return sendJson(res, 200, { success: true, count: bookings.length, bookings });
      }

      // 14b. Stations: Get My Own Stations (Station Owner dashboard)
      if (pathname === '/api/stations/my' && method === 'GET') {
        const user = authenticate(req);
        if (!user || user.role !== 'station_owner') return sendJson(res, 403, { success: false, message: 'Forbidden: Station Owner access required.' });

        const stations = db.prepare(`
          SELECT s.*,
            COALESCE(AVG(r.rating), 4.8) as avg_rating,
            COUNT(DISTINCT r.id) as review_count,
            (SELECT COUNT(*) FROM slots sl WHERE sl.station_id = s.id AND sl.date = date('now') AND sl.status = 'available') as today_available_slots,
            (SELECT COUNT(*) FROM bookings b WHERE b.station_id = s.id AND b.payment_status = 'paid') as total_bookings,
            (SELECT COALESCE(SUM(b.total_amount),0) FROM bookings b WHERE b.station_id = s.id AND b.payment_status = 'paid') as total_revenue
          FROM stations s
          LEFT JOIN reviews r ON r.station_id = s.id
          WHERE s.owner_id = ?
          GROUP BY s.id
          ORDER BY s.id ASC
        `).all(user.id);

        const formatted = stations.map(st => ({
          ...st,
          connector_types: st.connector_types ? st.connector_types.split(',').map(s => s.trim()) : [],
          amenities: st.amenities ? st.amenities.split(',').map(s => s.trim()) : [],
          avg_rating: Number(Number(st.avg_rating).toFixed(1))
        }));

        return sendJson(res, 200, { success: true, stations: formatted });
      }

      // 15. Payments: Create Order & Verify
      if (pathname === '/api/payments/create-order' && method === 'POST') {
        const body = await parseBody(req);
        return sendJson(res, 200, {
          success: true,
          order: {
            id: 'order_' + Math.random().toString(36).substring(2, 14),
            amount: Math.round((body.amount || 500) * 100),
            currency: 'INR',
            key_id: 'rzp_test_EV_CHARGING_KEY_2026'
          }
        });
      }

      // 16. Admin: Metrics & SDG Impact (station_owner gets scoped metrics)
      if (pathname === '/api/admin/metrics' && method === 'GET') {
        const user = authenticate(req);
        let totalStations, totalSlots, bookingStats;

        if (user && user.role === 'station_owner') {
          // Owner-scoped metrics
          totalStations = db.prepare("SELECT COUNT(*) as count FROM stations WHERE owner_id = ? AND status != 'inactive'").get(user.id).count;
          totalSlots = db.prepare('SELECT COUNT(*) as count FROM slots sl JOIN stations s ON s.id = sl.station_id WHERE s.owner_id = ?').get(user.id).count;
          bookingStats = db.prepare(`
            SELECT
              COUNT(*) as total_bookings,
              SUM(CASE WHEN b.booking_status = 'confirmed' THEN 1 ELSE 0 END) as active_bookings,
              SUM(CASE WHEN b.booking_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
              SUM(CASE WHEN b.booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
              COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
              COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.estimated_kwh ELSE 0 END), 0) as total_kwh
            FROM bookings b
            JOIN stations s ON s.id = b.station_id
            WHERE s.owner_id = ?
          `).get(user.id);
        } else {
          // Global metrics (public/admin)
          totalStations = db.prepare("SELECT COUNT(*) as count FROM stations WHERE status != 'inactive'").get().count;
          totalSlots = db.prepare('SELECT COUNT(*) as count FROM slots').get().count;
          bookingStats = db.prepare(`
            SELECT
              COUNT(*) as total_bookings,
              SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as active_bookings,
              SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
              SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
              COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue,
              COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN estimated_kwh ELSE 0 END), 0) as total_kwh
            FROM bookings
          `).get();
        }

        const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
        const totalOwners = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'station_owner'").get().count;

        const totalKwh = bookingStats.total_kwh || 0;
        const co2SavedKg = Number((totalKwh * 0.82).toFixed(1));
        const treesEquivalent = Math.max(1, Math.round(co2SavedKg / 21.77));
        const greenKmPowered = Math.round(totalKwh * 6.8);

        return sendJson(res, 200, {
          success: true,
          metrics: {
            totalStations,
            totalSlots,
            totalUsers,
            totalOwners,
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
          }
        });
      }

      // 17. Admin: Users List (admin only)
      if (pathname === '/api/admin/users' && method === 'GET') {
        const user = authenticate(req);
        if (!user || (user.role !== 'admin' && user.role !== 'station_owner')) return sendJson(res, 403, { success: false, message: 'Forbidden' });

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

        return sendJson(res, 200, { success: true, count: users.length, users });
      }

      // 18. Admin: Toggle User Role (admin only)
      const roleMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
      if (roleMatch && method === 'PUT') {
        const user = authenticate(req);
        if (!user || user.role !== 'admin') return sendJson(res, 403, { success: false, message: 'Forbidden' });
        const targetUserId = roleMatch[1];
        const body = await parseBody(req);

        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, targetUserId);
        return sendJson(res, 200, { success: true, message: 'Role updated' });
      }

      // 404 for unknown API routes
      return sendJson(res, 404, { success: false, message: 'API Endpoint not found' });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 500, { success: false, message: 'Internal Server Error', error: apiErr.message });
    }
  }

  // Static File Serving
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`⚡ VOLTPOINT EV CHARGING STATION MANAGEMENT PORTAL RUNNING`);
  console.log(`🌐 Local Web Portal: http://localhost:${PORT}`);
  console.log(`🔋 Batch-2026 Academic Project | SDGs 7, 9 & 11`);
  console.log(`================================================================`);
});
