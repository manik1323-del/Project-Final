import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  Ban, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Zap, 
  ArrowRight,
  RefreshCw,
  Car
} from 'lucide-react';
import api from '../services/api';
import BookingReceiptModal from '../components/BookingReceiptModal';
import { useAuth } from '../context/AuthContext';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [selectedPassBooking, setSelectedPassBooking] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setActionError('');
      const res = await api.get('/bookings/my');
      if (res.data.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setActionError('Could not load your charging history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this charging slot reservation? The slot will be released and payment refunded.')) {
      return;
    }

    try {
      setCancellingId(bookingId);
      const res = await api.put(`/bookings/${bookingId}/cancel`);
      if (res.data.success) {
        fetchBookings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const openPassModal = (booking) => {
    setSelectedPassBooking(booking);
    setIsReceiptOpen(true);
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterTab === 'confirmed') return b.booking_status === 'confirmed';
    if (filterTab === 'completed') return b.booking_status === 'completed';
    if (filterTab === 'cancelled') return b.booking_status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">EV Session Passbook</span>
            <span className="text-xs text-slate-500 font-mono">({bookings.length} Total Records)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">My Charging Bookings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Driver: <strong className="text-slate-200">{user?.name}</strong> • Vehicle Plate: <strong className="text-emerald-400 font-mono">{user?.vehicle_number || 'DL-EV-2026'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBookings}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 rounded-xl transition-colors"
            title="Refresh Bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/explore"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            Book New Slot
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { key: 'all', label: 'All Sessions' },
          { key: 'confirmed', label: 'Active & Upcoming' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled / Refunded' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterTab === tab.key
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-900/30 rounded-3xl border border-slate-800">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Fetching your charging sessions...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 space-y-4 max-w-md mx-auto">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">No Bookings Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              You haven't made any reservations under this category yet.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl"
          >
            Explore Charging Stations
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const isConfirmed = b.booking_status === 'confirmed';
            const isCompleted = b.booking_status === 'completed';
            const isCancelled = b.booking_status === 'cancelled';

            return (
              <div
                key={b.id}
                className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left: Station & Time Info */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        {b.booking_ref}
                      </span>
                      {isConfirmed && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          CONFIRMED & ACTIVE
                        </span>
                      )}
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          SESSION COMPLETED
                        </span>
                      )}
                      {isCancelled && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                          CANCELLED
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-lg text-white">{b.station_name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {b.station_address || b.station_city}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        {b.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {b.start_time} - {b.end_time}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono">
                        <Car className="w-3.5 h-3.5 text-purple-400" />
                        {b.vehicle_number || 'DL-EV-2026'} ({b.connector_type})
                      </span>
                      <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">
                        Slot #{b.slot_number || b.slot_id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Pricing & Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                  <div className="text-left lg:text-right">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Amount Paid</p>
                    <p className="text-xl font-extrabold text-white font-mono">
                      ₹{b.total_amount?.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">{b.payment_method || 'Razorpay / Stripe'}</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => openPassModal(b)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
                    >
                      <QrCode className="w-4 h-4" />
                      View QR Pass
                    </button>

                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={cancellingId === b.id}
                        className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                        title="Cancel Slot Reservation"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pass & Receipt Modal */}
      <BookingReceiptModal
        booking={selectedPassBooking}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
