import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setAccess([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setAccess(data.access || []);
    } catch {
      setToken(null);
      setUser(null);
      setAccess([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const onLost = () => {
      setUser(null);
      setAccess([]);
    };
    window.addEventListener('fbc-auth-lost', onLost);
    return () => window.removeEventListener('fbc-auth-lost', onLost);
  }, []);

  const login = async (username, pin) => {
    const data = await api.login(username, pin);
    setToken(data.token);
    setUser(data.user);
    setAccess(data.access || []);
    return data;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setAccess([]);
  };

  const can = (feature) => access.includes(feature);

  return (
    <AuthContext.Provider value={{ user, access, loading, login, logout, can, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
