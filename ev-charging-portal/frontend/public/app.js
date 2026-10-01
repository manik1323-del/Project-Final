/**
 * VoltPoint EV Charging Station Management Portal — Core Application Logic
 * Batch-2026 Academic Project | SDGs 7, 9, 11
 */

const API_BASE = '/api';

// Application State
const state = {
  user: null,
  token: localStorage.getItem('ev_token') || null,
  currentView: 'home',
  stations: [],
  selectedStation: null,
  selectedSlot: null,
  selectedDate: new Date().toISOString().split('T')[0],
  selectedConnector: 'CCS2',
  estimatedKwh: 25,
  currentBookingDraft: null,
  bookingsTab: 'all',
  adminTab: 'stations',
  authMode: 'login', // 'login' | 'register'
  map: null,
  markers: []
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  await checkSession();
  renderAuthHeader();
  await loadInitialData();
  handleHashNavigation();
  window.addEventListener('hashchange', handleHashNavigation);
});

function handleHashNavigation() {
  const hash = window.location.hash.replace('#', '') || 'home';
  navigateTo(hash);
}

// Session Check
async function checkSession() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) {
      state.user = data.user;
    } else {
      logout();
    }
  } catch (e) {
    console.warn('Session verification failed:', e);
    logout();
  }
}

// Render Top Navbar Auth Pill
function renderAuthHeader() {
  const container = document.getElementById('auth-header-container');
  if (!container) return;

  if (state.user) {
    container.innerHTML = `
      <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
        <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
          ${state.user.name.charAt(0).toUpperCase()}
        </div>
        <div class="text-left hidden sm:block">
          <p class="font-semibold text-white leading-tight">${state.user.name}</p>
          <p class="text-[10px] text-emerald-400 font-mono capitalize">${state.user.role}</p>
        </div>
      </div>
      <button onclick="logout()" class="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-xl" title="Sign Out">
        <i data-lucide="log-out" class="w-4 h-4"></i>
      </button>
    `;
  } else {
    container.innerHTML = `
      <div class="hidden lg:flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button onclick="demoLogin('user')" class="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-emerald-400 rounded-lg hover:bg-slate-800 flex items-center gap-1">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-emerald-400"></i> Demo Driver
        </button>
        <span class="text-slate-700">|</span>
        <button onclick="demoLogin('admin')" class="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-amber-400 rounded-lg hover:bg-slate-800 flex items-center gap-1">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-amber-400"></i> Demo Admin
        </button>
      </div>
      <button onclick="navigateTo('auth')" class="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white">
        Log In
      </button>
      <button onclick="openRegister()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20">
        Register
      </button>
    `;
  }
  lucide.createIcons();
}

// ================= NAVIGATION ROUTER =================
function navigateTo(viewName) {
  state.currentView = viewName;
  window.location.hash = viewName;

  // Views list
  const views = ['home', 'explore', 'bookings', 'admin', 'auth'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
    const navBtn = document.getElementById(`nav-btn-${v}`);
    if (navBtn) {
      navBtn.classList.remove('bg-slate-800', 'text-emerald-400', 'text-amber-400');
      navBtn.classList.add('text-slate-300');
    }
  });

  const activeView = document.getElementById(`view-${viewName}`);
  if (activeView) activeView.classList.remove('hidden');

  const activeBtn = document.getElementById(`nav-btn-${viewName}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-300');
    if (viewName === 'admin') {
      activeBtn.classList.add('bg-amber-500/20', 'text-amber-300');
    } else {
      activeBtn.classList.add('bg-slate-800', 'text-emerald-400');
    }
  }

  // View-specific loaders
  if (viewName === 'explore') {
    initLeafletMap();
    renderExploreStations();
  } else if (viewName === 'bookings') {
    loadUserBookings();
  } else if (viewName === 'admin') {
    if (!state.user || state.user.role !== 'admin') {
      alert('Administrator credentials required. Logging into Demo Admin.');
      demoLogin('admin');
      return;
    }
    loadAdminData();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

// ================= DATA LOADERS =================
async function loadInitialData() {
  try {
    const [stRes, mRes] = await Promise.all([
      fetch(`${API_BASE}/stations`).then(r => r.json()),
      fetch(`${API_BASE}/admin/metrics`).then(r => r.json()).catch(() => ({}))
    ]);

    if (stRes.success) {
      state.stations = stRes.stations || [];
      renderFeaturedStations();
    }

    const metrics = mRes.metrics || {
      totalKwh: 1240,
      sdgImpact: { co2SavedKg: 1016.8, treesEquivalent: 47, greenKmPowered: 8432 }
    };
    renderSDGWidget(metrics);
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

// ================= HOME VIEW RENDERING =================
function renderFeaturedStations() {
  const container = document.getElementById('home-featured-stations');
  if (!container) return;

  const featured = state.stations.slice(0, 4);
  container.innerHTML = featured.map(st => createStationCardHtml(st)).join('');
  lucide.createIcons();
}

function renderSDGWidget(metrics) {
  const container = document.getElementById('home-sdg-widget');
  if (!container) return;

  const co2 = metrics.sdgImpact?.co2SavedKg || (metrics.totalKwh * 0.82).toFixed(1);
  const trees = metrics.sdgImpact?.treesEquivalent || Math.max(1, Math.round(co2 / 21.77));
  const km = metrics.sdgImpact?.greenKmPowered || Math.round((metrics.totalKwh || 1240) * 6.8);
  const kwh = metrics.totalKwh || 1240;

  container.innerHTML = `
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Live Sustainability Metrics
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Environmental & SDG Impact</h2>
          <p class="text-xs text-slate-400 mt-1">Direct contribution to UN Sustainable Development Goals (SDG 7, 9 & 11)</p>
        </div>
        <div class="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Network Telemetry
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-slate-900/80 backdrop-blur border border-emerald-500/20 rounded-2xl p-5">
          <p class="text-xs font-semibold text-slate-400 uppercase">CO₂ Emissions Offset</p>
          <p class="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">${Number(co2).toLocaleString()} <span class="text-sm font-medium text-emerald-400">kg</span></p>
          <p class="text-[11px] text-slate-500 mt-1.5">Direct reduction vs ICE cars</p>
        </div>
        <div class="bg-slate-900/80 backdrop-blur border border-emerald-500/20 rounded-2xl p-5">
          <p class="text-xs font-semibold text-slate-400 uppercase">Trees Equivalent</p>
          <p class="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">${trees} <span class="text-sm font-medium text-green-400">Trees/Yr</span></p>
          <p class="text-[11px] text-slate-500 mt-1.5">Annual biological carbon capture</p>
        </div>
        <div class="bg-slate-900/80 backdrop-blur border border-cyan-500/20 rounded-2xl p-5">
          <p class="text-xs font-semibold text-slate-400 uppercase">Zero-Emission Range</p>
          <p class="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">${km.toLocaleString()} <span class="text-sm font-medium text-cyan-400">km</span></p>
          <p class="text-[11px] text-slate-500 mt-1.5">Clean urban distance facilitated</p>
        </div>
        <div class="bg-slate-900/80 backdrop-blur border border-amber-500/20 rounded-2xl p-5">
          <p class="text-xs font-semibold text-slate-400 uppercase">Clean Energy Dispensed</p>
          <p class="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">${Number(kwh).toLocaleString()} <span class="text-sm font-medium text-amber-400">kWh</span></p>
          <p class="text-[11px] text-slate-500 mt-1.5">Grid & renewable optimized</p>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function handleHeroSearch(e) {
  e.preventDefault();
  const query = document.getElementById('hero-search-input').value.trim();
  navigateTo('explore');
  document.getElementById('explore-search-input').value = query;
  handleExploreFilterChange();
}

function quickFilterCity(cityName) {
  navigateTo('explore');
  document.getElementById('explore-city-select').value = cityName;
  handleExploreFilterChange();
}

// ================= STATION CARD HTML HELPER =================
function createStationCardHtml(station) {
  const isOnline = station.status === 'active';
  const connectors = Array.isArray(station.connector_types) ? station.connector_types : (station.connector_types ? station.connector_types.split(',') : []);

  return `
    <div class="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between">
      <div class="relative h-44 w-full overflow-hidden bg-slate-950">
        <img src="${station.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80'}" alt="${station.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" loading="lazy"/>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40"></div>

        <div class="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-emerald-500/30 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-400">
          <i data-lucide="zap" class="w-3.5 h-3.5 fill-emerald-400 text-emerald-400"></i>
          ${station.power_kw} kW Fast
        </div>

        <div class="absolute top-3 right-3">
          ${isOnline ? `
            <span class="flex items-center gap-1.5 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online
            </span>
          ` : `
            <span class="bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">Maintenance</span>
          `}
        </div>

        <div class="absolute bottom-3 left-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 border border-slate-800">
          <i data-lucide="star" class="w-3.5 h-3.5 text-amber-400 fill-amber-400"></i>
          <span class="font-bold text-white">${station.avg_rating || '4.8'}</span>
        </div>
      </div>

      <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 class="font-bold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1">${station.name}</h3>
          <p class="text-xs text-slate-400 flex items-center gap-1 mt-1 line-clamp-1">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-500 shrink-0"></i>
            ${station.address}, ${station.city}
          </p>

          <div class="flex flex-wrap gap-1.5 mt-3">
            ${connectors.map(c => `<span class="text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-md">${c}</span>`).join('')}
          </div>
        </div>

        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] text-slate-400 uppercase font-semibold">Tariff</p>
            <p class="text-base font-extrabold text-white font-mono">₹${station.price_per_kwh} <span class="text-xs font-normal text-slate-400">/ kWh</span></p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="centerMapOnStation(${station.id})" class="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl">View</button>
            <button onclick="openSlotPickerModal(${station.id})" class="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-95">
              Book Slot <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ================= EXPLORE MAP & STATIONS VIEW =================
function initLeafletMap() {
  if (state.map) {
    setTimeout(() => state.map.invalidateSize(), 100);
    return;
  }

  const mapContainer = document.getElementById('leaflet-map');
  if (!mapContainer) return;

  state.map = L.map('leaflet-map').setView([28.6139, 77.2090], 11);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19
  }).addTo(state.map);

  renderMapMarkers();
}

function renderMapMarkers() {
  if (!state.map) return;

  // Clear existing
  state.markers.forEach(m => state.map.removeLayer(m));
  state.markers = [];

  state.stations.forEach(st => {
    const isFast = st.power_kw >= 100;
    const bgClass = isFast ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-teal-600 shadow-teal-500/40';

    const customIcon = L.divIcon({
      className: 'custom-ev-marker',
      html: `
        <div class="w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-slate-950 font-bold border-2 border-slate-950 shadow-lg cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h8l-1 8 11-13h-8l1-7z"/></svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });

    const marker = L.marker([st.latitude, st.longitude], { icon: customIcon }).addTo(state.map);

    marker.bindPopup(`
      <div class="p-1 space-y-2 max-w-[220px]">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">⚡ ${st.power_kw} kW</span>
          <span class="text-xs font-bold text-white">₹${st.price_per_kwh}/kWh</span>
        </div>
        <h4 class="font-bold text-sm text-white leading-tight">${st.name}</h4>
        <p class="text-[11px] text-slate-300">${st.address}, ${st.city}</p>
        <button onclick="openSlotPickerModal(${st.id})" class="w-full mt-2 py-1.5 px-3 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1">
          Reserve Slot →
        </button>
      </div>
    `);

    state.markers.push(marker);
  });
}

function centerMapOnStation(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (!station || !state.map) return;
  state.map.flyTo([station.latitude, station.longitude], 14, { duration: 1.2 });
}

function handleExploreFilterChange() {
  renderExploreStations();
}

function renderExploreStations() {
  const container = document.getElementById('explore-stations-list');
  const countLabel = document.getElementById('explore-station-count-label');
  if (!container) return;

  const city = document.getElementById('explore-city-select')?.value || 'All';
  const connector = document.getElementById('explore-connector-select')?.value || 'All';
  const minPower = Number(document.getElementById('explore-power-select')?.value || 0);
  const search = document.getElementById('explore-search-input')?.value.toLowerCase().trim() || '';

  const filtered = state.stations.filter(st => {
    if (city !== 'All' && st.city.toLowerCase() !== city.toLowerCase()) return false;
    if (connector !== 'All' && !st.connector_types?.includes(connector)) return false;
    if (minPower > 0 && st.power_kw < minPower) return false;
    if (search && !(st.name.toLowerCase().includes(search) || st.address.toLowerCase().includes(search) || st.city.toLowerCase().includes(search))) return false;
    return true;
  });

  if (countLabel) countLabel.innerText = `Showing ${filtered.length} of ${state.stations.length} stations`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
        <i data-lucide="zap" class="w-8 h-8 text-slate-600 mx-auto"></i>
        <p class="text-sm font-semibold text-slate-300">No stations match your filters</p>
        <button onclick="resetExploreFilters()" class="px-4 py-2 bg-slate-800 text-xs text-emerald-400 rounded-xl font-bold">Reset Filters</button>
      </div>
    `;
  } else {
    container.innerHTML = filtered.map(st => createStationCardHtml(st)).join('');
  }
  lucide.createIcons();
}

function resetExploreFilters() {
  document.getElementById('explore-city-select').value = 'All';
  document.getElementById('explore-connector-select').value = 'All';
  document.getElementById('explore-power-select').value = '0';
  document.getElementById('explore-search-input').value = '';
  renderExploreStations();
}

// ================= SLOT PICKER MODAL =================
async function openSlotPickerModal(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (!station) return;
  state.selectedStation = station;
  state.selectedSlot = null;

  document.getElementById('slot-modal-station-name').innerText = station.name;
  document.getElementById('slot-modal-station-address').innerText = `${station.address}, ${station.city}`;
  document.getElementById('slot-modal-power-badge').innerText = `⚡ ${station.power_kw} kW Fast`;
  document.getElementById('slot-modal-rate-badge').innerText = `₹${station.price_per_kwh}/kWh`;

  // Render Date Pills
  const datePillsContainer = document.getElementById('slot-modal-date-pills');
  const availableDates = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    availableDates.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      display: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }

  datePillsContainer.innerHTML = availableDates.map(d => `
    <button onclick="setSlotModalDate('${d.dateStr}')" id="date-pill-${d.dateStr}" class="p-2 rounded-xl border text-center transition-all ${state.selectedDate === d.dateStr ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'bg-slate-950 border-slate-800 text-slate-300'}">
      <p class="text-[10px] font-medium opacity-90">${d.dayName}</p>
      <p class="text-xs font-bold mt-0.5">${d.display}</p>
    </button>
  `).join('');

  // Render Connector plugs
  const connectors = Array.isArray(station.connector_types) ? station.connector_types : (station.connector_types ? station.connector_types.split(',') : ['CCS2']);
  state.selectedConnector = connectors[0] || 'CCS2';
  document.getElementById('slot-modal-connector-options').innerHTML = connectors.map(c => `
    <button onclick="setSlotConnector('${c}')" id="connector-btn-${c}" class="px-3 py-1.5 rounded-xl text-xs font-semibold border ${state.selectedConnector === c ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}">
      🔌 ${c}
    </button>
  `).join('');

  updateSlotPriceCalc();
  await loadModalSlots();
  openModal('modal-slot-picker');
}

function setSlotModalDate(dateStr) {
  state.selectedDate = dateStr;
  document.querySelectorAll('[id^="date-pill-"]').forEach(el => {
    el.className = 'p-2 rounded-xl border text-center transition-all bg-slate-950 border-slate-800 text-slate-300';
  });
  const selectedPill = document.getElementById(`date-pill-${dateStr}`);
  if (selectedPill) selectedPill.className = 'p-2 rounded-xl border text-center transition-all bg-emerald-500 border-emerald-400 text-slate-950 font-bold';
  loadModalSlots();
}

function setSlotConnector(c) {
  state.selectedConnector = c;
  document.querySelectorAll('[id^="connector-btn-"]').forEach(el => {
    el.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold border bg-slate-950 border-slate-800 text-slate-400';
  });
  const btn = document.getElementById(`connector-btn-${c}`);
  if (btn) btn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold border bg-emerald-500/20 border-emerald-500 text-emerald-300';
}

async function loadModalSlots() {
  const container = document.getElementById('slot-modal-slots-grid');
  if (!container || !state.selectedStation) return;

  container.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400">Loading available slots...</div>';

  try {
    const res = await fetch(`${API_BASE}/slots/station/${state.selectedStation.id}?date=${state.selectedDate}`);
    const data = await res.json();
    if (data.success) {
      const slots = data.slots || [];
      container.innerHTML = slots.map(sl => {
        const isAvail = sl.status === 'available';
        const isSelected = state.selectedSlot?.id === sl.id;
        return `
          <button
            ${!isAvail ? 'disabled' : ''}
            onclick="selectModalSlot(${sl.id}, ${sl.slot_number}, '${sl.start_time}', '${sl.end_time}')"
            id="slot-card-${sl.id}"
            class="p-2.5 rounded-xl border text-left text-xs transition-all ${
              isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' :
              isAvail ? 'bg-slate-950 border-slate-800 text-slate-200 hover:border-emerald-500/40' :
              'bg-slate-950/40 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
            }"
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold">${sl.start_time} - ${sl.end_time}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-slate-950 text-cyan-400' : isAvail ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}">Slot ${sl.slot_number}</span>
            </div>
          </button>
        `;
      }).join('');
    }
  } catch (err) {
    container.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-rose-400">Failed to load slots.</div>';
  }
}

function selectModalSlot(id, slotNumber, startTime, endTime) {
  state.selectedSlot = { id, slotNumber, startTime, endTime };
  document.querySelectorAll('[id^="slot-card-"]').forEach(el => {
    if (!el.disabled) el.className = 'p-2.5 rounded-xl border text-left text-xs transition-all bg-slate-950 border-slate-800 text-slate-200 hover:border-emerald-500/40';
  });
  const active = document.getElementById(`slot-card-${id}`);
  if (active) active.className = 'p-2.5 rounded-xl border text-left text-xs transition-all bg-cyan-500 border-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20';

  document.getElementById('slot-modal-selected-summary').innerHTML = `
    <span class="text-emerald-400 font-bold">✓ Slot #${slotNumber} (${startTime} - ${endTime}) Selected</span>
  `;
}

function updateSlotPriceCalc() {
  const kwh = parseInt(document.getElementById('slot-modal-kwh-slider')?.value || 25);
  state.estimatedKwh = kwh;
  document.getElementById('slot-modal-kwh-val').innerText = `${kwh} kWh`;

  const rate = state.selectedStation?.price_per_kwh || 16.5;
  const energyCost = kwh * rate;
  const serviceFee = 15.00;
  const total = energyCost + serviceFee;

  document.getElementById('slot-modal-price-calc-label').innerText = `Energy Charge (${kwh} kWh × ₹${rate})`;
  document.getElementById('slot-modal-energy-cost').innerText = `₹${energyCost.toFixed(2)}`;
  document.getElementById('slot-modal-total-amount').innerText = `₹${total.toFixed(2)}`;
}

function handleProceedToCheckout() {
  if (!state.selectedSlot) {
    alert('Please select an available charging time slot first.');
    return;
  }

  const rate = state.selectedStation.price_per_kwh || 16.5;
  const total = (state.estimatedKwh * rate) + 15.00;
  const vehicle = document.getElementById('slot-modal-vehicle-input').value.trim() || 'DL-01-EV-2026';

  state.currentBookingDraft = {
    station: state.selectedStation,
    slot: state.selectedSlot,
    date: state.selectedDate,
    connectorType: state.selectedConnector,
    estimatedKwh: state.estimatedKwh,
    vehicleNumber: vehicle,
    totalAmount: total
  };

  closeModal('modal-slot-picker');
  openPaymentModal();
}

// ================= PAYMENT SIMULATION MODAL =================
function openPaymentModal() {
  if (!state.currentBookingDraft) return;

  const draft = state.currentBookingDraft;
  document.getElementById('payment-summary-station').innerText = draft.station.name;
  document.getElementById('payment-summary-slot').innerText = `Slot #${draft.slot.slotNumber} • ${draft.slot.startTime} - ${draft.slot.endTime} • ${draft.connectorType}`;
  document.getElementById('payment-summary-total').innerText = `₹${draft.totalAmount.toFixed(2)}`;

  // Reset payment state
  document.getElementById('payment-processing-state').classList.add('hidden');
  document.getElementById('payment-form-body').classList.remove('hidden');
  document.getElementById('payment-error-msg').classList.add('hidden');

  setPaymentMethod('card');
  openModal('modal-payment');
}

function setPaymentMethod(method) {
  ['card', 'upi', 'netbanking'].forEach(m => {
    document.getElementById(`pm-${m}-section`).classList.add('hidden');
    const tab = document.getElementById(`pmtab-${m}`);
    if (tab) tab.className = 'flex-1 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white';
  });

  document.getElementById(`pm-${method}-section`).classList.remove('hidden');
  const activeTab = document.getElementById(`pmtab-${method}`);
  if (activeTab) activeTab.className = 'flex-1 py-2 rounded-lg text-xs font-bold bg-slate-800 text-emerald-400';

  if (method === 'netbanking') {
    const banks = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank'];
    document.getElementById('netbanking-bank-pills').innerHTML = banks.map((b, i) => `
      <button type="button" class="p-2 rounded-xl border text-xs text-left ${i === 0 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}">
        🏦 ${b}
      </button>
    `).join('');
  }
}

function autofillPaymentDetails() {
  document.getElementById('pay-card-num').value = '4242 4242 4242 4242';
  document.getElementById('pay-card-exp').value = '08/29';
  document.getElementById('pay-card-cvv').value = '123';
  document.getElementById('pay-card-name').value = 'Abhinandan Sawraj';
  document.getElementById('pay-upi-id').value = 'aalam@oksbi';
}

function setUpiSuffix(suf) {
  const current = document.getElementById('pay-upi-id').value.split('@')[0] || 'driver';
  document.getElementById('pay-upi-id').value = current + suf;
}

async function executePaymentTransaction() {
  if (!state.token) {
    // Auto-login as demo user if not logged in
    await demoLogin('user');
  }

  const draft = state.currentBookingDraft;
  const processingState = document.getElementById('payment-processing-state');
  const formBody = document.getElementById('payment-form-body');
  const progressLabel = document.getElementById('payment-progress-label');

  formBody.classList.add('hidden');
  processingState.classList.remove('hidden');
  progressLabel.innerText = 'Connecting to Payment Gateway...';

  try {
    await new Promise(r => setTimeout(r, 600));
    progressLabel.innerText = 'Verifying 3D Secure Authorization...';

    await new Promise(r => setTimeout(r, 700));
    progressLabel.innerText = 'Executing Atomic Database Lock...';

    const txId = 'pay_rzp_' + Math.random().toString(36).substring(2, 12);

    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        station_id: draft.station.id,
        slot_id: draft.slot.id,
        vehicle_number: draft.vehicleNumber,
        connector_type: draft.connectorType,
        estimated_kwh: draft.estimatedKwh,
        payment_method: 'Card / Simulated Gateway',
        payment_id: txId
      })
    });

    const data = await res.json();

    if (data.success) {
      progressLabel.innerText = 'Booking & Pass Confirmed!';
      
      // Fire confetti
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}

      setTimeout(() => {
        closeModal('modal-payment');
        openReceiptModal(data.booking);
      }, 500);
    } else {
      throw new Error(data.message || 'Payment processing failed');
    }
  } catch (err) {
    formBody.classList.remove('hidden');
    processingState.classList.add('hidden');
    const errBox = document.getElementById('payment-error-msg');
    errBox.innerText = err.message;
    errBox.classList.remove('hidden');
  }
}

// ================= DIGITAL QR CHARGING PASS MODAL =================
function openReceiptModal(booking) {
  document.getElementById('receipt-booking-ref').innerText = booking.booking_ref;
  document.getElementById('receipt-station-name').innerText = booking.station_name;
  document.getElementById('receipt-station-address').innerText = booking.station_address || booking.station_city;
  document.getElementById('receipt-slot-num').innerText = booking.slot_number || booking.slot_id;
  document.getElementById('receipt-slot-badge').innerText = `Slot #${booking.slot_number || booking.slot_id} Reserved`;
  document.getElementById('receipt-date').innerText = booking.date;
  document.getElementById('receipt-time').innerText = `${booking.start_time} - ${booking.end_time}`;
  document.getElementById('receipt-vehicle').innerText = booking.vehicle_number || 'DL-01-EV-2026';
  document.getElementById('receipt-connector').innerText = `${booking.connector_type} Plug`;
  document.getElementById('receipt-amount').innerText = `₹${booking.total_amount?.toFixed(2)}`;
  document.getElementById('receipt-kwh').innerText = `~${booking.estimated_kwh || 25} kWh delivered`;

  // Draw QR Code on Canvas
  const qrCanvas = document.getElementById('receipt-qr-canvas');
  const qrString = booking.qr_code_data || JSON.stringify({
    ref: booking.booking_ref,
    slot: booking.slot_number,
    date: booking.date,
    time: `${booking.start_time} - ${booking.end_time}`
  });

  QRCode.toCanvas(qrCanvas, qrString, { width: 110, margin: 1 }, (err) => {
    if (err) console.error('QR render error:', err);
  });

  openModal('modal-receipt');
}

// ================= MY BOOKINGS VIEW =================
async function loadUserBookings() {
  if (!state.token) {
    navigateTo('auth');
    return;
  }

  const container = document.getElementById('user-bookings-container');
  const countLabel = document.getElementById('my-bookings-count-label');
  const driverInfo = document.getElementById('my-bookings-driver-info');
  if (!container) return;

  if (driverInfo && state.user) {
    driverInfo.innerHTML = `Driver: <strong class="text-slate-200">${state.user.name}</strong> • Vehicle: <strong class="text-emerald-400 font-mono">${state.user.vehicle_number || 'DL-01-EV-2026'}</strong>`;
  }

  container.innerHTML = '<div class="py-12 text-center text-xs text-slate-400">Loading your charging history...</div>';

  try {
    const res = await fetch(`${API_BASE}/bookings/my`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (data.success) {
      const allBookings = data.bookings || [];
      if (countLabel) countLabel.innerText = `(${allBookings.length} Sessions Recorded)`;

      const filtered = allBookings.filter(b => {
        if (state.bookingsTab === 'confirmed') return b.booking_status === 'confirmed';
        if (state.bookingsTab === 'completed') return b.booking_status === 'completed';
        if (state.bookingsTab === 'cancelled') return b.booking_status === 'cancelled';
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3 max-w-md mx-auto">
            <i data-lucide="calendar" class="w-12 h-12 text-slate-600 mx-auto"></i>
            <h3 class="text-base font-bold text-white">No Bookings in this Category</h3>
            <button onclick="navigateTo('explore')" class="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Explore Stations</button>
          </div>
        `;
      } else {
        container.innerHTML = filtered.map(b => {
          const isConfirmed = b.booking_status === 'confirmed';
          const isCompleted = b.booking_status === 'completed';

          return `
            <div class="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                  <i data-lucide="zap" class="w-6 h-6"></i>
                </div>
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">${b.booking_ref}</span>
                    ${isConfirmed ? `<span class="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">● ACTIVE & CONFIRMED</span>` : ''}
                    ${isCompleted ? `<span class="text-[11px] font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/40">✓ COMPLETED</span>` : ''}
                    ${b.booking_status === 'cancelled' ? `<span class="text-[11px] font-bold text-rose-400 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-500/40">CANCELLED</span>` : ''}
                  </div>
                  <h3 class="font-bold text-lg text-white">${b.station_name}</h3>
                  <p class="text-xs text-slate-400">${b.station_address || b.station_city}</p>
                  <div class="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                    <span>📅 ${b.date}</span>
                    <span>⏰ ${b.start_time} - ${b.end_time}</span>
                    <span class="font-mono text-emerald-400">Slot #${b.slot_number || b.slot_id}</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                <div class="text-left lg:text-right">
                  <p class="text-[10px] text-slate-400 uppercase font-semibold">Amount Paid</p>
                  <p class="text-xl font-extrabold text-white font-mono">₹${b.total_amount?.toFixed(2)}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button onclick='openReceiptModal(${JSON.stringify(b)})' class="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20">
                    <i data-lucide="qr-code" class="w-4 h-4"></i> View QR Pass
                  </button>
                  ${isConfirmed ? `
                    <button onclick="cancelUserBooking(${b.id})" class="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl">
                      Cancel
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
      lucide.createIcons();
    }
  } catch (err) {
    console.error('Error loading bookings:', err);
  }
}

function setBookingsTab(tabKey) {
  state.bookingsTab = tabKey;
  ['all', 'confirmed', 'completed', 'cancelled'].forEach(k => {
    const el = document.getElementById(`btab-${k}`);
    if (el) el.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-400 hover:text-white border border-slate-800';
  });
  const active = document.getElementById(`btab-${tabKey}`);
  if (active) active.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950';
  loadUserBookings();
}

async function cancelUserBooking(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking? The slot will be released and payment refunded.')) return;

  try {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) {
      alert('Booking cancelled successfully.');
      loadUserBookings();
    } else {
      alert(data.message || 'Failed to cancel');
    }
  } catch (e) {
    alert('Failed to cancel booking');
  }
}

// ================= ADMIN DASHBOARD =================
async function loadAdminData() {
  if (!state.token) return;

  try {
    const [mRes, sRes, bRes, uRes] = await Promise.all([
      fetch(`${API_BASE}/admin/metrics`, { headers: { 'Authorization': `Bearer ${state.token}` } }).then(r => r.json()),
      fetch(`${API_BASE}/stations`).then(r => r.json()),
      fetch(`${API_BASE}/bookings/admin/all`, { headers: { 'Authorization': `Bearer ${state.token}` } }).then(r => r.json()),
      fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': `Bearer ${state.token}` } }).then(r => r.json())
    ]);

    if (mRes.success) renderAdminKPIs(mRes.metrics);
    if (sRes.success) {
      state.stations = sRes.stations || [];
      renderAdminStationsTable();
      populateAdminSlotStationsDropdown();
    }
    if (bRes.success) renderAdminBookingsTable(bRes.bookings || []);
    if (uRes.success) renderAdminUsersTable(uRes.users || []);
  } catch (err) {
    console.error('Failed to load admin data:', err);
  }
}

function renderAdminKPIs(m) {
  const container = document.getElementById('admin-kpi-container');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p class="text-[11px] font-semibold text-slate-400 uppercase">Hubs</p>
      <p class="text-2xl font-extrabold text-white font-mono">${m.totalStations}</p>
      <span class="text-[10px] text-emerald-400">100% Online</span>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p class="text-[11px] font-semibold text-slate-400 uppercase">Total Slots</p>
      <p class="text-2xl font-extrabold text-white font-mono">${m.totalSlots}</p>
      <span class="text-[10px] text-cyan-400">Scheduled</span>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p class="text-[11px] font-semibold text-slate-400 uppercase">Sessions</p>
      <p class="text-2xl font-extrabold text-amber-400 font-mono">${m.totalBookings}</p>
      <span class="text-[10px] text-slate-400">${m.activeBookings || 0} active</span>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p class="text-[11px] font-semibold text-slate-400 uppercase">Revenue</p>
      <p class="text-2xl font-extrabold text-emerald-400 font-mono">₹${m.totalRevenue?.toLocaleString()}</p>
      <span class="text-[10px] text-emerald-400">Captured</span>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p class="text-[11px] font-semibold text-slate-400 uppercase">Delivered</p>
      <p class="text-2xl font-extrabold text-cyan-400 font-mono">${m.totalKwh} <span class="text-xs">kWh</span></p>
      <span class="text-[10px] text-slate-400">Zero Emission</span>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p class="text-[11px] font-semibold text-slate-400 uppercase">CO₂ Offset</p>
      <p class="text-2xl font-extrabold text-green-400 font-mono">${m.sdgImpact?.co2SavedKg} <span class="text-xs">kg</span></p>
      <span class="text-[10px] text-green-400 font-mono">SDG 7, 9, 11</span>
    </div>
  `;
}

function setAdminTab(tabKey) {
  state.adminTab = tabKey;
  ['stations', 'slots', 'bookings', 'users'].forEach(k => {
    document.getElementById(`admin-view-${k}`).classList.add('hidden');
    const tabBtn = document.getElementById(`atab-${k}`);
    if (tabBtn) tabBtn.className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-400 hover:text-white border border-slate-800';
  });

  document.getElementById(`admin-view-${tabKey}`).classList.remove('hidden');
  const activeTab = document.getElementById(`atab-${tabKey}`);
  if (activeTab) activeTab.className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950';

  if (tabKey === 'slots') loadAdminSlots();
  lucide.createIcons();
}

function renderAdminStationsTable() {
  const table = document.getElementById('admin-stations-table');
  if (!table) return;

  table.innerHTML = `
    <thead class="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
      <tr>
        <th class="p-4">Station</th>
        <th class="p-4">Location</th>
        <th class="p-4">Power / Rating</th>
        <th class="p-4">Tariff</th>
        <th class="p-4">Status</th>
        <th class="p-4 text-right">Actions</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800/80">
      ${state.stations.map(st => `
        <tr class="hover:bg-slate-800/40">
          <td class="p-4"><p class="font-bold text-white">${st.name}</p><p class="text-[11px] text-slate-500">${st.total_slots} Slots</p></td>
          <td class="p-4"><p>${st.city}, ${st.state}</p></td>
          <td class="p-4 font-mono font-bold text-amber-400">${st.power_kw} kW</td>
          <td class="p-4 font-mono font-bold text-emerald-400">₹${st.price_per_kwh}/kWh</td>
          <td class="p-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">${st.status}</span></td>
          <td class="p-4 text-right">
            <button onclick="deleteStation(${st.id})" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  `;
  lucide.createIcons();
}

function populateAdminSlotStationsDropdown() {
  const select = document.getElementById('admin-slot-station-select');
  const dateInput = document.getElementById('admin-slot-date-input');
  if (!select) return;

  select.innerHTML = state.stations.map(st => `<option value="${st.id}">${st.name} (${st.city})</option>`).join('');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

async function loadAdminSlots() {
  const select = document.getElementById('admin-slot-station-select');
  const dateInput = document.getElementById('admin-slot-date-input');
  const grid = document.getElementById('admin-slots-grid');
  if (!select || !grid) return;

  const stationId = select.value || state.stations[0]?.id;
  const date = dateInput?.value || new Date().toISOString().split('T')[0];

  grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400">Loading slots...</div>';

  try {
    const res = await fetch(`${API_BASE}/slots/station/${stationId}?date=${date}`);
    const data = await res.json();
    if (data.success) {
      const slots = data.slots || [];
      grid.innerHTML = slots.map(sl => {
        const isAvail = sl.status === 'available';
        const isBooked = sl.status === 'booked';
        return `
          <div class="p-4 rounded-2xl border text-xs space-y-2 ${isAvail ? 'bg-slate-900 border-emerald-500/30' : isBooked ? 'bg-slate-900/60 border-cyan-500/30' : 'bg-rose-950/30 border-rose-500/30'}">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white font-mono">Slot #${sl.slot_number}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${isAvail ? 'bg-emerald-500/20 text-emerald-300' : isBooked ? 'bg-cyan-500/20 text-cyan-300' : 'bg-rose-500/20 text-rose-300'}">${sl.status}</span>
            </div>
            <p class="text-slate-300 font-semibold">${sl.start_time} - ${sl.end_time}</p>
            ${!isBooked ? `
              <button onclick="toggleSlotStatus(${sl.id}, '${sl.status}')" class="w-full py-1.5 rounded-lg text-[10px] font-bold ${isAvail ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}">
                ${isAvail ? 'Mark Maintenance' : 'Set Available'}
              </button>
            ` : ''}
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-rose-400">Failed to load slots.</div>';
  }
}

async function toggleSlotStatus(slotId, currentStatus) {
  const nextStatus = currentStatus === 'available' ? 'maintenance' : 'available';
  try {
    const res = await fetch(`${API_BASE}/slots/${slotId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await res.json();
    if (data.success) loadAdminSlots();
  } catch (e) {
    alert('Failed to update slot status');
  }
}

function renderAdminBookingsTable(bookings) {
  const table = document.getElementById('admin-bookings-table');
  if (!table) return;

  table.innerHTML = `
    <thead class="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
      <tr>
        <th class="p-4">Reference / Driver</th>
        <th class="p-4">Station & Slot</th>
        <th class="p-4">Date & Time</th>
        <th class="p-4">Amount</th>
        <th class="p-4">Status</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800/80">
      ${bookings.map(b => `
        <tr class="hover:bg-slate-800/40">
          <td class="p-4"><p class="font-mono font-bold text-emerald-400">${b.booking_ref}</p><p class="text-white">${b.user_name}</p></td>
          <td class="p-4"><p class="font-bold text-white">${b.station_name}</p><span class="text-[10px] text-cyan-400">Slot #${b.slot_number}</span></td>
          <td class="p-4"><p class="text-white">${b.date}</p><p class="text-[11px] text-slate-400">${b.start_time} - ${b.end_time}</p></td>
          <td class="p-4 font-mono font-bold text-emerald-400">₹${b.total_amount?.toFixed(2)}</td>
          <td class="p-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.booking_status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'}">${b.booking_status}</span></td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

function renderAdminUsersTable(users) {
  const table = document.getElementById('admin-users-table');
  if (!table) return;

  table.innerHTML = `
    <thead class="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
      <tr>
        <th class="p-4">Driver Name / Email</th>
        <th class="p-4">Vehicle</th>
        <th class="p-4">Bookings</th>
        <th class="p-4">Role</th>
        <th class="p-4 text-right">Action</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800/80">
      ${users.map(u => `
        <tr class="hover:bg-slate-800/40">
          <td class="p-4"><p class="font-bold text-white">${u.name}</p><p class="text-[11px] text-slate-500">${u.email}</p></td>
          <td class="p-4 font-mono text-xs text-slate-300">${u.vehicle_number || '—'}</td>
          <td class="p-4 font-bold text-white">${u.total_bookings}</td>
          <td class="p-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'}">${u.role}</span></td>
          <td class="p-4 text-right">
            ${u.id !== state.user?.id ? `
              <button onclick="toggleUserRole(${u.id}, '${u.role}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300">
                Switch to ${u.role === 'admin' ? 'User' : 'Admin'}
              </button>
            ` : ''}
          </td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

async function toggleUserRole(userId, currentRole) {
  const nextRole = currentRole === 'admin' ? 'user' : 'admin';
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ role: nextRole })
    });
    const data = await res.json();
    if (data.success) loadAdminData();
  } catch (e) {
    alert('Failed to update role');
  }
}

function openStationModal() {
  document.getElementById('stform-name').value = '';
  document.getElementById('stform-city').value = 'New Delhi';
  document.getElementById('stform-address').value = '';
  document.getElementById('stform-lat').value = 28.5562;
  document.getElementById('stform-lng').value = 77.1000;
  document.getElementById('stform-power').value = 60;
  document.getElementById('stform-price').value = 16.5;
  document.getElementById('stform-slots').value = 4;
  openModal('modal-station-form');
}

async function handleSaveStationForm(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('stform-name').value,
    city: document.getElementById('stform-city').value,
    address: document.getElementById('stform-address').value,
    latitude: parseFloat(document.getElementById('stform-lat').value),
    longitude: parseFloat(document.getElementById('stform-lng').value),
    power_kw: parseFloat(document.getElementById('stform-power').value),
    price_per_kwh: parseFloat(document.getElementById('stform-price').value),
    total_slots: parseInt(document.getElementById('stform-slots').value),
    connector_types: 'CCS2,Type 2',
    image_url: document.getElementById('stform-img').value || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80'
  };

  try {
    const res = await fetch(`${API_BASE}/stations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-station-form');
      alert('Station created & slots initialized successfully!');
      loadAdminData();
    } else {
      alert(data.message || 'Failed to create station');
    }
  } catch (err) {
    alert('Failed to save station');
  }
}

async function deleteStation(stationId) {
  if (!confirm('Are you sure you want to delete this charging station?')) return;
  try {
    const res = await fetch(`${API_BASE}/stations/${stationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) loadAdminData();
  } catch (e) {
    alert('Failed to delete');
  }
}

// ================= AUTHENTICATION LOGIC =================
function openRegister() {
  state.authMode = 'register';
  document.getElementById('auth-title').innerText = 'Register Driver Account';
  document.getElementById('auth-subtitle').innerText = 'Join VoltPoint Clean Mobility Network';
  document.getElementById('auth-name-field').classList.remove('hidden');
  document.getElementById('auth-vehicle-fields').classList.remove('hidden');
  document.getElementById('auth-submit-btn').innerText = 'Create Account';
  document.getElementById('auth-toggle-prompt').innerText = 'Already have an account?';
  document.getElementById('auth-toggle-btn').innerText = 'Sign In';
  navigateTo('auth');
}

function toggleAuthMode() {
  if (state.authMode === 'login') {
    openRegister();
  } else {
    state.authMode = 'login';
    document.getElementById('auth-title').innerText = 'Log in to VoltPoint';
    document.getElementById('auth-subtitle').innerText = 'Access your charging passes & reservations';
    document.getElementById('auth-name-field').classList.add('hidden');
    document.getElementById('auth-vehicle-fields').classList.add('hidden');
    document.getElementById('auth-submit-btn').innerText = 'Sign In';
    document.getElementById('auth-toggle-prompt').innerText = "Don't have an account?";
    document.getElementById('auth-toggle-btn').innerText = 'Register Free';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-input-email').value;
  const password = document.getElementById('auth-input-password').value;
  const errorBox = document.getElementById('auth-error-msg');
  errorBox.classList.add('hidden');

  try {
    let endpoint = `${API_BASE}/auth/login`;
    let body = { email, password };

    if (state.authMode === 'register') {
      endpoint = `${API_BASE}/auth/register`;
      body = {
        name: document.getElementById('auth-input-name').value,
        email,
        password,
        vehicle_model: document.getElementById('auth-input-vehicle-model').value,
        vehicle_number: document.getElementById('auth-input-vehicle-number').value
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('ev_token', data.token);
      renderAuthHeader();
      navigateTo('explore');
    } else {
      errorBox.innerText = data.message || 'Authentication failed';
      errorBox.classList.remove('hidden');
    }
  } catch (err) {
    errorBox.innerText = 'Network error during login';
    errorBox.classList.remove('hidden');
  }
}

async function demoLogin(role = 'user') {
  const email = role === 'admin' ? 'admin@evcharge.com' : 'user@evcharge.com';
  const password = role === 'admin' ? 'Admin@123' : 'User@123';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('ev_token', data.token);
      renderAuthHeader();
      if (role === 'admin') {
        navigateTo('admin');
      } else {
        navigateTo('explore');
      }
    }
  } catch (e) {
    alert('Demo login failed');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('ev_token');
  renderAuthHeader();
  navigateTo('home');
}

// ================= MODAL HELPERS =================
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
  lucide.createIcons();
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}
