import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ev_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('ev_token');
      const storedUser = localStorage.getItem('ev_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify with backend
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('ev_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('ev_token', res.data.token);
      localStorage.setItem('ev_user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('ev_token', res.data.token);
      localStorage.setItem('ev_user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const demoLogin = async (role = 'user') => {
    if (role === 'admin') {
      return login('admin@evcharge.com', 'Admin@123');
    } else if (role === 'station_owner') {
      return login('sandeep@voltpoint.in', 'Owner@123');
    }
    return login('user@evcharge.com', 'User@123');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ev_token');
    localStorage.removeItem('ev_user');
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem('ev_user', JSON.stringify(updatedUserData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin',
        isStationOwner: user?.role === 'station_owner',
        isStaff: user?.role === 'admin' || user?.role === 'station_owner',
        login,
        register,
        demoLogin,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
