import React, { useState } from 'react';
import { CalendarDays, Shield, Clock3, TrendingUp } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

/* ─────────────────────────────────────────────────────────────────────────────
   LoginPage
   ─ Full-screen sign-in page with Google OAuth button
   ─ Matches TimeFlow design tokens exactly
   ───────────────────────────────────────────────────────────────────────────── */

const FEATURES = [
    { icon: Clock3, title: 'ติดตามเวลาทำงาน', desc: 'บันทึกเวลาเข้า-ออกและคำนวณ OT อัตโนมัติ' },
    { icon: TrendingUp, title: 'วิเคราะห์รายได้', desc: 'ดูรายได้รายเดือน รายปี พร้อมกราฟสวยงาม' },
    { icon: Shield, title: 'ข้อมูลปลอดภัย', desc: 'ข้อมูลถูกเก็บในเครื่องคุณ ไม่ส่งไปไหน' },
];

export default function LoginPage() {
    const { handleGoogleSuccess, signInAsDevMock, signInAsGuest, loading, error, setError, isDev } = useAuth();
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const data = await res.json();
                handleGoogleSuccess(data);
            } catch (err) {
                setError('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google');
                setIsLoadingGoogle(false);
            }
        },
        onError: () => {
            setError('การเข้าสู่ระบบถูกยกเลิก หรือเกิดข้อผิดพลาด');
            setIsLoadingGoogle(false);
        },
        onNonOAuthError: () => {
            setIsLoadingGoogle(false);
        }
    });

    const handleGoogleClick = () => {
        setIsLoadingGoogle(true);
        setError(null);
        if (isDev) {
            signInAsDevMock();
        } else {
            loginWithGoogle();
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4 font-sans">

            {/* Background decorative blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#EEF0FD] rounded-full opacity-60 blur-3xl" />
                <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-[#ECFDF5] rounded-full opacity-50 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#fffdef] rounded-full opacity-40 blur-3xl" />
            </div>

            {/* Card */}
            <div className="relative w-full max-w-[420px] animate-[fadeUp_0.5s_ease_both]">

                {/* Logo + Brand */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-[56px] h-[56px] bg-[#3B4FE4] rounded-2xl grid place-items-center shadow-[0_8px_32px_rgba(59,79,228,0.28)] mb-4">
                        <CalendarDays size={28} className="text-white" />
                    </div>
                    <h1 className="text-[26px] font-bold text-[#111827] tracking-tight">TimeFlow</h1>
                    <p className="text-[14px] text-[#9CA3AF] mt-1">ระบบติดตามเวลาทำงานและ OT</p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl border border-[#E8EAEF] shadow-[0_8px_40px_rgba(17,24,39,0.08)] p-8">

                    <h2 className="text-[18px] font-bold text-[#111827] mb-1.5">ยินดีต้อนรับกลับ</h2>
                    <p className="text-[13px] text-[#9CA3AF] mb-7">เข้าสู่ระบบด้วยบัญชี Google ของคุณ</p>

                    {/* Dev badge */}
                    {isDev && (
                        <div className="flex items-center gap-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2.5 mb-5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                            <span className="text-[12px] font-semibold text-[#92400E]">
                                Dev Mode — ไม่จำเป็นต้องใช้ Client ID จริง
                            </span>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-[#FFF1F3] border border-[#FECDD3] text-[#9F1239] text-[12px] font-medium rounded-xl px-3 py-2.5 mb-5">
                            {error}
                        </div>
                    )}

                    {/* Google Sign-In Button */}
                    <button
                        onClick={handleGoogleClick}
                        disabled={loading || isLoadingGoogle}
                        className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-[14px] border-[1.5px] border-[#D1D5E0] bg-white text-[#374151] font-semibold text-[14px] cursor-pointer transition-all duration-200 hover:border-[#3B4FE4] hover:shadow-[0_4px_16px_rgba(59,79,228,0.14)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
                    >
                        {/* Google SVG logo */}
                        <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                            <path d="M47.532 24.552c0-1.636-.145-3.2-.415-4.698H24.48v8.883h12.984c-.56 3.02-2.26 5.578-4.815 7.29v6.057h7.79c4.558-4.2 7.093-10.39 7.093-17.532z" fill="#4285F4" />
                            <path d="M24.48 48c6.516 0 11.98-2.161 15.974-5.916l-7.79-6.057c-2.162 1.449-4.926 2.306-8.184 2.306-6.298 0-11.633-4.252-13.538-9.966H2.94v6.253C6.916 42.858 15.118 48 24.48 48z" fill="#34A853" />
                            <path d="M10.942 28.367A14.404 14.404 0 0 1 10.24 24c0-1.51.26-2.977.702-4.367v-6.253H2.94A23.93 23.93 0 0 0 .48 24c0 3.862.928 7.517 2.46 10.62l8.002-6.253z" fill="#FBBC05" />
                            <path d="M24.48 9.667c3.548 0 6.733 1.22 9.237 3.617l6.93-6.93C36.456 2.413 30.994 0 24.48 0 15.118 0 6.916 5.142 2.94 13.38l8.002 6.253c1.905-5.714 7.24-9.966 13.538-9.966z" fill="#EA4335" />
                        </svg>
                        {isLoadingGoogle ? 'กำลังโหลด...' : 'เข้าสู่ระบบด้วย Google'}
                    </button>

                    {/* Or Divider */}
                    <div className="flex items-center gap-3 my-5">
                       <div className="h-px bg-[#E8EAEF] flex-1" />
                       <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">หรือ</span>
                       <div className="h-px bg-[#E8EAEF] flex-1" />
                    </div>
                    
                    {/* Guest Sign-In */}
                    <button
                        onClick={() => signInAsGuest('ผู้ใช้งานทั่วไป (Guest)')}
                        className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-[14px] bg-[#EEF0FD] text-[#3B4FE4] font-semibold text-[14px] cursor-pointer transition-all duration-200 hover:bg-[#E0E5FB] hover:-translate-y-0.5 active:translate-y-0 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
                    >
                        เข้าใช้งานแบบบุคคลทั่วไป (Guest)
                    </button>

                    <p className="text-center text-[11px] text-[#9CA3AF] mt-5 leading-relaxed">
                        การเข้าสู่ระบบถือว่าคุณยอมรับ{' '}
                        <span className="text-[#3B4FE4] cursor-pointer hover:underline">นโยบายความเป็นส่วนตัว</span>
                    </p>
                </div>

                {/* Feature bullets */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="bg-white rounded-2xl border border-[#E8EAEF] p-4 text-center shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
                            <div className="w-8 h-8 bg-[#EEF0FD] rounded-[10px] grid place-items-center mx-auto mb-2">
                                <Icon size={15} className="text-[#3B4FE4]" />
                            </div>
                            <div className="text-[11px] font-bold text-[#374151] mb-0.5">{title}</div>
                            <div className="text-[10px] text-[#9CA3AF] leading-snug">{desc}</div>
                        </div>
                    ))}
                </div>

                {/* Version */}
                <p className="text-center text-[11px] text-[#D1D5E0] mt-6">TimeFlow v2.0 · {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}