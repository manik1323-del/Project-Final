const db = require('./db');
const bcrypt = require('bcryptjs');

function runSeed() {
  console.log('⚡ Starting EV Charging Portal Database Seeding...');

  db.exec(`
    DELETE FROM payments;
    DELETE FROM bookings;
    DELETE FROM slots;
    DELETE FROM reviews;
    DELETE FROM stations;
    DELETE FROM users;
  `);

  const passwordHashAdmin = bcrypt.hashSync('Admin@123', 10);
  const passwordHashUser = bcrypt.hashSync('User@123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, vehicle_model, vehicle_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run('Admin Sandeep', 'admin@evcharge.com', passwordHashAdmin, 'admin', '+91 98765 43210', 'Tata Nexon EV Max', 'DL-01-EV-2026').lastInsertRowid;
  const user1Id = insertUser.run('Aalam', 'user@evcharge.com', passwordHashUser, 'user', '+91 98111 22334', 'Hyundai Ioniq 5', 'HR-26-EV-1002').lastInsertRowid;
  const user2Id = insertUser.run('Abhinandan Sawraj', 'abhinandan@evcharge.com', passwordHashUser, 'user', '+91 98222 33445', 'MG ZS EV', 'PB-65-EV-1023').lastInsertRowid;
  const user3Id = insertUser.run('Akanksha Singla', 'akanksha@evcharge.com', passwordHashUser, 'user', '+91 98333 44556', 'Mahindra XUV400', 'CH-01-EV-1044').lastInsertRowid;
  const user4Id = insertUser.run('Anubhav', 'anubhav@evcharge.com', passwordHashUser, 'user', '+91 98444 55667', 'BYD Atto 3', 'UP-16-EV-1099').lastInsertRowid;

  console.log('✅ Users seeded: 1 Admin, 4 Standard Users');

  const insertStation = db.prepare(`
    INSERT INTO stations (name, address, city, state, latitude, longitude, connector_types, power_kw, price_per_kwh, total_slots, amenities, image_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stationsData = [
    {
      name: 'VoltPoint SuperCharge Hub — Aerocity',
      address: 'Asset Area 4, Hospitality District, IGI Airport',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.5562,
      longitude: 77.1000,
      connector_types: 'CCS2,Type 2,CHAdeMO',
      power_kw: 120.0,
      price_per_kwh: 18.50,
      total_slots: 6,
      amenities: '24/7 Access,Cafeteria,Clean Restroom,Lounge,WiFi,Security',
      image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    },
    {
      name: 'GreenGrid Eco-Station — CyberCity',
      address: 'Building 10, DLF Cyber City, Sector 24',
      city: 'Gurugram',
      state: 'Haryana',
      latitude: 28.4900,
      longitude: 77.0900,
      connector_types: 'CCS2,Type 2,GB/T',
      power_kw: 60.0,
      price_per_kwh: 16.00,
      total_slots: 4,
      amenities: 'Coffee Shop,Covered Canopy,ATM,EV Tyre Inflation',
      image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    },
    {
      name: 'CleanVolt Express — Sector 17 Plaza',
      address: 'Central Parking Complex, Sector 17C',
      city: 'Chandigarh',
      state: 'Chandigarh',
      latitude: 30.7398,
      longitude: 76.7827,
      connector_types: 'CCS2,Type 2',
      power_kw: 50.0,
      price_per_kwh: 15.00,
      total_slots: 4,
      amenities: 'Shopping Mall Proximity,Restroom,24/7 Security,CCTV',
      image_url: 'https://images.unsplash.com/photo-1558441719-aa34bbe5f347?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    },
    {
      name: 'EcoCharge TechPark Hub — Whitefield',
      address: 'ITPL Main Road, Pattandur Agrahara',
      city: 'Bengaluru',
      state: 'Karnataka',
      latitude: 12.9698,
      longitude: 77.7500,
      connector_types: 'CCS2,Type 2,CHAdeMO',
      power_kw: 150.0,
      price_per_kwh: 19.50,
      total_slots: 8,
      amenities: 'Ultra-Fast Hyperchargers,Work Pods,Snack Bar,Solar Roof',
      image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    },
    {
      name: 'VoltCharge Hub — BKC Business Hub',
      address: 'G-Block, Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 19.0657,
      longitude: 72.8687,
      connector_types: 'CCS2,Type 2',
      power_kw: 120.0,
      price_per_kwh: 18.00,
      total_slots: 6,
      amenities: 'Executive Lounge,Valet Parking,Cafe,WiFi',
      image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    },
    {
      name: 'SunVolt Station — Hinjewadi Phase 1',
      address: 'Near Rajiv Gandhi Infotech Park',
      city: 'Pune',
      state: 'Maharashtra',
      latitude: 18.5913,
      longitude: 73.7389,
      connector_types: 'CCS2,Type 2',
      power_kw: 60.0,
      price_per_kwh: 15.50,
      total_slots: 4,
      amenities: '24/7 Security,Food Court Nearby,Restroom',
      image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    },
    {
      name: 'E-Mobility Plaza — HITEC City',
      address: 'Cyber Towers Quadrangle, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      latitude: 17.4474,
      longitude: 78.3762,
      connector_types: 'CCS2,Type 2,CHAdeMO',
      power_kw: 100.0,
      price_per_kwh: 17.00,
      total_slots: 6,
      amenities: 'Coffee Shop,EV Accessories,Fast Wash,Restroom',
      image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    },
    {
      name: 'Heritage Clean Energy — MI Road',
      address: 'Opposite Rajputana Palace, MI Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      latitude: 26.9124,
      longitude: 75.7873,
      connector_types: 'CCS2,Type 2',
      power_kw: 50.0,
      price_per_kwh: 15.00,
      total_slots: 4,
      amenities: 'Handicraft Shop,Cafe,Tourist Helpdesk',
      image_url: 'https://images.unsplash.com/photo-1558441719-aa34bbe5f347?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    }
  ];

  const stationIds = [];
  for (const st of stationsData) {
    const res = insertStation.run(
      st.name, st.address, st.city, st.state, st.latitude, st.longitude,
      st.connector_types, st.power_kw, st.price_per_kwh, st.total_slots,
      st.amenities, st.image_url, st.status
    );
    stationIds.push(res.lastInsertRowid);
  }

  console.log(`✅ Seeded ${stationIds.length} Charging Stations across India`);

  const insertSlot = db.prepare(`
    INSERT INTO slots (station_id, slot_number, date, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

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

  const now = new Date();
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  let totalSlotsCount = 0;
  const slotMap = [];

  const generateSlotsTx = db.transaction(() => {
    for (let sIdx = 0; sIdx < stationsData.length; sIdx++) {
      const stationId = stationIds[sIdx];
      const maxSlots = stationsData[sIdx].total_slots;

      for (const dateStr of dates) {
        for (let slotNum = 1; slotNum <= maxSlots; slotNum++) {
          for (const tw of timeWindows) {
            const res = insertSlot.run(stationId, slotNum, dateStr, tw.start, tw.end, 'available');
            slotMap.push({
              id: res.lastInsertRowid,
              stationId,
              slotNum,
              date: dateStr,
              startTime: tw.start,
              endTime: tw.end
            });
            totalSlotsCount++;
          }
        }
      }
    }
  });

  generateSlotsTx();
  console.log(`✅ Generated ${totalSlotsCount} slots for next 5 days`);

  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      booking_ref, user_id, station_id, slot_id, vehicle_number, connector_type,
      date, start_time, end_time, estimated_kwh, total_amount, payment_status,
      payment_id, payment_method, booking_status, qr_code_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (booking_id, user_id, amount, currency, provider, transaction_id, status, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateSlotStatus = db.prepare(`
    UPDATE slots SET status = 'booked' WHERE id = ?
  `);

  // Sample Completed Booking 1
  const slot1 = slotMap[5];
  updateSlotStatus.run(slot1.id);
  const ref1 = 'VP-BK-' + Math.floor(100000 + Math.random() * 900000);
  const tx1 = 'pay_test_' + Math.random().toString(36).substring(2, 12);
  const qr1 = JSON.stringify({ ref: ref1, user: 'Aalam', station: 'Aerocity', slot: slot1.slotNum, time: slot1.startTime });
  
  const b1 = insertBooking.run(
    ref1, user1Id, slot1.stationId, slot1.id, 'HR-26-EV-1002', 'CCS2',
    slot1.date, slot1.startTime, slot1.endTime, 28.5, 527.25, 'paid',
    tx1, 'UPI / Razorpay', 'completed', qr1
  ).lastInsertRowid;

  insertPayment.run(b1, user1Id, 527.25, 'INR', 'Razorpay', tx1, 'success', JSON.stringify({ method: 'UPI', upi_id: 'aalam@oksbi' }));

  // Sample Upcoming Booking 2
  const slot2 = slotMap[20];
  updateSlotStatus.run(slot2.id);
  const ref2 = 'VP-BK-' + Math.floor(100000 + Math.random() * 900000);
  const tx2 = 'pay_test_' + Math.random().toString(36).substring(2, 12);
  const qr2 = JSON.stringify({ ref: ref2, user: 'Aalam', station: 'CyberCity', slot: slot2.slotNum, time: slot2.startTime });

  const b2 = insertBooking.run(
    ref2, user1Id, slot2.stationId, slot2.id, 'HR-26-EV-1002', 'Type 2',
    slot2.date, slot2.startTime, slot2.endTime, 22.0, 352.00, 'paid',
    tx2, 'Credit Card / Stripe', 'confirmed', qr2
  ).lastInsertRowid;

  insertPayment.run(b2, user1Id, 352.00, 'INR', 'Stripe', tx2, 'success', JSON.stringify({ method: 'card', brand: 'Visa', last4: '4242' }));

  // Sample Booking 3 for Abhinandan
  const slot3 = slotMap[50];
  updateSlotStatus.run(slot3.id);
  const ref3 = 'VP-BK-' + Math.floor(100000 + Math.random() * 900000);
  const tx3 = 'pay_test_' + Math.random().toString(36).substring(2, 12);
  const qr3 = JSON.stringify({ ref: ref3, user: 'Abhinandan', station: 'Whitefield', slot: slot3.slotNum, time: slot3.startTime });

  const b3 = insertBooking.run(
    ref3, user2Id, slot3.stationId, slot3.id, 'PB-65-EV-1023', 'CCS2',
    slot3.date, slot3.startTime, slot3.endTime, 35.0, 682.50, 'paid',
    tx3, 'Net Banking', 'confirmed', qr3
  ).lastInsertRowid;

  insertPayment.run(b3, user2Id, 682.50, 'INR', 'Razorpay', tx3, 'success', JSON.stringify({ bank: 'HDFC' }));

  console.log('✅ Demo Bookings & Payments seeded successfully');

  const insertReview = db.prepare(`
    INSERT INTO reviews (station_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?)
  `);

  insertReview.run(stationIds[0], user1Id, 5, 'Super fast charging! Went from 20% to 80% in 28 minutes. Great cafe too.');
  insertReview.run(stationIds[0], user2Id, 5, 'Seamless slot reservation. Plugged in right on time.');
  insertReview.run(stationIds[1], user3Id, 4, 'Very convenient location right next to Cyber Hub.');
  insertReview.run(stationIds[2], user4Id, 5, 'Clean area and reliable 50kW fast charger in Chandigarh.');

  console.log('✅ Station Reviews seeded');
  console.log('🎉 Seeding completed successfully!');
}

if (require.main === module) {
  runSeed();
}

module.exports = runSeed;
