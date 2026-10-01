import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Zap, 
  MapPin, 
  Search, 
  ShieldCheck, 
  Clock, 
  BatteryCharging, 
  ArrowRight, 
  Compass, 
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Leaf
} from 'lucide-react';
import api from '../services/api';
import StationCard from '../components/StationCard';
import SlotPickerModal from '../components/SlotPickerModal';
import PaymentModal from '../components/PaymentModal';
import BookingReceiptModal from '../components/BookingReceiptModal';
import SDGImpactWidget from '../components/SDGImpactWidget';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const [stations, setStations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  
  // Booking flow modals
  const [selectedStation, setSelectedStation] = useState(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { isAuthenticated, demoLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [stRes, adminRes] = await Promise.allSettled([
        api.get('/stations'),
        api.get('/admin/metrics') // might succeed if admin or fail gracefully
      ]);

      if (stRes.status === 'fulfilled' && stRes.value.data.success) {
        setStations(stRes.value.data.stations || []);
      }
      if (adminRes.status === 'fulfilled' && adminRes.value.data.success) {
        setStats(adminRes.value.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (station) => {
    if (!isAuthenticated) {
      demoLogin('user'); // auto log in as demo user for frictionless experience
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/explore?city=${encodeURIComponent(searchCity)}`);
  };

  const popularCities = ['New Delhi', 'Bengaluru', 'Mumbai', 'Chandigarh', 'Gurugram', 'Hyderabad'];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16">
        {/* Background glow meshes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold tracking-wide shadow-sm animate-bounce-subtle">
            <Sparkles className="w-4 h-4" />
            India's Smart EV Charging Network
          </div>

          {/* Main Headline */}
          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Power Your Journey with <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Zero-Wait EV Charging
              </span>
            </h1>
            <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Locate hyper-fast charging stations, reserve time slots in advance to avoid queues, and pay securely with instant digital passes.
            </p>
          </div>

          {/* Quick Search Box */}
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex items-center gap-3 px-3 w-full sm:w-auto flex-1">
                <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Enter city or area (e.g. Aerocity, Whitefield, BKC)..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none py-2"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
              >
                <Search className="w-4 h-4" />
                Find Stations
              </button>
            </form>

            {/* Popular City Tags */}
            <div className="flex items-center justify-center flex-wrap gap-2 mt-4 text-xs text-slate-400">
              <span className="text-slate-500">Popular Hubs:</span>
              {popularCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => navigate(`/explore?city=${encodeURIComponent(city)}`)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Stat Pillars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">150+ kW</p>
              <p className="text-xs text-slate-400 mt-0.5">Ultra Fast Hyperchargers</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">0 mins</p>
              <p className="text-xs text-slate-400 mt-0.5">Zero Queue Guarantee</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">100%</p>
              <p className="text-xs text-slate-400 mt-0.5">Automated Slot Reservation</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">SDG 7, 9, 11</p>
              <p className="text-xs text-slate-400 mt-0.5">Clean Energy Aligned</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
            Seamless 3-Step Flow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">How VoltPoint Works</h2>
          <p className="text-sm text-slate-400">
            Say goodbye to range anxiety and long charging lines with our intelligent digital booking platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              1
            </div>
            <h3 className="font-bold text-xl text-white">Locate Nearby Hubs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore our interactive Leaflet station map. Filter by connector type (CCS2, Type 2, CHAdeMO) and real-time kW power capacity.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/30 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
              2
            </div>
            <h3 className="font-bold text-xl text-white">Reserve Guaranteed Slot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick your preferred date and 1-hour time window. Our atomic database locks ensure zero double-booking concurrency.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
              3
            </div>
            <h3 className="font-bold text-xl text-white">Pay & Scan Digital Pass</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete seamless payment via Razorpay / Stripe sandbox, unlock the dispenser terminal with your dynamic QR code, and power up!
            </p>
          </div>
        </div>
      </section>

      {/* Featured Stations Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Prime Locations</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Featured Fast Charging Hubs</h2>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View all charging stations on map
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading charging stations across India...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stations.slice(0, 4).map((station) => (
              <StationCard
                key={station.id}
                station={station}
                onSelectStation={(st) => navigate(`/explore?station=${st.id}`)}
                onBookNow={handleBookNow}
              />
            ))}
          </div>
        )}
      </section>

      {/* Live Sustainability SDG Impact Widget */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SDGImpactWidget stats={stats} />
      </section>

      {/* Modals for Booking Flow */}
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
