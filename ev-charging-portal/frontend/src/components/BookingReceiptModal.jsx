import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, CheckCircle2, Zap, MapPin, Calendar, Clock, Car, ShieldCheck, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookingReceiptModal({ booking, isOpen, onClose }) {
  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrData = booking.qr_code_data || JSON.stringify({
    ref: booking.booking_ref,
    slot: booking.slot_number,
    date: booking.date,
    time: `${booking.start_time} - ${booking.end_time}`,
    station: booking.station_name,
    amount: booking.total_amount
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Pass Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950/90 flex items-center justify-center shadow-lg text-emerald-400">
              <Zap className="w-6 h-6 fill-emerald-400" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest bg-slate-950/20 px-2 py-0.5 rounded text-slate-900">
                Confirmed Charging Pass
              </span>
              <h3 className="text-xl font-black text-slate-950 leading-tight">VoltPoint EV Network</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pass Body */}
        <div className="p-6 space-y-6">
          {/* Status Badge & Reference */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Booking Reference</p>
              <p className="text-lg font-extrabold text-emerald-400 font-mono tracking-wider">
                {booking.booking_ref}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              CONFIRMED
            </div>
          </div>

          {/* QR Code Dispenser Verification Box */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="p-2.5 bg-white rounded-xl shadow-md shrink-0">
              <QRCodeSVG value={qrData} size={110} level="M" />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Digital Dispenser Pass</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Scan this QR code at Station Slot #{booking.slot_number || booking.slot_id} to automatically unlock the charging connector.
              </p>
              <span className="inline-block text-[10px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                Slot #{booking.slot_number || booking.slot_id} Reserved
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <p className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" /> Station
              </p>
              <p className="font-bold text-white mt-0.5 line-clamp-1">{booking.station_name}</p>
              <p className="text-[10px] text-slate-400 line-clamp-1">{booking.station_address || booking.station_city}</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <p className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-400" /> Session Date
              </p>
              <p className="font-bold text-white mt-0.5">{booking.date}</p>
              <p className="text-[10px] text-slate-400">{booking.start_time} - {booking.end_time}</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <p className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Car className="w-3 h-3 text-amber-400" /> Vehicle Plate
              </p>
              <p className="font-bold text-white mt-0.5 font-mono">{booking.vehicle_number || 'DL-01-EV-2026'}</p>
              <p className="text-[10px] text-slate-400">{booking.connector_type} Plug</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <p className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Amount Paid
              </p>
              <p className="font-bold text-emerald-400 mt-0.5 font-mono text-sm">₹{booking.total_amount?.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400">~{booking.estimated_kwh || 25} kWh delivered</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>

          <Link
            to="/my-bookings"
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            View in My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
