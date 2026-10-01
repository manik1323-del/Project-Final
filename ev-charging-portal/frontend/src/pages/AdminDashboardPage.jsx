import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Zap, 
  MapPin, 
  Calendar, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Leaf, 
  Trees, 
  Compass, 
  RefreshCw, 
  Search,
  X,
  ShieldCheck,
  Power
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardPage() {
  const { user, isAdmin, isStationOwner } = useAuth();
  const [activeTab, setActiveTab] = useState('stations');
  const [metrics, setMetrics] = useState(null);
  const [stations, setStations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Station Modal States
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [stationForm, setStationForm] = useState({
    name: '',
    address: '',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.5562,
    longitude: 77.1000,
    connector_types: ['CCS2', 'Type 2'],
    power_kw: 60,
    price_per_kwh: 16.5,
    total_slots: 4,
    amenities: ['WiFi', 'Restroom', 'Cafe'],
    image_url: '',
    status: 'active'
  });

  // Slot Management Station & Date selector
  const [slotStationId, setSlotStationId] = useState('');
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotsList, setSlotsList] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const apiCalls = [
        api.get('/stations'),
        api.get('/bookings/admin/all')
      ];
      // Admin-only endpoints
      if (isAdmin) {
        apiCalls.push(api.get('/admin/metrics'));
        apiCalls.push(api.get('/admin/users'));
      }
      const [sRes, bRes, mRes, uRes] = await Promise.all(apiCalls);

      if (sRes.data.success) {
        const allStations = sRes.data.stations || [];
        // Station owners only see their own stations
        const filteredStations = isStationOwner
          ? allStations.filter(s => s.owner_id === user?.id)
          : allStations;
        setStations(filteredStations);
        if (filteredStations.length > 0 && !slotStationId) {
          setSlotStationId(filteredStations[0].id);
        }
      }
      if (bRes.data.success) setBookings(bRes.data.bookings || []);
      if (mRes?.data?.success) setMetrics(mRes.data.metrics);
      if (uRes?.data?.success) setUsersList(uRes.data.users || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch slots for Slot Management tab
  useEffect(() => {
    if (slotStationId && activeTab === 'slots') {
      fetchStationSlots();
    }
  }, [slotStationId, slotDate, activeTab]);

  const fetchStationSlots = async () => {
    try {
      setLoadingSlots(true);
      const res = await api.get(`/slots/station/${slotStationId}?date=${slotDate}`);
      if (res.data.success) {
        setSlotsList(res.data.slots || []);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleToggleSlotStatus = async (slotId, currentStatus) => {
    const nextStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    try {
      const res = await api.put(`/slots/${slotId}/status`, { status: nextStatus });
      if (res.data.success) {
        fetchStationSlots();
        setActionMessage({ type: 'success', text: `Slot status switched to ${nextStatus}` });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to update slot status' });
    }
  };

  const openAddStationModal = () => {
    setEditingStation(null);
    setStationForm({
      name: '',
      address: '',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.5562,
      longitude: 77.1000,
      connector_types: ['CCS2', 'Type 2'],
      power_kw: 60,
      price_per_kwh: 16.5,
      total_slots: 4,
      amenities: ['WiFi', 'Restroom', 'Cafe'],
      image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
      status: 'active'
    });
    setIsStationModalOpen(true);
  };

  const openEditStationModal = (st) => {
    setEditingStation(st);
    setStationForm({
      name: st.name,
      address: st.address,
      city: st.city,
      state: st.state,
      latitude: st.latitude,
      longitude: st.longitude,
      connector_types: st.connector_types || ['CCS2'],
      power_kw: st.power_kw,
      price_per_kwh: st.price_per_kwh,
      total_slots: st.total_slots,
      amenities: st.amenities || ['WiFi'],
      image_url: st.image_url,
      status: st.status
    });
    setIsStationModalOpen(true);
  };

  const handleSaveStation = async (e) => {
    e.preventDefault();
    try {
      if (editingStation) {
        await api.put(`/stations/${editingStation.id}`, stationForm);
        setActionMessage({ type: 'success', text: 'Station updated successfully!' });
      } else {
        await api.post('/stations', stationForm);
        setActionMessage({ type: 'success', text: 'Station created & slots initialized!' });
      }
      setIsStationModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save station' });
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (!window.confirm('Are you sure you want to delete this charging station and its slot data?')) return;
    try {
      await api.delete(`/stations/${stationId}`);
      setActionMessage({ type: 'success', text: 'Station removed successfully.' });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to delete station' });
    }
  };

  const handleToggleUserRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.put(`/admin/users/${userId}/role`, { role: nextRole });
      setActionMessage({ type: 'success', text: `User role changed to ${nextRole}` });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to update user role' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className={`bg-gradient-to-r ${
        isAdmin
          ? 'from-amber-950/40 via-slate-900 to-emerald-950/40 border-amber-500/30'
          : 'from-blue-950/40 via-slate-900 to-emerald-950/40 border-blue-500/30'
      } border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold ${
            isAdmin ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
          }`}>
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isAdmin
                  ? 'text-amber-400 bg-amber-950/60 border-amber-500/30'
                  : 'text-blue-400 bg-blue-950/60 border-blue-500/30'
              }`}>
                {isAdmin ? 'Administrator Control Center' : 'Station Owner Portal'}
              </span>
              <span className="text-xs text-slate-400 font-mono">Live Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {isAdmin ? 'EV Network Operations & Analytics' : `Welcome back, ${user?.name?.split(' ')[0]}`}
            </h1>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Manage stations, override slot allocations, review transactions, and track SDG impact metrics.'
                : 'Manage your charging stations, monitor slot availability, and review your station bookings.'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-2xl transition-colors flex items-center gap-2 text-xs font-bold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isAdmin ? 'text-amber-400' : 'text-blue-400'}`} />
          Sync Dashboard
        </button>
      </div>

      {actionMessage.text && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
          actionMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage({ type: '', text: '' })} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Stations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Hubs Active</p>
          <p className="text-2xl font-extrabold text-white font-mono">{metrics?.totalStations || stations.length}</p>
          <span className="text-[10px] text-emerald-400 font-mono">100% Online</span>
        </div>

        {/* Total Slots */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Slots</p>
          <p className="text-2xl font-extrabold text-white font-mono">{metrics?.totalSlots || 0}</p>
          <span className="text-[10px] text-cyan-400 font-mono">Scheduled</span>
        </div>

        {/* Bookings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Sessions</p>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">{metrics?.totalBookings || bookings.length}</p>
          <span className="text-[10px] text-slate-400">{metrics?.activeBookings || 0} active now</span>
        </div>

        {/* Total Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Revenue (₹)</p>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">₹{metrics?.totalRevenue?.toLocaleString() || '0'}</p>
          <span className="text-[10px] text-emerald-400">Captured</span>
        </div>

        {/* Clean Energy kWh */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Energy Delivered</p>
          <p className="text-2xl font-extrabold text-cyan-400 font-mono">{metrics?.totalKwh || 0} <span className="text-xs">kWh</span></p>
          <span className="text-[10px] text-slate-400">Zero Emission</span>
        </div>

        {/* CO2 Saved */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">CO₂ Offset</p>
          <p className="text-2xl font-extrabold text-green-400 font-mono">{metrics?.sdgImpact?.co2SavedKg || 0} <span className="text-xs">kg</span></p>
          <span className="text-[10px] text-green-400 font-mono">SDG 7, 9, 11</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { key: 'stations', label: `${isAdmin ? 'All Stations' : 'My Stations'} (${stations.length})`, icon: MapPin },
          { key: 'slots', label: 'Live Slot Controller', icon: Power },
          { key: 'bookings', label: `${isAdmin ? 'Network Bookings' : 'Station Bookings'} (${bookings.length})`, icon: Calendar },
          // Users tab is admin-only
          ...(isAdmin ? [{ key: 'users', label: `Users & Drivers (${usersList.length})`, icon: Users }] : [])
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? isAdmin
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Stations Management */}
      {activeTab === 'stations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {isAdmin ? 'Charging Station Infrastructure' : 'My Charging Stations'}
            </h2>
            <button
              onClick={openAddStationModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Charging Station
            </button>
          </div>

          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">Station Details</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Rating / Power</th>
                  <th className="p-4">Connectors</th>
                  <th className="p-4">Tariff</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {stations.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white">{st.name}</p>
                      <p className="text-[11px] text-slate-500">{st.total_slots} Slots Available</p>
                    </td>
                    <td className="p-4">
                      <p>{st.city}, {st.state}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-amber-400 font-mono">{st.power_kw} kW</span>
                      <p className="text-[11px] text-slate-500">★ {st.avg_rating || '4.8'}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {st.connector_types?.map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      ₹{st.price_per_kwh}/kWh
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        st.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {/* Owners can only edit/delete their own stations; admins can edit all */}
                      {(isAdmin || st.owner_id === user?.id) ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditStationModal(st)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Edit Station"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStation(st.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300"
                            title="Delete Station"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Live Slot Status Controller */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Live Slot Maintenance Override</h2>
              <p className="text-xs text-slate-400">Select station and date to inspect or manually toggle slot status</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={slotStationId}
                onChange={(e) => setSlotStationId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                {stations.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.city})</option>
                ))}
              </select>

              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {loadingSlots ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading station slots...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {slotsList.map((slot) => {
                const isAvail = slot.status === 'available';
                const isBooked = slot.status === 'booked';
                const isMaint = slot.status === 'maintenance';

                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                      isAvail
                        ? 'bg-slate-900 border-emerald-500/30'
                        : isBooked
                        ? 'bg-slate-900/60 border-cyan-500/30'
                        : 'bg-rose-950/30 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">Slot #{slot.slot_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        isAvail
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isBooked
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {slot.status}
                      </span>
                    </div>

                    <p className="text-slate-300 font-semibold">{slot.start_time} - {slot.end_time}</p>

                    {slot.booked_by_name && (
                      <p className="text-[11px] text-slate-400">
                        User: <strong className="text-slate-200">{slot.booked_by_name}</strong>
                      </p>
                    )}

                    {!isBooked && (
                      <button
                        onClick={() => handleToggleSlotStatus(slot.id, slot.status)}
                        className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                          isAvail
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isAvail ? 'Mark Maintenance' : 'Set Available'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: All Network Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">All Platform Reservations</h2>
            <span className="text-xs text-slate-400 font-mono">{bookings.length} Total Bookings</span>
          </div>

          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">Reference / Driver</th>
                  <th className="p-4">Station & Slot</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Energy / Tariff</th>
                  <th className="p-4">Payment / Ref</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-mono font-bold text-emerald-400">{b.booking_ref}</p>
                      <p className="text-white font-medium">{b.user_name}</p>
                      <p className="text-[10px] text-slate-500">{b.user_email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-white">{b.station_name}</p>
                      <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">
                        Slot #{b.slot_number} • {b.connector_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-white">{b.date}</p>
                      <p className="text-[11px] text-slate-400">{b.start_time} - {b.end_time}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-mono font-bold text-white">₹{b.total_amount?.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-500">~{b.estimated_kwh} kWh</p>
                    </td>
                    <td className="p-4">
                      <p className="text-[11px] text-slate-300 font-mono">{b.payment_id}</p>
                      <p className="text-[10px] text-slate-500">{b.payment_method}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.booking_status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : b.booking_status === 'completed'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {b.booking_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Users Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Registered Users & Administrators</h2>
            <span className="text-xs text-slate-400 font-mono">{usersList.length} Total Users</span>
          </div>

          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">User Name / Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Vehicle Details</th>
                  <th className="p-4">Total Bookings</th>
                  <th className="p-4">Total Spent</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Toggle Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                    </td>
                    <td className="p-4 text-slate-400">
                      {u.phone || '—'}
                    </td>
                    <td className="p-4">
                      <p className="text-slate-200">{u.vehicle_model || 'Standard EV'}</p>
                      <p className="text-[10px] font-mono text-emerald-400">{u.vehicle_number || '—'}</p>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">
                      {u.total_bookings}
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      ₹{u.total_spent?.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleUserRole(u.id, u.role)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300"
                        >
                          Switch to {u.role === 'admin' ? 'User' : 'Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Station Modal (Add/Edit) */}
      {isStationModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">
                {editingStation ? 'Edit Charging Station' : 'Create New Charging Station'}
              </h3>
              <button
                onClick={() => setIsStationModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Station Name *</label>
                  <input
                    type="text"
                    required
                    value={stationForm.name}
                    onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={stationForm.city}
                    onChange={(e) => setStationForm({ ...stationForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Address / Landmark *</label>
                <input
                  type="text"
                  required
                  value={stationForm.address}
                  onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Latitude Coordinate *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stationForm.latitude}
                    onChange={(e) => setStationForm({ ...stationForm, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Longitude Coordinate *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stationForm.longitude}
                    onChange={(e) => setStationForm({ ...stationForm, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Power Rating (kW)</label>
                  <input
                    type="number"
                    value={stationForm.power_kw}
                    onChange={(e) => setStationForm({ ...stationForm, power_kw: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Price per kWh (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stationForm.price_per_kwh}
                    onChange={(e) => setStationForm({ ...stationForm, price_per_kwh: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Slots Count</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={stationForm.total_slots}
                    onChange={(e) => setStationForm({ ...stationForm, total_slots: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={stationForm.image_url}
                  onChange={(e) => setStationForm({ ...stationForm, image_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStationModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {editingStation ? 'Save Changes' : 'Create & Generate Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
