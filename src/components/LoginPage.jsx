import React, { useState } from 'react';
import { CalendarDays, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useGoogleLogin } from '@react-oauth/google';


function WorkerIllustration() {
    return (
        <div className="relative w-full h-full flex items-center justify-center select-none" style={{ minHeight: 340 }}>

            {/* Background glow blobs */}
            <div className="absolute top-6 left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-8 right-6 w-32 h-32 bg-white/6 rounded-full blur-3xl pointer-events-none" />

            {/* ── Main SVG: person planning schedule on a large calendar ── */}
            <div className="anim-float-slow relative z-10" style={{ width: 280, height: 295 }}>
                <svg viewBox="0 0 280 295" fill="none" xmlns="http://www.w3.org/2000/svg" width="280" height="295">
                    {/* Floor Reflection */}
                    <ellipse cx="140" cy="275" rx="110" ry="12" fill="white" fillOpacity="0.05" />

                    {/* ─ Calendar Board ─ */}
                    <rect x="25" y="45" width="150" height="170" rx="12" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.3" strokeWidth="2" />
                    <rect x="35" y="55" width="130" height="150" rx="8" fill="white" fillOpacity="0.05" />
                    
                    {/* Header */}
                    <path d="M35 63 Q35 55 43 55 L157 55 Q165 55 165 63 L165 80 L35 80 Z" fill="#3B4FE4" fillOpacity="0.85" />
                    <text x="100" y="72" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Google Sans, sans-serif" letterSpacing="1">SCHEDULE</text>

                    {/* Grid Days */}
                    {Array.from({ length: 7 }, (_, col) =>
                        Array.from({ length: 5 }, (_, row) => {
                            const x = 42 + col * 16.5;
                            const y = 88 + row * 22;
                            const isHighlight = (col === 3 && row === 2);
                            const isWritten1 = (col === 1 && row === 1) || (col === 5 && row === 3);
                            const isWritten2 = (col === 4 && row === 1) || (col === 2 && row === 4);
                            
                            {/* Uses the app's custom colors for dates */}
                            let fillOpacity = 0.15;
                            let fill = 'white';
                            if (isHighlight) { fill = '#fbde3a'; fillOpacity = 0.9; }
                            else if (isWritten1) { fill = '#6ab9dc'; fillOpacity = 0.7; }
                            else if (isWritten2) { fill = '#998ed9'; fillOpacity = 0.7; }

                            return (
                                <rect key={`c${col}r${row}`}
                                    x={x} y={y} width="12" height="16" rx="2.5"
                                    fill={fill}
                                    fillOpacity={fillOpacity}
                                />
                            );
                        })
                    )}
                    
                    {/* Easel Legs */}
                    <path d="M50 215 L40 270" stroke="white" strokeOpacity="0.25" strokeWidth="6" strokeLinecap="round" />
                    <path d="M150 215 L160 270" stroke="white" strokeOpacity="0.25" strokeWidth="6" strokeLinecap="round" />
                    <path d="M100 215 L100 260" stroke="white" strokeOpacity="0.15" strokeWidth="6" strokeLinecap="round" />

                    {/* ─ Person (Writing on calendar) ─ */}
                    
                    {/* Back Leg */}
                    <path d="M220 200 L210 270" stroke="#1C1033" strokeOpacity="0.6" strokeWidth="16" strokeLinecap="round" />
                    {/* Body / Shirt */}
                    <path d="M210 90 Q240 90 240 140 L235 200 L195 200 L190 140 Q180 100 210 90Z" fill="#EEF0FD" />
                    {/* Front Leg */}
                    <path d="M205 200 L190 270" stroke="#1C1033" strokeOpacity="0.8" strokeWidth="16" strokeLinecap="round" />
                    
                    {/* Neck */}
                    <path d="M210 80 L220 95 L200 95Z" fill="#FFB866" />
                    {/* Head */}
                    <circle cx="205" cy="65" r="20" fill="#FFD699" />
                    {/* Hair */}
                    <path d="M228 65 Q225 35 200 38 Q175 40 183 68 Q180 80 190 75 Q185 50 200 48 Q220 50 220 70Z" fill="#3D2314" />
                    {/* Eye */}
                    <circle cx="195" cy="61" r="2.8" fill="#1C1033" />
                    {/* Smile */}
                    <path d="M188 72 Q192 76 198 72" stroke="#C07A3B" strokeWidth="1.8" fill="none" strokeLinecap="round" />

                    {/* Left Arm (Holding clipboard) */}
                    <path d="M225 105 Q245 140 220 160" stroke="#D1D8FC" strokeWidth="15" strokeLinecap="round" fill="none" />
                    {/* Clipboard */}
                    <rect x="200" y="145" width="22" height="32" rx="3" fill="#3B4FE4" stroke="white" strokeWidth="1.5" transform="rotate(-15 200 145)" />
                    <rect x="204" y="150" width="14" height="22" rx="1.5" fill="white" transform="rotate(-15 204 150)" />

                    {/* Right Arm (Reaching to write) */}
                    <path d="M200 105 Q140 110 100 135" stroke="#EEF0FD" strokeWidth="15" strokeLinecap="round" fill="none" />
                    {/* Hand */}
                    <circle cx="95" cy="138" r="6.5" fill="#FFD699" />
                    {/* Marker Pen */}
                    <rect x="80" y="135" width="18" height="4.5" rx="2" fill="#1C1033" transform="rotate(15 80 135)" />

                    {/* Sparkles Elements */}
                    <path d="M20 30 L23 40 L33 43 L23 46 L20 56 L17 46 L7 43 L17 40 Z" fill="#fbde3a" fillOpacity="0.8" />
                    <path d="M180 30 L182 35 L187 37 L182 39 L180 44 L178 39 L173 37 L178 35 Z" fill="#EEF0FD" fillOpacity="0.9" />

                </svg>
            </div>

            {/* ── Floating card: Clock In ── */}
            <div className="absolute top-4 right-0 sm:right-8 anim-float"
                style={{ animationDelay: '0.3s' }}>
                <div className="bg-white/18 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3 shadow-xl" style={{ minWidth: 130 }}>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 bg-[#10B981] rounded-full grid place-items-center shrink-0">
                            <Clock size={11} className="text-white" />
                        </div>
                        <span className="text-white text-[11px] font-bold">Clock In</span>
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#10B981] anim-pulse-dot" />
                    </div>
                    <div className="text-white/95 text-[19px] font-bold font-mono tracking-widest">08:32</div>
                    <div className="text-white/50 text-[10px] mt-0.5">Mon 24 Mar 2025</div>
                </div>
            </div>

            {/* ── Floating card: OT Earnings ── */}
            <div className="absolute bottom-8 left-0 sm:left-6 anim-float-sm"
                style={{ animationDelay: '0.7s' }}>
                <div className="bg-white/18 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3 shadow-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={12} className="text-[#fbde3a]" />
                        <span className="text-white/65 text-[10px] font-semibold uppercase tracking-wider">OT Earned Today</span>
                    </div>
                    <div className="text-[#fbde3a] text-[17px] font-bold">+฿450</div>
                    <div className="text-white/50 text-[10px]">2.5 hrs overtime</div>
                </div>
            </div>

            {/* ── Pulse dots ── */}
            <div className="absolute top-12 left-4 flex gap-1.5">
                {['#10B981', '#fbde3a', '#3B4FE4'].map((c, i) => (
                    <div key={c}
                        className="w-2 h-2 rounded-full anim-pulse-dot"
                        style={{ background: c, animationDelay: `${i * 0.35}s` }}
                    />
                ))}
            </div>

            {/* ── Animated clock widget ── */}
            <div className="absolute bottom-4 right-4 sm:right-10 anim-float"
                style={{ animationDelay: '1.1s' }}>
                <svg viewBox="0 0 56 56" width="52" height="52">
                    <circle cx="28" cy="28" r="24" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.22" strokeWidth="2.5" />
                    {/* Hour marks */}
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
                        const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
                        return (
                            <line key={i}
                                x1={28 + 18 * Math.cos(angle)} y1={28 + 18 * Math.sin(angle)}
                                x2={28 + 22 * Math.cos(angle)} y2={28 + 22 * Math.sin(angle)}
                                stroke="white" strokeOpacity={i % 3 === 0 ? 0.6 : 0.25} strokeWidth={i % 3 === 0 ? 2 : 1} />
                        );
                    })}
                    {/* Hour hand */}
                    <line x1="28" y1="28" x2="28" y2="16"
                        stroke="white" strokeWidth="2.5" strokeLinecap="round"
                        style={{ transformOrigin: '28px 28px', animation: 'tickClock 60s linear infinite' }} />
                    {/* Minute hand */}
                    <line x1="28" y1="28" x2="28" y2="11"
                        stroke="#fbde3a" strokeWidth="1.5" strokeLinecap="round"
                        style={{ transformOrigin: '28px 28px', animation: 'tickClock 5s linear infinite' }} />
                    <circle cx="28" cy="28" r="2.5" fill="white" />
                </svg>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
    const { handleGoogleSuccess, signInAsDevMock, loading, error, setError, isDev } = useAuth();
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const data = await res.json();
                handleGoogleSuccess(data);
            } catch {
                setError('Error fetching profile from Google');
                setIsLoadingGoogle(false);
            }
        },
        onError: () => {
            setError('Sign-in cancelled or encountered an error');
            setIsLoadingGoogle(false);
        },
        onNonOAuthError: () => setIsLoadingGoogle(false),
    });

    const handleGoogleClick = () => {
        setIsLoadingGoogle(true);
        setError(null);
        if (isDev) signInAsDevMock();
        else loginWithGoogle();
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col lg:flex-row font-sans overflow-hidden">

            {/* ════════════════════════════════════════
          LEFT: indigo panel + illustration
          (desktop only — hidden on mobile)
      ════════════════════════════════════════ */}
            <div className="hidden lg:flex flex-col w-[52%] xl:w-[55%] min-h-screen
        bg-gradient-to-br from-[#3B4FE4] via-[#3045D8] to-[#2236B8]
        relative overflow-hidden anim-slide-left">

                {/* Mesh blobs */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 bg-[#fbde3a]/6 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-60 h-60 bg-white/3 rounded-full blur-2xl" />

                {/* Top logo */}
                <div className="relative z-10 p-8 xl:p-10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-white/18 border border-white/20 rounded-xl grid place-items-center">
                            <CalendarDays size={18} className="text-white" />
                        </div>
                        <span className="text-white font-bold text-[19px] tracking-tight">TimeFlow</span>
                    </div>
                </div>

                {/* Illustration */}
                <div className="relative z-10 flex-1 flex items-center justify-center px-4">
                    <WorkerIllustration />
                </div>

                {/* Tagline */}
                <div className="relative z-10 px-8 xl:px-12 pb-5 anim-fade-in delay-400">
                    <h2 className="text-white text-[22px] xl:text-[25px] font-bold leading-snug mb-2">
                        Track time smarter,<br />earn what you deserve.
                    </h2>
                    <p className="text-white/50 text-[13px] leading-relaxed">
                        Automatic OT calculation, annual summaries<br className="hidden xl:block" />
                        and beautiful earnings reports — all in one place.
                    </p>
                </div>


            </div>

            {/* ════════════════════════════════════════
          RIGHT: sign-in card
      ════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col items-center justify-center
        p-5 sm:p-8 lg:p-12 xl:p-16 relative">

                {/* Mobile background blobs */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden lg:hidden">
                    <div className="absolute -top-32 -left-32 w-72 h-72 bg-[#EEF0FD] rounded-full opacity-70 blur-3xl" />
                    <div className="absolute -bottom-24 -right-16 w-64 h-64 bg-[#ECFDF5] rounded-full opacity-60 blur-3xl" />
                </div>

                {/* Mobile logo */}
                <div className="lg:hidden flex flex-col items-center mb-8 anim-fade-in">
                    <div className="w-[52px] h-[52px] bg-[#3B4FE4] rounded-2xl grid place-items-center shadow-[0_8px_28px_rgba(59,79,228,0.28)] mb-3">
                        <CalendarDays size={24} className="text-white" />
                    </div>
                    <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">TimeFlow</h1>
                    <p className="text-[13px] text-[#9CA3AF] mt-0.5">Time tracking &amp; OT management</p>
                </div>

                {/* Card container */}
                <div className="w-full max-w-[400px] anim-slide-right">

                    {/* Desktop heading above card */}
                    <div className="hidden lg:block mb-7">
                        <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.12em] mb-2">
                            Welcome to TimeFlow
                        </p>
                        <h2 className="text-[28px] font-bold text-[#111827] tracking-tight leading-tight">
                            Sign in to your<br />workspace
                        </h2>
                    </div>

                    {/* White card */}
                    <div className="bg-white rounded-3xl border border-[#E8EAEF]
            shadow-[0_8px_40px_rgba(17,24,39,0.08)] p-7 anim-shimmer">

                        {/* Mobile heading inside card */}
                        <div className="lg:hidden mb-5">
                            <h2 className="text-[18px] font-bold text-[#111827]">Welcome Back</h2>
                            <p className="text-[13px] text-[#9CA3AF] mt-0.5">Sign in with your Google account</p>
                        </div>

                        {/* Dev badge */}
                        {isDev && (
                            <div className="flex items-start gap-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3.5 py-3 mb-5">
                                <div className="w-2 h-2 mt-0.5 rounded-full bg-[#F59E0B] anim-pulse-dot shrink-0" />
                                <div>
                                    <div className="text-[11px] font-bold text-[#92400E]">Dev Mode Active</div>
                                    <div className="text-[10px] text-[#B45309] mt-0.5">
                                        No real Google Client ID needed — click below to demo instantly
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-[#FFF1F3] border border-[#FECDD3] text-[#9F1239] text-[12px] font-medium rounded-xl px-3.5 py-2.5 mb-5 animate-[fadeUp_0.3s_ease_both]">
                                {error}
                            </div>
                        )}

                        {/* Google button */}
                        <button
                            onClick={handleGoogleClick}
                            disabled={loading || isLoadingGoogle}
                            className="w-full flex items-center justify-center gap-3 px-5 py-3.5
                rounded-[14px] border-[1.5px] border-[#D1D5E0] bg-white
                text-[#374151] font-semibold text-[14px] cursor-pointer
                transition-all duration-200
                hover:border-[#3B4FE4] hover:shadow-[0_4px_18px_rgba(59,79,228,0.16)]
                hover:-translate-y-0.5 active:translate-y-0 active:shadow-none
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
                        >
                            {isLoadingGoogle ? (
                                /* Spinner */
                                <svg className="animate-spin shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="#D1D5E0" strokeWidth="3" />
                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#3B4FE4" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            ) : (
                                /* Google G */
                                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" className="shrink-0">
                                    <path d="M47.532 24.552c0-1.636-.145-3.2-.415-4.698H24.48v8.883h12.984c-.56 3.02-2.26 5.578-4.815 7.29v6.057h7.79c4.558-4.2 7.093-10.39 7.093-17.532z" fill="#4285F4" />
                                    <path d="M24.48 48c6.516 0 11.98-2.161 15.974-5.916l-7.79-6.057c-2.162 1.449-4.926 2.306-8.184 2.306-6.298 0-11.633-4.252-13.538-9.966H2.94v6.253C6.916 42.858 15.118 48 24.48 48z" fill="#34A853" />
                                    <path d="M10.942 28.367A14.404 14.404 0 0 1 10.24 24c0-1.51.26-2.977.702-4.367v-6.253H2.94A23.93 23.93 0 0 0 .48 24c0 3.862.928 7.517 2.46 10.62l8.002-6.253z" fill="#FBBC05" />
                                    <path d="M24.48 9.667c3.548 0 6.733 1.22 9.237 3.617l6.93-6.93C36.456 2.413 30.994 0 24.48 0 15.118 0 6.916 5.142 2.94 13.38l8.002 6.253c1.905-5.714 7.24-9.966 13.538-9.966z" fill="#EA4335" />
                                </svg>
                            )}
                            {isLoadingGoogle ? 'Signing in...' : 'Continue with Google'}
                        </button>



                        <p className="text-center text-[11px] text-[#C4C9D4] mt-5 leading-relaxed">
                            By signing in you agree to our{' '}
                            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3B4FE4] hover:underline">Privacy Policy</a>
                        </p>
                    </div>

                    {/* Version */}
                    <p className="text-center text-[11px] text-[#C4C9D4] mt-5">
                        TimeFlow v2.0 · {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}