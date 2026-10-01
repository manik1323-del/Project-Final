const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = new URL(BASE_URL + endpoint);
  const headers = options.headers || {};
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const reqOptions = {
    method: options.method || 'GET',
    headers
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('⚡ STARTING VOLTPOINT BACKEND AUTOMATED TEST SUITE');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('1️⃣ Testing Health Check...');
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'online', 'Server health endpoint is online');

    // 2. Auth Login (User)
    console.log('\n2️⃣ Testing Authentication (User & Admin)...');
    const userLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'user@evcharge.com', password: 'User@123' }
    });
    assert(userLogin.status === 200 && userLogin.data.token, 'User login returns signed JWT');
    const userToken = userLogin.data.token;

    // Admin Login
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@evcharge.com', password: 'Admin@123' }
    });
    assert(adminLogin.status === 200 && adminLogin.data.user.role === 'admin', 'Admin login returns admin privileges');
    const adminToken = adminLogin.data.token;

    // 3. Stations Retrieval & Filter
    console.log('\n3️⃣ Testing Stations API...');
    const stationsRes = await request('/stations');
    assert(stationsRes.status === 200 && stationsRes.data.stations.length > 0, `Retrieved ${stationsRes.data.count} stations`);

    const firstStation = stationsRes.data.stations[0];

    const filterRes = await request('/stations?connectorType=CCS2');
    assert(filterRes.status === 200 && filterRes.data.stations.every(s => s.connector_types.includes('CCS2')), 'Filter by CCS2 connector matches correctly');

    // 4. Slots Retrieval
    console.log('\n4️⃣ Testing Slots API...');
    const slotsRes = await request(`/slots/station/${firstStation.id}`);
    assert(slotsRes.status === 200 && slotsRes.data.slots.length > 0, `Retrieved ${slotsRes.data.slots.length} time slots for ${firstStation.name}`);

    const availableSlot = slotsRes.data.slots.find(s => s.status === 'available');
    assert(availableSlot !== undefined, 'Found at least one available slot');

    // 5. Booking Creation & Payment Integration
    console.log('\n5️⃣ Testing Booking Creation & Atomic Concurrency...');
    const bookingRes = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        station_id: firstStation.id,
        slot_id: availableSlot.id,
        vehicle_number: 'DL-01-EV-2026',
        connector_type: 'CCS2',
        estimated_kwh: 30.0,
        payment_method: 'Test Razorpay Card',
        payment_id: 'pay_test_' + Date.now()
      }
    });
    assert(bookingRes.status === 201 && bookingRes.data.booking.booking_ref, `Successfully booked Slot #${availableSlot.slot_number} (Ref: ${bookingRes.data?.booking?.booking_ref})`);

    const createdBookingId = bookingRes.data.booking.id;

    // 6. Test Double Booking Prevention (Race condition / Conflict test)
    console.log('\n6️⃣ Testing Race-Condition Prevention (Double-Booking Conflict)...');
    const doubleBookRes = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        station_id: firstStation.id,
        slot_id: availableSlot.id,
        vehicle_number: 'HR-26-EV-9999',
        connector_type: 'CCS2',
        estimated_kwh: 20.0,
        payment_method: 'Test Card'
      }
    });
    assert(doubleBookRes.status === 409, 'Prevented double-booking with HTTP 409 Conflict');

    // 7. User My Bookings List
    console.log('\n7️⃣ Testing User Bookings & Digital Pass Retrieval...');
    const myBookings = await request('/bookings/my', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(myBookings.status === 200 && myBookings.data.bookings.some(b => b.id === createdBookingId), 'New booking appears in driver history');

    // 8. Admin Metrics & SDG Impact Telemetry
    console.log('\n8️⃣ Testing Admin Metrics & SDG Impact Calculations...');
    const adminMetrics = await request('/admin/metrics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminMetrics.status === 200 && adminMetrics.data.metrics.sdgImpact.co2SavedKg > 0, `SDG Metrics Calculated: ${adminMetrics.data.metrics.sdgImpact.co2SavedKg} kg CO2 saved, ${adminMetrics.data.metrics.sdgImpact.treesEquivalent} trees equivalent`);

    // 9. Booking Cancellation & Slot Release
    console.log('\n9️⃣ Testing Booking Cancellation & Slot Release...');
    const cancelRes = await request(`/bookings/${createdBookingId}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(cancelRes.status === 200, 'Booking cancelled and refund recorded');

    // Verify slot is freed
    const slotCheck = await request(`/slots/station/${firstStation.id}`);
    const freedSlot = slotCheck.data.slots.find(s => s.id === availableSlot.id);
    assert(freedSlot && freedSlot.status === 'available', 'Slot atomically reverted to available state');

    console.log('\n========================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
