import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   AuthContext
   ─ Wraps Google Identity Services (GIS) One Tap / OAuth 2.0
   ─ Falls back to a mock user in dev when VITE_GOOGLE_CLIENT_ID is missing
   ───────────────────────────────────────────────────────────────────────────── */

const AuthContext = createContext(null);

// ── Mock user for dev / demo ──────────────────────────────────────────────────
const MOCK_USER = {
    id: 'mock-001',
    name: 'สมชาย ใจดี',
    email: 'somchai.jaidee@example.com',
    picture: 'https://ui-avatars.com/api/?name=สมชาย+ใจดี&background=3B4FE4&color=fff&size=128&font-size=0.4',
};

// ── Decode a Google JWT id_token (base64url) ──────────────────────────────────
function decodeJwt(token) {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);   // { id, name, email, picture }
    const [loading, setLoading] = useState(true);   // true while checking session
    const [error, setError] = useState(null);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isDev = !clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE';

    // ── Restore session from localStorage ────────────────────────────────────
    useEffect(() => {
        try {
            const stored = localStorage.getItem('tf_user');
            if (stored) setUser(JSON.parse(stored));
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    // ── Persist user to localStorage whenever it changes ─────────────────────
    useEffect(() => {
        if (user) localStorage.setItem('tf_user', JSON.stringify(user));
        else localStorage.removeItem('tf_user');
    }, [user]);

    // ── Successful Google Login Handler ───────────────────────────────────────
    const handleGoogleSuccess = useCallback((payload) => {
        setUser({
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
        });
        setError(null);
    }, []);

    // ── Manual Dev Mock Login ─────────────────────────────────────────────────
    const signInAsDevMock = useCallback(() => {
        setUser(MOCK_USER);
    }, []);
    // ── Sign in as Guest ───────────────────────────────────────────────────────
    const signInAsGuest = useCallback((name = 'ผู้ใช้งานทั่วไป') => {
        setUser({
            id: `guest-${Date.now()}`,
            name,
            email: 'guest@local.dev',
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3B4FE4&color=fff&size=128&font-size=0.4`
        });
    }, []);

    // ── Sign out ───────────────────────────────────────────────────────────────
    const signOut = useCallback(() => {
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, error, setError, handleGoogleSuccess, signInAsDevMock, signInAsGuest, signOut, isDev }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}