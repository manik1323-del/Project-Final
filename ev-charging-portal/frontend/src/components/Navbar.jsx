import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, 
  MapPin, 
  Calendar, 
  LayoutDashboard, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  ShieldCheck,
  Globe2
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isStaff, logout, demoLogin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
              <Zap className="w-6 h-6 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  VoltPoint
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  EV Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Smart Charging • Zero Emissions • SDGs 7, 9, 11</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-slate-800 text-emerald-400 shadow-inner' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Home
            </Link>
            <Link
              to="/explore"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/explore') 
                  ? 'bg-slate-800 text-emerald-400 shadow-inner' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              Find Stations
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-bookings"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/my-bookings') 
                    ? 'bg-slate-800 text-emerald-400 shadow-inner' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                My Bookings
              </Link>
            )}
            {isStaff && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin') 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                {isAdmin ? 'Admin Center' : 'Owner Portal'}
              </Link>
            )}
          </nav>

          {/* Desktop Right Side / Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => demoLogin('user')}
                    className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                    title="Instant Demo User Login"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Driver
                  </button>
                  <span className="text-slate-800">|</span>
                  <button
                    onClick={() => demoLogin('station_owner')}
                    className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                    title="Instant Demo Owner Login"
                  >
                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                    Owner
                  </button>
                  <span className="text-slate-800">|</span>
                  <button
                    onClick={() => demoLogin('admin')}
                    className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                    title="Instant Demo Admin Login"
                  >
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Admin
                  </button>
                </div>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-sm text-emerald-400">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
                    <p className="text-[10px] text-emerald-400 capitalize font-mono">{user?.role} Account</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Home
          </Link>
          <Link
            to="/explore"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Find Charging Stations
          </Link>
          {isAuthenticated && (
            <Link
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
            >
              My Bookings & Passes
            </Link>
          )}
          {isStaff && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-amber-400 hover:bg-slate-800"
            >
              {isAdmin ? 'Admin Dashboard' : 'Owner Dashboard'}
            </Link>
          )}

          <div className="pt-4 border-t border-slate-800 space-y-2">
            {!isAuthenticated ? (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => { demoLogin('user'); setMobileMenuOpen(false); }}
                    className="py-1.5 text-[10px] font-semibold bg-slate-900 border border-slate-700 text-emerald-400 rounded-lg text-center"
                  >
                    ⚡ Driver
                  </button>
                  <button
                    onClick={() => { demoLogin('station_owner'); setMobileMenuOpen(false); }}
                    className="py-1.5 text-[10px] font-semibold bg-slate-900 border border-slate-700 text-blue-400 rounded-lg text-center"
                  >
                    🛡️ Owner
                  </button>
                  <button
                    onClick={() => { demoLogin('admin'); setMobileMenuOpen(false); }}
                    className="py-1.5 text-[10px] font-semibold bg-slate-900 border border-slate-700 text-amber-400 rounded-lg text-center"
                  >
                    🛡️ Admin
                  </button>
                </div>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-2.5 text-center rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Register Account
                </Link>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-center text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
