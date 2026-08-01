import React, { useState, useCallback } from 'react';
import {
    Wallet, Clock, CircleDollarSign,
    Stethoscope, UmbrellaOff, Plane,
    ChevronLeft, CheckCircle2,
} from 'lucide-react';
import { useAuth } from './AuthContext';

import { getLang } from '../locales';
import { UserAPI } from '../services/api';

/* ─────────────────────────────────────────────────────────────────────────────
   ProfilePage
   ─ Tab 1 "Personal": name, email, avatar (Google)
   ─ Tab 2 "Work"    : salary, OT rate, std hours, leave quotas, OT mode
   ───────────────────────────────────────────────────────────────────────────── */

// ── OT Calculation Mode ───────────────────────────────────────────────────────
// MODE A: ต่อชั่วโมง — ทุก OT ชม. คิดเต็มตามอัตรา
// MODE B: ชั่วโมงเต็ม — หักนาทีออกหากเกินค่าที่กำหนด
//         e.g. ทำ OT 4 ชม. โดยที่ block=2 และหัก=30นาที → จะได้ 3.5 ชม.
//         (หาก OT <= otBlockHours ให้คิดเต็ม, หาก > ให้หัก deductMins นาทีออก)

export const OT_MODE = {
    HOURLY: 'hourly',   // A: คิดต่อชั่วโมงทุกชม.
    BLOCK: 'block',    // B: หักนาทีออกเมื่อเกิน block
};

const LEAVE_QUOTAS = [
    { key: 'sick', label: 'ลาป่วย', Icon: Stethoscope, color: '#F43F5E', bg: '#FFF1F3', defaultMax: 0 },
    { key: 'personal', label: 'ลากิจ', Icon: UmbrellaOff, color: '#F472B6', bg: '#FCE7F3', defaultMax: 0 },
    { key: 'vacation', label: 'ลาพักร้อน', Icon: Plane, color: '#3B4FE4', bg: '#EEF0FD', defaultMax: 0 },
];

// Shared classes
const labelCls = 'block text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1.5';
const cardCls = 'bg-white border border-[#E8EAEF] rounded-2xl p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]';

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage(props) {
    const { user } = useAuth();
    const t = getLang(props.lang);
    const [saved, setSaved] = useState(false);
    const [isSavingLocal, setIsSavingLocal] = useState(false);

    // Initialize local state from props to prevent unsaved changes from propagating
    const [salary, setSalary] = useState(props.salary);
    const [leaveQuotas, setLeaveQuotas] = useState(props.leaveQuotas);
    const [shiftAllowance, setShiftAllowance] = useState(props.shiftAllowance);
    const [shiftStart, setShiftStart] = useState(props.shiftStart);
    const [shiftEnd, setShiftEnd] = useState(props.shiftEnd);
    const [socialSecurity, setSocialSecurity] = useState(props.socialSecurity);

    const handleSave = useCallback(async () => {
        if (!user?.email) return;
        setIsSavingLocal(true);
        try {
            // รับเงินแบบรายเดือนอย่างเดียว
            const finalSalary = salary;
            // อัตรา OT ต่อชม. = เงินเดือน ÷ 30 ÷ 8 (คำนวณอัตโนมัติ)
            const finalOtRate = finalSalary > 0 ? finalSalary / 30 / 8 : 0;

            // บันทึก User Profile (เบี้ยกะเก็บในตาราง user แล้ว)
            await UserAPI.update({
                email: user.email,
                salary_monthly: finalSalary,
                ot_hourly: finalOtRate,
                sick_leave_day: leaveQuotas.sick,
                personal_leave_day: leaveQuotas.personal,
                annual_leave_day: leaveQuotas.vacation,
                payment_type: 'monthly',
                daily_rate: 0,
                social_security: socialSecurity || 0,
                shift_allowance: shiftAllowance || 0,
                shift_start: shiftStart || '',
                shift_end: shiftEnd || '',
            });

            // Sync changes back to App.jsx global state ONLY after successful save
            props.setSalary(finalSalary);
            props.setDailyRate(0);
            props.setOtRate(finalOtRate);
            props.setLeaveQuotas(leaveQuotas);
            props.setPaymentType('monthly');
            props.setShiftAllowance(shiftAllowance);
            props.setShiftStart(shiftStart);
            props.setShiftEnd(shiftEnd);
            props.setSocialSecurity(socialSecurity);

            console.log('[TimeFlow] ✅ Profile saved');
            setSaved(true);
            setTimeout(() => setSaved(false), 2200);
        } catch (err) {
            console.error('[TimeFlow] Failed to save profile:', err);
        } finally {
            setIsSavingLocal(false);
        }
    }, [user?.email, salary, leaveQuotas, shiftAllowance, shiftStart, shiftEnd, socialSecurity, props]);

    // อัตรา OT ต่อชม. (base) = เงินเดือน ÷ 30 ÷ 8 — แสดงแบบอ่านอย่างเดียว
    const computedOtRate = Number(salary) > 0 ? Number(salary) / 30 / 8 : 0;

    return (
        <div className="min-h-screen bg-[#F8F9FB] font-sans">

            {/* ── TOP BAR ── */}
            <header className="sticky top-0 z-50 w-full h-[60px] bg-white border-b border-[#E8EAEF] flex items-center gap-3 px-6">
                <button
                    onClick={props.onBack}
                    className="w-8 h-8 rounded-lg bg-[#F8F9FB] border border-[#E8EAEF] grid place-items-center text-[#6B7280] cursor-pointer hover:bg-[#EEF0FD] hover:border-[#3B4FE4] hover:text-[#3B4FE4] transition-all"
                >
                    <ChevronLeft size={16} />
                </button>
                <h1 className="text-[15px] font-bold text-[#111827]">{t.profile}</h1>
            </header>

            <div className="max-w-[680px] mx-auto px-4 py-8 flex flex-col gap-6 animate-[fadeUp_0.4s_ease_both]">

                {/* ── Profile Info ── */}
                <div className="bg-white border border-[#E8EAEF] rounded-2xl p-4 shadow-[0_1px_3px_rgba(17,24,39,0.06)] flex items-center gap-4">
                    <img
                        src={user?.picture}
                        alt={user?.name}
                        className="w-14 h-14 rounded-[14px] object-cover border border-[#E8EAEF]"
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=EEF0FD&color=3B4FE4`; }}
                    />
                    <div className="min-w-0">
                        <div className="text-[16px] font-bold text-[#111827] truncate leading-tight mb-0.5">{user?.name}</div>
                        <div className="text-[12px] font-medium text-[#9CA3AF] truncate">{user?.email}</div>
                    </div>
                </div>

                {/* ── Work Settings ── */}
                <div className="flex flex-col gap-4 animate-[fadeUp_0.3s_ease_both]">

                    {/* ── Section 1: Salary (รายเดือนอย่างเดียว) ── */}
                    <div className={cardCls}>
                        <h3 className="text-[13px] font-bold text-[#111827] mb-4">{t.monthly_salary}</h3>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className={labelCls}>{t.monthly_salary}</label>
                                <InputWithIcon Icon={Wallet} suffix={t.mo_unit} color="#10B981">
                                    <input
                                        type="number" min="0" value={salary || ''}
                                        onChange={(e) => setSalary(e.target.value === '' ? 0 : Number(e.target.value))}
                                        onFocus={(e) => e.target.select()}
                                        className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                    />
                                </InputWithIcon>
                            </div>

                            <div>
                                <label className={labelCls}>{t.ot_rate}</label>
                                <InputWithIcon Icon={CircleDollarSign} suffix={t.hr_unit} color="#c29302">
                                    <input
                                        type="text" readOnly disabled
                                        value={computedOtRate > 0 ? computedOtRate.toFixed(2) : '—'}
                                        className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#6B7280] min-w-0 cursor-not-allowed"
                                    />
                                </InputWithIcon>
                                <p className="mt-1.5 text-[11px] font-medium text-[#9CA3AF] leading-snug">{t.ot_rate_auto_hint}</p>
                            </div>
                        </div>

                        {/* ประกันสังคม — หักออกจากเงินเดือน */}
                        <div className="mt-4">
                            <label className={labelCls}>{t.social_security}</label>
                            <InputWithIcon Icon={CircleDollarSign} suffix={t.mo_unit} color="#EF4444">
                                <input
                                    type="number" min="0" value={socialSecurity || ''}
                                    onChange={(e) => setSocialSecurity(e.target.value === '' ? 0 : Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                />
                            </InputWithIcon>
                            <p className="text-[10px] text-[#9CA3AF] mt-1">{t.social_security_desc}</p>
                        </div>
                    </div>

                    {/* ── Section 2: Shift Allowance ── */}
                    <div className={cardCls}>
                        <h3 className="text-[13px] font-bold text-[#111827] mb-1">{t.shift_allowance_title}</h3>
                        <p className="text-[11px] text-[#9CA3AF] mb-4">{t.shift_allowance_desc}</p>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelCls}>{t.shift_allowance_amount}</label>
                                <InputWithIcon Icon={CircleDollarSign} suffix={t.day_unit || 'day'} color="#10B981">
                                    <input
                                        type="number" min="0" value={shiftAllowance || ''}
                                        onChange={(e) => setShiftAllowance(e.target.value === '' ? 0 : Number(e.target.value))}
                                        onFocus={(e) => e.target.select()}
                                        className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                    />
                                </InputWithIcon>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className={labelCls}>{t.shift_start}</label>
                                    <InputWithIcon Icon={Clock} color="#3B4FE4">
                                        <input
                                            type="time" value={shiftStart || ''}
                                            onChange={(e) => setShiftStart(e.target.value)}
                                            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                        />
                                    </InputWithIcon>
                                </div>
                                <div>
                                    <label className={labelCls}>{t.shift_end}</label>
                                    <InputWithIcon Icon={Clock} color="#3B4FE4">
                                        <input
                                            type="time" value={shiftEnd || ''}
                                            onChange={(e) => setShiftEnd(e.target.value)}
                                            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                        />
                                    </InputWithIcon>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 3: Leave Quotas ── */}
                    <div className={cardCls}>
                        <h3 className="text-[13px] font-bold text-[#111827] mb-4">{t.yearly_leave_quota}</h3>
                        <div className="flex flex-col gap-3">
                            {LEAVE_QUOTAS.map(({ key, Icon: LIcon, color, bg, defaultMax }) => {
                                const quota = leaveQuotas?.[key] ?? defaultMax;
                                return (
                                    <div key={key} className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-[7px] grid place-items-center shrink-0" style={{ background: bg }}>
                                                <LIcon size={13} style={{ color }} />
                                            </div>
                                            <span className="text-[13px] font-semibold text-[#374151] truncate">{t[`${key}_leave`]}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <input
                                                type="number" min="0" max="365" value={quota || ''}
                                                onChange={(e) => setLeaveQuotas(p => ({ ...p, [key]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                                onFocus={(e) => e.target.select()}
                                                className="w-16 text-center bg-[#F8F9FB] border-[1.5px] border-[#D1D5E0] rounded-[7px] py-1.5 text-[13px] font-bold outline-none focus:border-[#3B4FE4] transition-colors"
                                                style={{ color }}
                                            />
                                            <span className="text-[11px] text-[#9CA3AF]">{t.days_per_year}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Save button ── */}
                    <button
                        onClick={handleSave}
                        disabled={isSavingLocal}
                        className={`relative overflow-hidden flex items-center justify-center gap-2 w-full py-3 rounded-[12px] text-white text-[14px] font-bold border-none transition-all
                              ${isSavingLocal ? 'bg-[#7B8CED] cursor-wait text-transparent' : 'bg-[#3B4FE4] cursor-pointer hover:bg-[#2A3BC0] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(59,79,228,0.32)]'}`}
                    >
                        <div className={`flex items-center gap-2 transition-opacity ${isSavingLocal ? 'opacity-0' : 'opacity-100'}`}>
                            <CheckCircle2 size={16} />
                            <span>{saved ? t.saved_success : t.save_settings}</span>
                        </div>
                        {isSavingLocal && (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <AnimatedWaitText />
                            </div>
                        )}
                    </button>

                </div>
            </div>
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function InputWithIcon({ Icon, suffix, color, children }) {
    return (
        <div className="flex items-center bg-[#F8F9FB] border-[1.5px] border-[#D1D5E0] rounded-[8px] overflow-hidden focus-within:border-[#3B4FE4] transition-colors">
            <div className="px-2.5 h-[38px] flex items-center justify-center bg-white border-r border-[#E8EAEF] shrink-0">
                <Icon size={13} style={{ color }} />
            </div>
            <div className="flex-1 flex items-center px-2.5 h-[38px] min-w-0">
                {children}
            </div>
            {suffix && (
                <span className="pr-2.5 text-[11px] font-semibold text-[#9CA3AF] shrink-0 whitespace-nowrap">{suffix}</span>
            )}
        </div>
    );
}

const AnimatedWaitText = () => {
    const [dots, ReactSetDots] = React.useState('');
    React.useEffect(() => {
        const seq = ['.  ', '.. ', '...', '.. '];
        let i = 0;
        const t = setInterval(() => { i = (i + 1) % seq.length; ReactSetDots(seq[i]); }, 300);
        return () => clearInterval(t);
    }, []);
    return <span className="inline-block text-left whitespace-pre">{dots}</span>;
};
