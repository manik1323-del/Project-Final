import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Smartphone, Building2, CheckCircle2, Lock, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';

export default function PaymentModal({ bookingDraft, isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardName, setCardName] = useState('VoltPoint EV Driver');
  const [upiId, setUpiId] = useState('evdriver@okaxis');
  const [selectedBank, setSelectedBank] = useState('HDFC');

  if (!isOpen || !bookingDraft) return null;

  const totalAmount = bookingDraft.totalAmount;

  const handleTestAutoFill = () => {
    if (activeTab === 'card') {
      setCardNumber('4242 4242 4242 4242');
      setCardExpiry('08/29');
      setCardCvv('123');
      setCardName('Abhinandan Sawraj');
    } else if (activeTab === 'upi') {
      setUpiId('aalam@oksbi');
    }
  };

  const handlePayNow = async () => {
    try {
      setProcessing(true);
      setError('');
      setProcessStep('Connecting to Secure Payment Gateway...');

      // 1. Initiate Payment Order
      await new Promise(r => setTimeout(r, 600));
      setProcessStep('Verifying 3D Secure Authorization...');
      
      const orderRes = await api.post('/payments/create-order', {
        amount: totalAmount,
        stationId: bookingDraft.station.id,
        slotId: bookingDraft.slot.id
      });

      await new Promise(r => setTimeout(r, 800));
      setProcessStep('Executing Atomic Slot Lock & Booking...');

      // 2. Complete Booking with payment ID
      const txId = 'pay_rzp_' + Math.random().toString(36).substring(2, 12);
      const bookingRes = await api.post('/bookings', {
        station_id: bookingDraft.station.id,
        slot_id: bookingDraft.slot.id,
        vehicle_number: bookingDraft.vehicleNumber,
        connector_type: bookingDraft.connectorType,
        estimated_kwh: bookingDraft.estimatedKwh,
        payment_method: activeTab === 'card' ? 'Credit / Debit Card (Stripe)' : activeTab === 'upi' ? `UPI (${upiId})` : `NetBanking (${selectedBank})`,
        payment_id: txId
      });

      if (bookingRes.data.success) {
        setProcessStep('Booking Confirmed!');
        // Fire confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // ignore if canvas not supported
        }

        setTimeout(() => {
          setProcessing(false);
          onSuccess(bookingRes.data.booking);
        }, 500);
      }
    } catch (err) {
      console.error('Payment/Booking Error:', err);
      setProcessing(false);
      if (err.response && err.response.status === 409) {
        setError('Double-Booking Prevented: This slot was just reserved by another user. Please choose another slot.');
      } else {
        setError(err.response?.data?.message || 'Payment processing failed. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Gateway Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-cyan-900/60 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Razorpay / Stripe Gateway</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Test Sandbox</span>
              </div>
              <h3 className="text-lg font-bold text-white">Payment Checkout</h3>
            </div>
          </div>
          {!processing && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Booking Summary Mini Bar */}
        <div className="bg-slate-950/90 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
          <div>
            <p className="text-slate-400 font-medium">{bookingDraft.station.name}</p>
            <p className="text-slate-500 text-[11px]">
              Slot #{bookingDraft.slot.slot_number} • {bookingDraft.slot.start_time} - {bookingDraft.slot.end_time} • {bookingDraft.connectorType}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Payable Amount</p>
            <p className="text-base font-extrabold text-emerald-400 font-mono">₹{totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Processing State Animation */}
        {processing ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Processing Transaction</h4>
              <p className="text-xs text-emerald-400 mt-1 font-mono">{processStep}</p>
              <p className="text-[11px] text-slate-500 mt-2">Please do not refresh or close the page</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Quick Auto-Fill helper */}
            <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Test Sandbox Mode Active
              </span>
              <button
                type="button"
                onClick={handleTestAutoFill}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-colors"
              >
                Auto-fill Test Details
              </button>
            </div>

            {/* Payment Method Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'card'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Card
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'upi'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'netbanking'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                NetBanking
              </button>
            </div>

            {/* Tab: Card */}
            {activeTab === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      maxLength="4"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Tab: UPI */}
            {activeTab === 'upi' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@okhdfcbank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  {['@okaxis', '@okhdfcbank', '@oksbi', '@paytm'].map((suf) => (
                    <button
                      key={suf}
                      type="button"
                      onClick={() => setUpiId(upiId.split('@')[0] + suf)}
                      className="text-[10px] px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-slate-400 hover:text-white"
                    >
                      {suf}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: NetBanking */}
            {activeTab === 'netbanking' && (
              <div className="space-y-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Select Bank
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Punjab National Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                        selectedBank === bank
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      🏦 {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pay Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePayNow}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Lock className="w-4 h-4" />
                Pay ₹{totalAmount.toFixed(2)} & Confirm Slot
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-2 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                256-bit TLS Encrypted • Safe & Instant Booking
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
