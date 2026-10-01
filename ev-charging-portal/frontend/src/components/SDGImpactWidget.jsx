import React from 'react';
import { Leaf, Trees, BatteryCharging, Wind, Compass, Sparkles } from 'lucide-react';

export default function SDGImpactWidget({ stats }) {
  const kwh = stats?.totalKwh || 1240.5;
  const co2Kg = stats?.sdgImpact?.co2SavedKg || (kwh * 0.82).toFixed(1);
  const trees = stats?.sdgImpact?.treesEquivalent || Math.max(1, Math.round(co2Kg / 21.77));
  const greenKm = stats?.sdgImpact?.greenKmPowered || Math.round(kwh * 6.8);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
      {/* Background ambient lighting */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Live Sustainability Metrics
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-World Environmental Impact
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Direct contributions to UN Sustainable Development Goals (SDG 7, 9 & 11)
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 px-3 py-1.5 rounded-xl self-start sm:self-auto text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Network Telemetry
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: CO2 Saved */}
          <div className="bg-slate-900/80 backdrop-blur border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/40 transition-all hover:scale-[1.02] duration-300">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <Leaf className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CO₂ Emissions Offset</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {co2Kg.toLocaleString()} <span className="text-sm font-medium text-emerald-400">kg</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">Direct reduction vs fossil fuel cars</p>
          </div>

          {/* Card 2: Trees Equivalent */}
          <div className="bg-slate-900/80 backdrop-blur border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/40 transition-all hover:scale-[1.02] duration-300">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 mb-3">
              <Trees className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trees Carbon Equivalent</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {trees} <span className="text-sm font-medium text-green-400">Trees / Year</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">Annual biological carbon capture</p>
          </div>

          {/* Card 3: Green KM Powered */}
          <div className="bg-slate-900/80 backdrop-blur border border-cyan-500/20 rounded-2xl p-5 hover:border-cyan-500/40 transition-all hover:scale-[1.02] duration-300">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zero-Emission Range</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {greenKm.toLocaleString()} <span className="text-sm font-medium text-cyan-400">km</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">Clean urban distance facilitated</p>
          </div>

          {/* Card 4: Clean Energy Dispensed */}
          <div className="bg-slate-900/80 backdrop-blur border border-amber-500/20 rounded-2xl p-5 hover:border-amber-500/40 transition-all hover:scale-[1.02] duration-300">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clean Energy Dispensed</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {kwh.toLocaleString()} <span className="text-sm font-medium text-amber-400">kWh</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">100% grid & renewable optimized</p>
          </div>
        </div>
      </div>
    </div>
  );
}
