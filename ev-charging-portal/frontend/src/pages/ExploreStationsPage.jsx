import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Filter, Zap, RefreshCw, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import api from '../services/api';
import MapStationLocator from '../components/MapStationLocator';
import StationCard from '../components/StationCard';
import SlotPickerModal from '../components/SlotPickerModal';
import PaymentModal from '../components/PaymentModal';
import BookingReceiptModal from '../components/BookingReceiptModal';
import { useAuth } from '../context/AuthContext';

export default function ExploreStationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || 'All';
  const initialStationId = searchParams.get('station');

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedConnector, setSelectedConnector] = useState('All');
  const [minPower, setMinPower] = useState(0);

  // Booking Flow Modals
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { isAuthenticated, demoLogin } = useAuth();

  const cities = ['All', 'New Delhi', 'Gurugram', 'Chandigarh', 'Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Jaipur'];
  const connectorOptions = ['All', 'CCS2', 'Type 2', 'CHAdeMO', 'GB/T'];

  useEffect(() => {
    fetchStations();
  }, [selectedCity, selectedConnector, minPower]);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCity && selectedCity !== 'All') params.city = selectedCity;
      if (selectedConnector && selectedConnector !== 'All') params.connectorType = selectedConnector;
      if (minPower > 0) params.minPower = minPower;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/stations', { params });
      if (res.data.success) {
        setStations(res.data.stations || []);
        
        // If query had station ID, select it
        if (initialStationId) {
          const matched = res.data.stations.find(s => s.id === parseInt(initialStationId));
          if (matched) setSelectedStation(matched);
        } else if (res.data.stations.length > 0 && !selectedStation) {
          setSelectedStation(res.data.stations[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStations();
  };

  const handleBookNow = (station) => {
    if (!isAuthenticated) {
      demoLogin('user');
    }
    setSelectedStation(station);
    setIsSlotModalOpen(true);
  };

  const handleProceedToPayment = (draft) => {
    setIsSlotModalOpen(false);
    setBookingDraft(draft);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (booking) => {
    setIsPaymentModalOpen(false);
    setConfirmedBooking(booking);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station by name, road, or landmark..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </form>

          {/* City Dropdown & Connectors */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* City Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSearchParams({ city: e.target.value });
                }}
                className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
              >
                {cities.map(c => (
                  <option key={c} value={c} className="bg-slate-900 text-white">{c === 'All' ? 'All Cities' : c}</option>
                ))}
              </select>
            </div>

            {/* Connector Plug Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedConnector}
                onChange={(e) => setSelectedConnector(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
              >
                {connectorOptions.map(c => (
                  <option key={c} value={c} className="bg-slate-900 text-white">{c === 'All' ? 'All Connectors' : c}</option>
                ))}
              </select>
            </div>

            {/* Min Power Filter */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="text-[11px] text-slate-400">Min Power:</span>
              <select
                value={minPower}
                onChange={(e) => setMinPower(Number(e.target.value))}
                className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer text-xs font-mono"
              >
                <option value={0} className="bg-slate-900 text-white">Any kW</option>
                <option value={50} className="bg-slate-900 text-white">≥ 50 kW</option>
                <option value={60} className="bg-slate-900 text-white">≥ 60 kW</option>
                <option value={100} className="bg-slate-900 text-white">≥ 100 kW</option>
                <option value={150} className="bg-slate-900 text-white">≥ 150 kW (Hyper)</option>
              </select>
            </div>

            <button
              onClick={fetchStations}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 rounded-xl transition-colors"
              title="Refresh Stations"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Station Cards on Left, Interactive Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Station List (5 cols) */}
        <div className="lg:col-span-5 space-y-4 max-h-[750px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing <strong className="text-white font-mono">{stations.length}</strong> stations</span>
            <span>Click card to center on map</span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Finding available charging hubs...</p>
            </div>
          ) : stations.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
              <Zap className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No charging stations match your filters</p>
              <p className="text-xs text-slate-500">Try selecting 'All Cities' or resetting the connector type.</p>
              <button
                onClick={() => { setSelectedCity('All'); setSelectedConnector('All'); setMinPower(0); setSearchTerm(''); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 rounded-xl font-bold"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {stations.map((station) => (
                <div
                  key={station.id}
                  className={`transition-all duration-300 rounded-2xl ${
                    selectedStation?.id === station.id ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <StationCard
                    station={station}
                    onSelectStation={(st) => setSelectedStation(st)}
                    onBookNow={handleBookNow}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Leaflet Map (7 cols) */}
        <div className="lg:col-span-7 sticky top-24 h-[500px] lg:h-[750px]">
          <MapStationLocator
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
            onBookNow={handleBookNow}
          />
        </div>
      </div>

      {/* Booking Flow Modals */}
      <SlotPickerModal
        station={selectedStation}
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onProceedToPayment={handleProceedToPayment}
      />

      <PaymentModal
        bookingDraft={bookingDraft}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      <BookingReceiptModal
        booking={confirmedBooking}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
}
