import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

/* ─────────────────────────────────────────────────────────────────────────────
   AuthContext
   ─ ใช้ Supabase Auth (Google provider) — Supabase จัดการ session/OAuth redirect เอง
   ───────────────────────────────────────────────────────────────────────────── */

const AuthContext = createContext(null);

// แปลง Supabase user → รูปแบบที่แอปใช้ { id, name, email, picture }
function mapSupabaseUser(sUser) {
    if (!sUser) return null;
    const meta = sUser.user_metadata || {};
    return {
        id: sUser.id,
        email: sUser.email || meta.email || '',
        name: meta.full_name || meta.name || sUser.email || '',
        picture: meta.avatar_url || meta.picture || '',
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);   // { id, name, email, picture }
    const [loading, setLoading] = useState(true);   // true while checking session
    const [error, setError] = useState(null);

    // ── โหลด session ปัจจุบัน + ติดตามการเปลี่ยนแปลง (login/logout/refresh) ──
    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setUser(mapSupabaseUser(data.session?.user));
            setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(mapSupabaseUser(session?.user));
            setLoading(false);
        });

        return () => {
            mounted = false;
            sub?.subscription?.unsubscribe();
        };
    }, []);

    // ── เข้าสู่ระบบด้วย Google (ผ่าน Supabase OAuth) ──
    const signInWithGoogle = useCallback(async () => {
        setError(null);
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (oauthError) {
            setError(oauthError.message || 'Sign-in failed');
            throw oauthError;
        }
        // ถ้าไม่ error เบราว์เซอร์จะ redirect ไป Google ทันที
    }, []);

    // ── ออกจากระบบ ──
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, error, setError, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
