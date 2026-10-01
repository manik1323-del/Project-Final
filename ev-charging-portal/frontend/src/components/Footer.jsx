import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Leaf, Globe, MapPin, Clock, ShieldCheck, Zap as ZapIcon } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* SDG Banner */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 mb-12 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">United Nations Alignment</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  Committed to UN Sustainable Development Goals
                </h3>
              </div>
            </div>

            {/* SDG Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <div className="p-3 bg-slate-900/90 border border-amber-500/20 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-sm">
                  7
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-300">SDG 7</p>
                  <p className="text-[11px] text-slate-400">Affordable &amp; Clean Energy</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 border border-orange-500/20 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-black text-sm">
                  9
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-300">SDG 9</p>
                  <p className="text-[11px] text-slate-400">Industry &amp; Infrastructure</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
                  11
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-300">SDG 11</p>
                  <p className="text-[11px] text-slate-400">Sustainable Cities</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: About */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-slate-950 fill-slate-950" />
              </div>
              <span className="font-extrabold text-xl text-white">VoltPoint Portal</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              A modern, intelligent EV charging station management system that simplifies station discovery,
              real-time slot reservation, secure digital payments, and fleet tracking — built for India's
              growing EV ecosystem.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">Zero Emissions</span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">Smart Grid Ready</span>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">100% Uptime SLA</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="text-slate-300 hover:text-emerald-400 transition-colors">Home</Link></li>
              <li><Link to="/explore" className="text-slate-300 hover:text-emerald-400 transition-colors">Explore Stations</Link></li>
              <li><Link to="/my-bookings" className="text-slate-300 hover:text-emerald-400 transition-colors">My Bookings</Link></li>
              <li><Link to="/register" className="text-slate-300 hover:text-emerald-400 transition-colors">Create Account</Link></li>
              <li><Link to="/login" className="text-slate-300 hover:text-emerald-400 transition-colors">Sign In</Link></li>
            </ul>
          </div>

          {/* Col 3: Features */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <ZapIcon className="w-3.5 h-3.5 text-cyan-400" />
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" /> Secure JWT Authentication</li>
              <li className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-cyan-400 shrink-0" /> Real-Time Slot Reservation</li>
              <li className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-amber-400 shrink-0" /> Interactive Station Map</li>
              <li className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-emerald-400 shrink-0" /> Multi-Connector Support</li>
              <li className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-cyan-400 shrink-0" /> Digital QR Pass &amp; Receipts</li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VoltPoint EV Charging Portal. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with sustainable energy focus <Leaf className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 inline" />
          </p>
        </div>
      </div>
    </footer>
  );
}
