const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('node:crypto');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ev_portal.db');
const db = new DatabaseSync(dbPath);

// Crypto helpers for authentication without external dependencies
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === key;
}

const JWT_SECRET = 'voltpoint_ev_portal_jwt_secret_batch_2026_key';

function signToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (expectedSig !== signature) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin', 'station_owner')),
      phone TEXT,
      vehicle_model TEXT,
      vehicle_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      connector_types TEXT NOT NULL,
      power_kw REAL NOT NULL DEFAULT 60.0,
      price_per_kwh REAL NOT NULL DEFAULT 16.50,
      total_slots INTEGER NOT NULL DEFAULT 4,
      amenities TEXT DEFAULT 'WiFi,Cafe,Restroom,24/7 Security',
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'maintenance', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      slot_number INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'booked', 'maintenance')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
      UNIQUE(station_id, slot_number, date, start_time)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      station_id INTEGER NOT NULL,
      slot_id INTEGER NOT NULL,
      vehicle_number TEXT,
      connector_type TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      estimated_kwh REAL NOT NULL DEFAULT 25.0,
      total_amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid' CHECK(payment_status IN ('pending', 'paid', 'refunded', 'failed')),
      payment_id TEXT,
      payment_method TEXT DEFAULT 'Razorpay / Stripe',
      booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK(booking_status IN ('confirmed', 'completed', 'cancelled')),
      qr_code_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
      FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      provider TEXT NOT NULL DEFAULT 'Razorpay',
      transaction_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed', 'refunded')),
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_slots_station_date ON slots(station_id, date);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_station ON bookings(station_id);
    CREATE INDEX IF NOT EXISTS idx_stations_owner ON stations(owner_id);
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('⚡ Initializing Database with Batch-2026 Seed Data...');

  const passAdmin = hashPassword('Admin@123');
  const passOwner = hashPassword('Owner@123');
  const passUser = hashPassword('User@123');

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, vehicle_model, vehicle_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Global Admin
  const adminId = insertUser.run('Admin Sandeep', 'admin@evcharge.com', passAdmin, 'admin', '+91 98765 43210', 'Tata Nexon EV Max', 'DL-01-EV-2026').lastInsertRowid;

  // Station Owners (4 individuals, each owning 2 stations)
  const owner1Id = insertUser.run('Rajesh Kumar (Delhi Hubs)', 'rajesh@voltpoint.in', passOwner, 'station_owner', '+91 98765 11001', null, null).lastInsertRowid;
  const owner2Id = insertUser.run('Priya Sharma (Bangalore Network)', 'priya@voltpoint.in', passOwner, 'station_owner', '+91 98765 22002', null, null).lastInsertRowid;
  const owner3Id = insertUser.run('Arjun Mehta (West India Hubs)', 'arjun@voltpoint.in', passOwner, 'station_owner', '+91 98765 33003', null, null).lastInsertRowid;
  const owner4Id = insertUser.run('Sandeep (North India Operator)', 'sandeep@voltpoint.in', passOwner, 'station_owner', '+91 98765 44004', null, null).lastInsertRowid;

  // EV Drivers
  const user1Id = insertUser.run('Aalam', 'user@evcharge.com', passUser, 'user', '+91 98111 22334', 'Hyundai Ioniq 5', 'HR-26-EV-1002').lastInsertRowid;
  const user2Id = insertUser.run('Abhinandan Sawraj', 'abhinandan@evcharge.com', passUser, 'user', '+91 98222 33445', 'MG ZS EV', 'PB-65-EV-1023').lastInsertRowid;
  const user3Id = insertUser.run('Akanksha Singla', 'akanksha@evcharge.com', passUser, 'user', '+91 98333 44556', 'Mahindra XUV400', 'CH-01-EV-1044').lastInsertRowid;
  const user4Id = insertUser.run('Anubhav', 'anubhav@evcharge.com', passUser, 'user', '+91 98444 55667', 'BYD Atto 3', 'UP-16-EV-1099').lastInsertRowid;

  const insertStation = db.prepare(`
    INSERT INTO stations (owner_id, name, address, city, state, latitude, longitude, connector_types, power_kw, price_per_kwh, total_slots, amenities, image_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stationsData = [
    // owner1: Rajesh Kumar — Delhi & Gurugram
    { owner_id: owner1Id, name: 'VoltPoint SuperCharge Hub — Aerocity', address: 'Asset Area 4, Hospitality District, IGI Airport', city: 'New Delhi', state: 'Delhi', latitude: 28.5562, longitude: 77.1000, connector_types: 'CCS2,Type 2,CHAdeMO', power_kw: 120.0, price_per_kwh: 18.50, total_slots: 6, amenities: '24/7 Access,Cafeteria,Clean Restroom,Lounge,WiFi,Security', image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80', status: 'active' },
    { owner_id: owner1Id, name: 'GreenGrid Eco-Station — CyberCity', address: 'Building 10, DLF Cyber City, Sector 24', city: 'Gurugram', state: 'Haryana', latitude: 28.4900, longitude: 77.0900, connector_types: 'CCS2,Type 2,GB/T', power_kw: 60.0, price_per_kwh: 16.00, total_slots: 4, amenities: 'Coffee Shop,Covered Canopy,ATM,EV Tyre Inflation', image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80', status: 'active' },
    // owner2: Priya Sharma — Bengaluru & Chandigarh
    { owner_id: owner2Id, name: 'EcoCharge TechPark Hub — Whitefield', address: 'ITPL Main Road, Pattandur Agrahara', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9698, longitude: 77.7500, connector_types: 'CCS2,Type 2,CHAdeMO', power_kw: 150.0, price_per_kwh: 19.50, total_slots: 8, amenities: 'Ultra-Fast Hyperchargers,Work Pods,Snack Bar,Solar Roof', image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80', status: 'active' },
    { owner_id: owner2Id, name: 'CleanVolt Express — Sector 17 Plaza', address: 'Central Parking Complex, Sector 17C', city: 'Chandigarh', state: 'Chandigarh', latitude: 30.7398, longitude: 76.7827, connector_types: 'CCS2,Type 2', power_kw: 50.0, price_per_kwh: 15.00, total_slots: 4, amenities: 'Shopping Mall Proximity,Restroom,24/7 Security,CCTV', image_url: 'https://images.unsplash.com/photo-1558441719-aa34bbe5f347?auto=format&fit=crop&w=800&q=80', status: 'active' },
    // owner3: Arjun Mehta — Mumbai & Pune
    { owner_id: owner3Id, name: 'VoltCharge Hub — BKC Business Hub', address: 'G-Block, Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra', latitude: 19.0657, longitude: 72.8687, connector_types: 'CCS2,Type 2', power_kw: 120.0, price_per_kwh: 18.00, total_slots: 6, amenities: 'Executive Lounge,Valet Parking,Cafe,WiFi', image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80', status: 'active' },
    { owner_id: owner3Id, name: 'SunVolt Station — Hinjewadi Phase 1', address: 'Near Rajiv Gandhi Infotech Park', city: 'Pune', state: 'Maharashtra', latitude: 18.5913, longitude: 73.7389, connector_types: 'CCS2,Type 2', power_kw: 60.0, price_per_kwh: 15.50, total_slots: 4, amenities: '24/7 Security,Food Court Nearby,Restroom', image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', status: 'active' },
    // owner4: Sandeep — Hyderabad & Jaipur
    { owner_id: owner4Id, name: 'E-Mobility Plaza — HITEC City', address: 'Cyber Towers Quadrangle, Madhapur', city: 'Hyderabad', state: 'Telangana', latitude: 17.4474, longitude: 78.3762, connector_types: 'CCS2,Type 2,CHAdeMO', power_kw: 100.0, price_per_kwh: 17.00, total_slots: 6, amenities: 'Coffee Shop,EV Accessories,Fast Wash,Restroom', image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80', status: 'active' },
    { owner_id: owner4Id, name: 'Heritage Clean Energy — MI Road', address: 'Opposite Rajputana Palace, MI Road', city: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, connector_types: 'CCS2,Type 2', power_kw: 50.0, price_per_kwh: 15.00, total_slots: 4, amenities: 'Handicraft Shop,Cafe,Tourist Helpdesk', image_url: 'https://images.unsplash.com/photo-1558441719-aa34bbe5f347?auto=format&fit=crop&w=800&q=80', status: 'active' }
  ];

  const stationIds = [];
  for (const st of stationsData) {
    const res = insertStation.run(st.owner_id, st.name, st.address, st.city, st.state, st.latitude, st.longitude, st.connector_types, st.power_kw, st.price_per_kwh, st.total_slots, st.amenities, st.image_url, st.status);
    stationIds.push(res.lastInsertRowid);
  }

  const insertSlot = db.prepare(`INSERT INTO slots (station_id, slot_number, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'available')`);
  const timeWindows = [
    { start: '06:00', end: '07:00' }, { start: '07:00', end: '08:00' }, { start: '08:00', end: '09:00' },
    { start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' },
    { start: '12:00', end: '13:00' }, { start: '13:00', end: '14:00' }, { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' }, { start: '16:00', end: '17:00' }, { start: '17:00', end: '18:00' },
    { start: '18:00', end: '19:00' }, { start: '19:00', end: '20:00' }, { start: '20:00', end: '21:00' },
    { start: '21:00', end: '22:00' }
  ];
  const now = new Date();
  const dates = [];
  for (let i = 0; i < 5; i++) { const d = new Date(); d.setDate(now.getDate() + i); dates.push(d.toISOString().split('T')[0]); }

  const slotMap = [];
  db.exec('BEGIN TRANSACTION;');
  for (let sIdx = 0; sIdx < stationsData.length; sIdx++) {
    const stationId = stationIds[sIdx];
    const maxSlots = stationsData[sIdx].total_slots;
    for (const dateStr of dates) {
      for (let slotNum = 1; slotNum <= maxSlots; slotNum++) {
        for (const tw of timeWindows) {
          const res = insertSlot.run(stationId, slotNum, dateStr, tw.start, tw.end);
          slotMap.push({ id: res.lastInsertRowid, stationId, slotNum, date: dateStr, startTime: tw.start, endTime: tw.end });
        }
      }
    }
  }
  db.exec('COMMIT;');

  const insertBooking = db.prepare(`INSERT INTO bookings (booking_ref, user_id, station_id, slot_id, vehicle_number, connector_type, date, start_time, end_time, estimated_kwh, total_amount, payment_status, payment_id, payment_method, booking_status, qr_code_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertPayment = db.prepare(`INSERT INTO payments (booking_id, user_id, amount, currency, provider, transaction_id, status, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  const slot1 = slotMap[5];
  db.prepare("UPDATE slots SET status = 'booked' WHERE id = ?").run(slot1.id);
  const ref1 = 'VP-BK-' + Math.floor(100000 + Math.random() * 900000);
  const tx1 = 'pay_test_' + Math.random().toString(36).substring(2, 12);
  const b1 = insertBooking.run(ref1, user1Id, slot1.stationId, slot1.id, 'HR-26-EV-1002', 'CCS2', slot1.date, slot1.startTime, slot1.endTime, 28.5, 527.25, 'paid', tx1, 'UPI / Google Pay', 'completed', JSON.stringify({ ref: ref1, user: 'Aalam', slot: slot1.slotNum })).lastInsertRowid;
  insertPayment.run(b1, user1Id, 527.25, 'INR', 'Razorpay', tx1, 'success', JSON.stringify({ method: 'UPI' }));

  const slot2 = slotMap[20];
  db.prepare("UPDATE slots SET status = 'booked' WHERE id = ?").run(slot2.id);
  const ref2 = 'VP-BK-' + Math.floor(100000 + Math.random() * 900000);
  const tx2 = 'pay_test_' + Math.random().toString(36).substring(2, 12);
  const b2 = insertBooking.run(ref2, user1Id, slot2.stationId, slot2.id, 'HR-26-EV-1002', 'Type 2', slot2.date, slot2.startTime, slot2.endTime, 22.0, 352.00, 'paid', tx2, 'Credit Card (Visa)', 'confirmed', JSON.stringify({ ref: ref2, user: 'Aalam', slot: slot2.slotNum })).lastInsertRowid;
  insertPayment.run(b2, user1Id, 352.00, 'INR', 'Stripe', tx2, 'success', JSON.stringify({ method: 'Card' }));

  const insertReview = db.prepare(`INSERT INTO reviews (station_id, user_id, rating, comment) VALUES (?, ?, ?, ?)`);
  insertReview.run(stationIds[0], user1Id, 5, 'Super fast charging! Went from 20% to 80% in 28 minutes. Great cafe too.');
  insertReview.run(stationIds[0], user2Id, 5, 'Seamless slot reservation. Plugged in right on time.');
  insertReview.run(stationIds[2], user3Id, 4, 'Fastest charger in Bengaluru! Hypercharger is a game changer.');
  insertReview.run(stationIds[3], user4Id, 5, 'Clean area and reliable 50kW fast charger in Chandigarh.');

  console.log('✅ Seed: 4 Station Owners (2 stations each) + 4 Drivers + 8 Stations + Slots.');
}

initSchema();

module.exports = {
  db,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  JWT_SECRET
};
