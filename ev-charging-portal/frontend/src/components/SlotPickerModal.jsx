import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Zap, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function SlotPickerModal({ station, isOpen, onClose, onProceedToPayment }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotsData, setSlotsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedConnector, setSelectedConnector] = useState(station?.connector_types?.[0] || 'CCS2');
  const [estimatedKwh, setEstimatedKwh] = useState(25);
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Generate 5 selectable dates starting today
  const availableDates = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    availableDates.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateDisplay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }

  // Fetch slots whenever station or date changes
  useEffect(() => {
    if (isOpen && station) {
      fetchSlots();
      setSelectedSlot(null);
      setError('');
    }
  }, [isOpen, station, selectedDate]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/slots/station/${station.id}?date=${selectedDate}`);
      if (res.data.success) {
        setSlotsData(res.data.slots || []);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      setError('Unable to load charging slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !station) return null;

  const rate = station.price_per_kwh || 16.5;
  const baseCost = estimatedKwh * rate;
  const serviceFee = 15.00;
  const totalAmount = (baseCost + serviceFee).toFixed(2);

  const handleProceed = () => {
    if (!selectedSlot) {
      setError('Please select an available charging time slot.');
      return;
    }
    if (selectedSlot.status !== 'available') {
      setError('Selected slot is not available. Please pick an active green slot.');
      return;
    }

    onProceedToPayment({
      station,
      slot: selectedSlot,
      date: selectedDate,
      connectorType: selectedConnector,
      estimatedKwh,
      vehicleNumber: vehicleNumber || 'DL-EV-2026',
      totalAmount: parseFloat(totalAmount),
      rate
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                ⚡ {station.power_kw} kW Hypercharger
              </span>
              <span className="text-xs text-slate-400 font-mono">₹{rate}/kWh</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">{station.name}</h2>
            <p className="text-xs text-slate-400">{station.address}, {station.city}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Date Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              1. Select Date
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {availableDates.map((d) => {
                const isSelected = selectedDate === d.dateStr;
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 scale-[1.02]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-xs font-medium opacity-90">{d.dayName}</p>
                    <p className="text-sm font-bold mt-0.5">{d.dateDisplay}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Slot Time Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                2. Choose Charging Slot
              </label>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-700" /> Booked</span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Fetching live slots telemetry...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {slotsData.map((slot) => {
                  const isAvail = slot.status === 'available';
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!isAvail}
                      onClick={() => { setSelectedSlot(slot); setError(''); }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all relative ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                          : isAvail
                          ? 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-950/20'
                          : 'bg-slate-950/30 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{slot.start_time} - {slot.end_time}</span>
                        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                          isSelected 
                            ? 'bg-slate-950 text-cyan-400 font-bold'
                            : isAvail 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          Slot {slot.slot_number}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Connector & Energy Estimation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Connector Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                3. Connector Plug
              </label>
              <div className="flex flex-wrap gap-2">
                {station.connector_types && station.connector_types.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedConnector(c)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedConnector === c
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🔌 {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Energy Required */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  4. Energy Required (kWh)
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">{estimatedKwh} kWh</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={estimatedKwh}
                onChange={(e) => setEstimatedKwh(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>10 kWh (~60 km)</span>
                <span>40 kWh (~250 km)</span>
                <span>80 kWh (~500 km)</span>
              </div>
            </div>
          </div>

          {/* Vehicle Number (Optional quick plate) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Vehicle Plate / Identifier (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. DL-01-EV-2026"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono uppercase"
            />
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Energy Charge ({estimatedKwh} kWh × ₹{rate}/kWh)</span>
              <span className="font-mono text-slate-200">₹{baseCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Grid & Reservation Convenience Fee</span>
              <span className="font-mono text-slate-200">₹{serviceFee.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="font-bold text-white text-sm">Total Payable</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {selectedSlot ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Slot #{selectedSlot.slot_number} ({selectedSlot.start_time} - {selectedSlot.end_time})
              </span>
            ) : (
              <span>Select an available time slot</span>
            )}
          </div>
          <button
            onClick={handleProceed}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
