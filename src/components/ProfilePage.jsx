import React, { useState } from 'react';
import {
    Briefcase, Wallet, Clock, CircleDollarSign,
    Stethoscope, UmbrellaOff, Plane,
    ChevronLeft, CheckCircle2,
    Zap, Timer, AlertCircle,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { getLang } from '../locales';

/* ─────────────────────────────────────────────────────────────────────────────
   ProfilePage
   ─ Tab 1 "Personal": name, email, avatar (Google)
   ─ Tab 2 "Work"    : salary, OT rate, std hours, leave quotas, OT mode
   ───────────────────────────────────────────────────────────────────────────── */

// ── OT Calculation Mode ───────────────────────────────────────────────────────
// MODE A: ต่อชั่วโมง — ทุก OT ชม. คิดเต็มตามอัตรา
// MODE B: ชั่วโมงเต็ม — ต้องทำครบชั่วโมง ส่วนที่เหลือจะถูกตัดออก
//         e.g. ทำ OT 4 ชม. → 2 ชม. แรกเต็ม → ครึ่งชม. ท้ายหัก → ได้ 3.5 ชม.
//         (หาก OT > maxFullHours ให้หัก deductMins นาทีออกจาก OT สุดท้าย)

export const OT_MODE = {
    HOURLY: 'hourly',   // A: คิดต่อชั่วโมงทุกชม.
    BLOCK: 'block',    // B: ชั่วโมงเต็มเท่านั้น (truncate partial hours)
};

const LEAVE_QUOTAS = [
    { key: 'sick', label: 'ลาป่วย', Icon: Stethoscope, color: '#F43F5E', bg: '#FFF1F3', defaultMax: 30 },
    { key: 'personal', label: 'ลากิจ', Icon: UmbrellaOff, color: '#8B5CF6', bg: '#F5F3FF', defaultMax: 6 },
    { key: 'vacation', label: 'ลาพักร้อน', Icon: Plane, color: '#3B4FE4', bg: '#EEF0FD', defaultMax: 10 },
];

// Shared classes
const labelCls = 'block text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1.5';
const inputCls = 'w-full bg-[#F8F9FB] border-[1.5px] border-[#D1D5E0] rounded-[8px] text-[#111827] text-[13px] font-medium px-3 py-2.5 outline-none transition-colors focus:border-[#3B4FE4] focus:bg-white';
const cardCls = 'bg-white border border-[#E8EAEF] rounded-2xl p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]';

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage({
    // work settings (lifted to App state so changes propagate globally)
    salary, setSalary,
    otRate, setOtRate,
    std, setStd,
    otMode, setOtMode,
    otBlockHours, setOtBlockHours,    // max full-block OT hours before deduction
    otDeductMins, setOtDeductMins,    // minutes to deduct from the last partial block
    leaveQuotas, setLeaveQuotas,
    lang,
    onBack,
}) {
    const { user } = useAuth();
    const t = getLang(lang);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
    };

    // ── OT example preview ───────────────────────────────────────────────────
    const previewOT = (rawOT) => {
        if (otMode === OT_MODE.HOURLY) return rawOT;
        // BLOCK mode: every otBlockHours completed → bonus, then deductMins on last partial
        if (rawOT <= 0) return 0;
        const full = Math.floor(rawOT / otBlockHours) * otBlockHours;
        const partial = rawOT % otBlockHours;
        const deductH = otDeductMins / 60;
        if (partial === 0) return full;
        // partial block exists — apply deduction
        const partialEarned = Math.max(0, partial - deductH);
        return full + partialEarned;
    };

    const eg1 = previewOT(2);      // exactly 2h OT
    const eg2 = previewOT(4);      // 4h OT → should show 3.5 with defaults
    const eg3 = previewOT(otBlockHours); // exactly one full block

    return (
        <div className="min-h-screen bg-[#F8F9FB] font-sans">

            {/* ── TOP BAR ── */}
            <header className="sticky top-0 z-50 w-full h-[60px] bg-white border-b border-[#E8EAEF] flex items-center gap-3 px-6">
                <button
                    onClick={onBack}
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

                        {/* ── Section 1: Earnings ── */}
                        <div className={cardCls}>
                            <h3 className="text-[13px] font-bold text-[#111827] mb-4">{t.work_rate}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                                <div>
                                    <label className={labelCls}>{t.monthly_salary}</label>
                                    <InputWithIcon Icon={Wallet} suffix={t.mo_unit} color="#10B981">
                                        <input
                                            type="number" min="0" value={salary}
                                            onChange={(e) => setSalary(Number(e.target.value))}
                                            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                        />
                                    </InputWithIcon>
                                </div>

                                <div>
                                    <label className={labelCls}>{t.ot_rate}</label>
                                    <InputWithIcon Icon={CircleDollarSign} suffix={t.hr_unit} color="#c29302">
                                        <input
                                            type="number" min="0" value={otRate}
                                            onChange={(e) => setOtRate(Number(e.target.value))}
                                            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                        />
                                    </InputWithIcon>
                                </div>

                                <div>
                                    <label className={labelCls}>{t.standard_hours}</label>
                                    <InputWithIcon Icon={Clock} suffix="h" color="#3B4FE4">
                                        <input
                                            type="number" min="1" max="24" value={std}
                                            onChange={(e) => setStd(Number(e.target.value))}
                                            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                        />
                                    </InputWithIcon>
                                </div>
                            </div>
                        </div>

                        {/* ── Section 2: OT Calculation Mode ── */}
                        <div className={cardCls}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[13px] font-bold text-[#111827]">{t.ot_calc_method}</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

                                {/* Mode A: Hourly */}
                                <OTModeCard
                                    active={otMode === OT_MODE.HOURLY}
                                    onClick={() => setOtMode(OT_MODE.HOURLY)}
                                    Icon={Timer}
                                    title={t.ot_mode_actual}
                                    desc={t.ot_mode_actual_desc}
                                    example={t.ot_eg_actual.replace('{hr}', 4).replace('{hr}', 4)}
                                    accentColor="#3B4FE4"
                                />

                                {/* Mode B: Block */}
                                <OTModeCard
                                    active={otMode === OT_MODE.BLOCK}
                                    onClick={() => setOtMode(OT_MODE.BLOCK)}
                                    Icon={Zap}
                                    title={t.ot_mode_block}
                                    desc={t.ot_mode_block_desc.replace('{hr}', otBlockHours)}
                                    example={t.ot_eg_block.replace('{hr}', 4).replace('{res}', fmt1(eg2))}
                                    accentColor="#c29302"
                                />
                            </div>

                            {/* Block mode config */}
                            {otMode === OT_MODE.BLOCK && (
                                <div className="bg-[#fffdef] border border-[#FDE68A] rounded-xl p-3 animate-[fadeUp_0.25s_ease_both]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle size={13} className="text-[#c29302]" />
                                        <span className="text-[11px] font-bold text-[#92400E] uppercase tracking-[0.06em]">{t.ot_deduction_settings}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={`${labelCls} !text-[#92400E]`}>{t.hrs_per_block}</label>
                                            <InputWithIcon Icon={Clock} suffix="h" color="#c29302">
                                                <input
                                                    type="number" min="1" max="12" value={otBlockHours}
                                                    onChange={(e) => setOtBlockHours(Number(e.target.value))}
                                                    className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                                />
                                            </InputWithIcon>
                                        </div>
                                        <div>
                                            <label className={`${labelCls} !text-[#92400E]`}>{t.deduct_mins}</label>
                                            <InputWithIcon Icon={Timer} suffix="m" color="#c29302">
                                                <input
                                                    type="number" min="0" max="59" value={otDeductMins}
                                                    onChange={(e) => setOtDeductMins(Number(e.target.value))}
                                                    className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#111827] min-w-0"
                                                />
                                            </InputWithIcon>
                                        </div>
                                    </div>

                                </div>
                            )}
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
                                                    type="number" min="0" max="365" value={quota}
                                                    onChange={(e) => setLeaveQuotas(p => ({ ...p, [key]: Number(e.target.value) }))}
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
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-[12px] bg-[#3B4FE4] text-white text-[14px] font-bold cursor-pointer border-none transition-all hover:bg-[#2A3BC0] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(59,79,228,0.32)]"
                        >
                            <CheckCircle2 size={16} />
                            {saved ? t.saved_success : t.save_settings}
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

function OTModeCard({ active, onClick, Icon, title, desc, example, accentColor }) {
    return (
        <button
            onClick={onClick}
            className={`text-left w-full p-3 rounded-xl border-[1.5px] cursor-pointer transition-all
        ${active
                    ? 'border-[#3B4FE4] bg-[#EEF0FD] shadow-[0_0_0_3px_rgba(59,79,228,0.1)]'
                    : 'border-[#E8EAEF] bg-white hover:border-[#C7CCFA]'}`}
        >
            <div className="flex items-center gap-2">
                <div
                    className="w-8 h-8 rounded-lg grid place-items-center"
                    style={{ background: active ? accentColor : '#F8F9FB' }}
                >
                    <Icon size={14} className={active ? 'text-white' : 'text-[#9CA3AF]'} />
                </div>
                <div className="flex flex-col">
                   <div className={`text-[12px] font-bold ${active ? 'text-[#3B4FE4]' : 'text-[#374151]'}`}>{title}</div>
                   <div className="text-[10px] text-[#9CA3AF]">{desc}</div>
                </div>
                {active && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-[#3B4FE4] grid place-items-center">
                        <CheckCircle2 size={10} className="text-white" />
                    </div>
                )}
            </div>
        </button>
    );
}

function fmt1(n) { return typeof n === 'number' ? n.toFixed(1) : '—'; }