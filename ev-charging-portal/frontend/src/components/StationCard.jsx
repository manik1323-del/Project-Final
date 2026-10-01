import React from 'react';
import { Zap, MapPin, Star, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

export default function StationCard({ station, onSelectStation, onBookNow }) {
  const isAvailable = station.status === 'active';

  return (
    <div className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between">
      {/* Top Image + Badges */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-950">
        <img
          src={station.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80'}
          alt={station.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

        {/* Power Rating Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-emerald-500/30 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-400">
          <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
          {station.power_kw} kW Fast Charger
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {isAvailable ? (
            <span className="flex items-center gap-1.5 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          ) : (
            <span className="bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              Maintenance
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 border border-slate-800">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-bold text-white">{station.avg_rating || '4.8'}</span>
          <span className="text-slate-400 text-[10px]">({station.review_count || 12})</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
              {station.name}
            </h3>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-3 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {station.address}, {station.city}
          </p>

          {/* Connectors */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {station.connector_types && station.connector_types.map((c, i) => (
              <span
                key={i}
                className="text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-md"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing & Booking Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Tariff</p>
            <p className="text-base font-extrabold text-white">
              ₹{station.price_per_kwh} <span className="text-xs font-normal text-slate-400">/ kWh</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSelectStation && (
              <button
                onClick={() => onSelectStation(station)}
                className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                View
              </button>
            )}
            <button
              onClick={() => onBookNow(station)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95"
            >
              Book Slot
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
