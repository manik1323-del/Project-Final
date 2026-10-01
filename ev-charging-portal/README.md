# ⚡ VoltPoint — EV Charging Station Management Portal

> **BATCH-2026 Academic Project Report Implementation**  
> Aligned with **UN SDG 7 (Affordable and Clean Energy)**, **SDG 9 (Industry, Innovation & Infrastructure)**, and **SDG 11 (Sustainable Cities and Communities)**.

---

## 👥 Project Team & Mentorship
- **Project Mentor**: Mr. Sandeep
- **Student Contributors**:
  - **Aalam** — `2411981002`
  - **Abhinandan Sawraj** — `2411981023`
  - **Akanksha Singla** — `2411981044`
  - **Anubhav** — `2411981099`

---

## 🌍 Sustainable Development Goals (SDGs)
- **SDG 7 — Affordable and Clean Energy**: Promotes high-efficiency electric mobility, reducing carbon footprint through automated green charging schedules and renewable energy telemetry.
- **SDG 9 — Industry, Innovation & Infrastructure**: Introduces a resilient digital layer on top of physical EV hardware with atomic reservation locking and IoT-ready telemetry.
- **SDG 11 — Sustainable Cities and Communities**: Eliminates congestion and queueing at urban charging stations through intelligent time-slot discovery and instant digital QR passes.

---

## 🚀 Key Features Implemented

1. **🔐 Authentication & Role-Based Access Control**:
   - Secure registration & login with salted PBKDF2/SHA-512 hashing and signed JWT tokens.
   - Dual-role permissions: Standard Drivers vs. Administrators.
   - 1-Click Sandbox test accounts for instant evaluation.

2. **🗺️ Interactive Map-Based Station Locator**:
   - Leaflet interactive map with custom color-coded pins (Hyperchargers ≥ 100 kW vs Fast Chargers 50-60 kW).
   - Real-time filtering by City, Connector type (CCS2, Type 2, CHAdeMO, GB/T), and Min Power rating.
   - Auto-centering and station detail cards.

3. **📅 Concurrency-Safe Slot Reservation**:
   - Dynamic date & 1-hour time window selector.
   - **Atomic database transaction locks** to strictly prevent double-booking race conditions (returns HTTP 409 Conflict if conflict occurs).
   - Dynamic tariff & energy price calculator (kWh × rate + service fee).

4. **💳 Simulated Payment Gateway (Razorpay / Stripe)**:
   - Sandbox checkout with Card, UPI (VPA), and NetBanking options.
   - 1-click test details autofill.
   - Progress authorization feedback and confetti celebration.

5. **📱 Digital Charging Pass & QR Dispenser Token**:
   - Generates scannable QR pass to unlock physical station dispensers.
   - Complete session breakdown, vehicle number, and printable receipt.

6. **📊 Driver Passbook & Booking Cancellation**:
   - Filter history by Active, Completed, or Cancelled sessions.
   - 1-click cancellation with automated slot release and refund tracking.

7. **🛡️ Administrator Control Center**:
   - Executive KPIs: Total Stations, Slots, Active Sessions, Total Revenue (₹), Clean Energy Delivered (kWh), and CO₂ Offset (kg).
   - **Station CRUD Management**: Add, edit, or remove charging hubs with GPS coordinates and connector specifications.
   - **Live Slot Maintenance Controller**: Manually toggle slots between Available and Maintenance.
   - **Network Bookings Audit**: View all driver transactions across the country.
   - **User Role Manager**: Promote/demote driver accounts.

---

## 🏛️ System Architecture & Database Design

### High-Level Architecture Diagram
```
+-------------------------------------------------------------------------+
|                        BROWSER / CLIENT (SPA)                           |
|  - Interactive Leaflet Station Map with Geolocation & Filters           |
|  - Slot Picker Modal & Dynamic Tariff Calculator                        |
|  - Simulated Razorpay / Stripe Payment Checkout                         |
|  - Digital Passbook with High-Res QR Code Dispenser Tokens              |
|  - Admin Dashboard with Live Slot Maintenance & Station Inventory       |
+-----------------------------------▲-------------------------------------+
                                    | REST API (HTTP + JWT Auth)
+-----------------------------------▼-------------------------------------+
|                      NODE.JS REST BACKEND (PORT 5000)                   |
|  - Auth Controller (Salted PBKDF2 Password Hashing, JWT Issuer)         |
|  - Stations & Slots Router (Geo-spatial query, On-the-fly Slot Gen)     |
|  - Booking Engine (Atomic SQL Transactions & Race Condition Lock)       |
|  - Payment Processor (Simulated order creation & gateway verification)  |
|  - Admin Controller (SDG Telemetry: CO2 saved, Trees, Clean kWh)       |
+-----------------------------------▲-------------------------------------+
                                    | Native SQL Driver
+-----------------------------------▼-------------------------------------+
|                     SQLITE RELATIONAL DATABASE                          |
|  - Users (id, name, email, password_hash, role, vehicle_number)         |
|  - Stations (id, name, city, latitude, longitude, power_kw, price_kwh)   |
|  - Slots (id, station_id, slot_number, date, start_time, status)        |
|  - Bookings (id, booking_ref, user_id, slot_id, total_amount, status)   |
|  - Payments (id, booking_id, user_id, amount, provider, tx_id, status)   |
+-------------------------------------------------------------------------+
```

### Data Flow Diagram (Level 0 - Context Level)
```
[ EV Driver / Admin ]
        │
        ▼ (HTTP Requests / Form Submissions)
[ VoltPoint Management Portal Engine ]
        │
        ├────────► [ Relational SQLite Database ] (Atomic Slot Storage)
        └────────► [ Razorpay / Stripe Gateway ] (Simulated Authorization)
```

### Data Flow Diagram (Level 1 - Functional Modules)
```
[ User ] ────────► 1.0 Auth Module ──────────► [ Users Table ]
        ────────► 2.0 Locator Module ───────► [ Stations Table ]
        ────────► 3.0 Slot Picker ──────────► [ Slots Table ]
        ────────► 4.0 Payment Gateway ──────► [ Payments Table ]
        ────────► 5.0 Booking Finalizer ────► [ Bookings Table ] (Atomic Lock)
        ────────► 6.0 Passbook / QR Pass ───► [ Digital Token Generator ]

[ Admin ] ───────► 7.0 Station / Slot CRUD ──► [ Stations & Slots Tables ]
        ───────► 8.0 KPI Telemetry Engine ──► [ System-Wide Metrics ]
```

---

## ⚡ Quick Start & Run Instructions

### 1. Launch the Server & Web Portal
Simply double-click `start.bat` in this folder, or run:
```bash
cd backend
node server.js
```
The server will automatically initialize the database schema, seed initial stations across India, and serve the web application at:
👉 **`http://localhost:5000`**

### 2. Run Automated Test Suite
To verify all 13 core endpoints and atomic locking:
```bash
cd backend
node scripts/test-api.js
```

---

## 🔑 Pre-Seeded Test Credentials

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@evcharge.com` | `Admin@123` | Full access: Station CRUD, Slot override, Analytics, User roles |
| **Driver 1** | `user@evcharge.com` | `User@123` | Standard: Map search, Slot reservation, Passbook, Cancellation |
| **Driver 2** | `abhinandan@evcharge.com`| `User@123` | Standard driver account |
| **Driver 3** | `akanksha@evcharge.com`  | `User@123` | Standard driver account |
| **Driver 4** | `anubhav@evcharge.com`    | `User@123` | Standard driver account |

*(Or click the **Demo Driver** / **Demo Admin** 1-click buttons directly in the web portal top navbar!)*
