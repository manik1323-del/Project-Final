import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Zap, Navigation, Star, ArrowRight } from 'lucide-react';

// Custom Leaflet DivIcon for EV Stations
function createEvIcon(powerKw, isSelected) {
  const isFast = powerKw >= 100;
  const bgClass = isSelected
    ? 'bg-cyan-500 ring-4 ring-cyan-400/50 scale-125'
    : isFast
    ? 'bg-emerald-500 hover:scale-110 shadow-lg shadow-emerald-500/40'
    : 'bg-teal-600 hover:scale-110 shadow-md shadow-teal-500/30';

  return L.divIcon({
    className: 'custom-ev-marker',
    html: `
      <div class="w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-slate-950 font-bold transition-transform duration-200 border-2 border-slate-950 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M13 2L3 14h8l-1 8 11-13h-8l1-7z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

// Helper component to auto-pan when selected station changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 13, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapStationLocator({ stations, selectedStation, onSelectStation, onBookNow }) {
  const defaultCenter = selectedStation
    ? [selectedStation.latitude, selectedStation.longitude]
    : stations?.length > 0
    ? [stations[0].latitude, stations[0].longitude]
    : [28.6139, 77.2090]; // Delhi default

  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[600px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={selectedStation ? 14 : 11}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedStation && (
          <MapRecenter
            center={[selectedStation.latitude, selectedStation.longitude]}
            zoom={14}
          />
        )}

        {stations.map((station) => {
          const isSelected = selectedStation?.id === station.id;
          return (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={createEvIcon(station.power_kw, isSelected)}
              eventHandlers={{
                click: () => onSelectStation && onSelectStation(station)
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 space-y-2 max-w-[240px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      ⚡ {station.power_kw} kW Fast
                    </span>
                    <span className="text-xs font-bold text-white">
                      ₹{station.price_per_kwh}/kWh
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white leading-tight">
                    {station.name}
                  </h4>

                  <p className="text-[11px] text-slate-300">
                    {station.address}, {station.city}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {station.connector_types && station.connector_types.slice(0, 2).map((c, i) => (
                      <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => onBookNow(station)}
                    className="w-full mt-2 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    Reserve Slot
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Overlay Legend */}
      <div className="absolute top-4 right-4 z-20 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl text-xs space-y-1.5 shadow-xl hidden sm:block">
        <p className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Charging Network</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
          <span className="text-slate-300 text-[11px]">Ultra Fast (≥ 100 kW)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-teal-600 shadow-sm" />
          <span className="text-slate-300 text-[11px]">Standard Fast (50-60 kW)</span>
        </div>
      </div>
    </div>
  );
}
