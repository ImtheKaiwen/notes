import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNotification } from './NotificationContext.js';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const { showNotification, setSyncingState } = useNotification();

  // Custom authenticated fetch helper
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      return data;
    } catch (err: any) {
      console.error(`API Fetch Error [${endpoint}]:`, err);
      throw err;
    }
  };

  // Ping backend to check health / wake up Render
  const checkBackendHealth = async (showIslandAlert = false) => {
    if (showIslandAlert) {
      setSyncingState(true, 'Connecting to cloud...');
    }

    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setIsBackendConnected(true);
        if (showIslandAlert) {
          showNotification('Cloud connected!', 'success');
        }
        return true;
      }
    } catch (e) {
      setIsBackendConnected(false);
    }
    return false;
  };

  // On mount: check token validity & wake up backend
  useEffect(() => {
    const initAuth = async () => {
      // Wake up the backend server (Render free tier might be sleeping)
      await checkBackendHealth(!!token);

      if (token) {
        try {
          const data = await apiFetch('/auth/me');
          setUser(data.user);
        } catch (err) {
          console.error('Session validation failed:', err);
          // Token is invalid/expired
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // Set up background health checks every 30 seconds
    const interval = setInterval(() => {
      checkBackendHealth(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const login = async (email: string, password: string) => {
    setSyncingState(true, 'Logging you in...');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      showNotification(`Welcome back, ${data.user.name}!`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Login failed', 'error');
      throw err;
    } finally {
      setSyncingState(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setSyncingState(true, 'Creating account...');
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      showNotification(`Let's start, ${data.user.name}!`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Registration failed', 'error');
      throw err;
    } finally {
      setSyncingState(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    showNotification('Logged out successfully', 'default');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isBackendConnected,
        login,
        register,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
