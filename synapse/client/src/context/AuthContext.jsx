import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load current user on app start
    const loadUser = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            if (data.success) setUser(data.user);
            else setUser(null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();

        // Handle 401 fired by axios interceptor
        const handleUnauthorized = () => {
            setUser(null);
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [loadUser]);

    const login = async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        if (data.success) setUser(data.user);
        return data;
    };

    const signup = async (credentials) => {
        const { data } = await api.post('/auth/signup', credentials);
        if (data.success) setUser(data.user);
        return data;
    };

    const logout = async () => {
        await api.post('/auth/logout');
        setUser(null);
    };

    const updateUser = (updated) => setUser(updated);

    const getDashboardPath = (u = user) => {
        if (!u) return '/login';
        if (u.role === 'admin') return '/admin';
        if (u.role === 'mentor') return '/mentor';
        if (!u.onboardingComplete) return '/onboarding';
        return '/student';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, getDashboardPath, loadUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
