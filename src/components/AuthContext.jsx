import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   AuthContext
   ─ Wraps Google Identity Services (GIS) One Tap / OAuth 2.0
   ───────────────────────────────────────────────────────────────────────────── */

const AuthContext = createContext(null);

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
        <AuthContext.Provider value={{ user, loading, error, setError, handleGoogleSuccess, signInAsGuest, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}