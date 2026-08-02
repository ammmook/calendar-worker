import React, { useMemo, useState, useRef } from 'react';
import {
    TrendingUp, Banknote, CircleDollarSign, Timer,
    UmbrellaOff, Stethoscope, Baby, Plane, BookOpen,
    CalendarDays, ChevronLeft, ChevronRight, Info,
    ArrowUpRight, Award, Moon, List, PieChart, LayoutGrid,
} from 'lucide-react';
import { getLang } from '../locales';
import { WorkEntryAPI } from '../services/api';
import { DonutChart, LegendRow } from './charts';

import { OT_MODE } from './ProfilePage';

// ── Design tokens (mirrors App.jsx / timeflow.css) ────────────────────────────
const C = {
    indigo: '#3B4FE4',
    indigoLt: '#EEF0FD',
    indigoMid: '#C7CCFA',
    indigoDk: '#2A3BC0',
    amber: '#c29302',
    amberLt: '#fffdef',
    amberBar: '#fbde3a',
    green: '#10B981',
    greenLt: '#ECFDF5',
    ink1: '#111827',
    ink2: '#374151',
    ink3: '#6B7280',
    ink4: '#9CA3AF',
    border: '#E8EAEF',
    borderDk: '#D1D5E0',
    bg: '#F8F9FB',
    surface: '#FFFFFF',
    holiday: 'rgba(153,142,217,0.15)',
    holidayBdr: 'rgba(153,142,217,0.4)',
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// OT tier colors (สำหรับโดนัทกราฟ) — เฉดอำพัน
const OT_TIER_COLORS = ['#fcd34d', '#c29302', '#92700a'];

const fmtB = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt1 = (n) => n.toFixed(1);

// Weekend rest days removed due to custom monthly logic not matching daily work log

// ─────────────────────────────────────────────────────────────────────────────
export default function YearlyDashboard({
    userEmail, entries, earningsSummary, holidays, salary, otRate, std,
    otMode, leaveQuotas, lang,
    paymentType = 'monthly',
    dailyRate = 0,
    socialSecurity = 0,
    viewY,
    setViewY,
    showToast
}) {
    const t = getLang(lang || 'th');
    const today = useMemo(() => new Date(), []);
    const [year, setYear] = useState(today.getFullYear());
    const [tooltip, setTooltip] = useState(null);   // { monthIdx, x, y }
    const [tab, setTab] = useState('summary'); // 'summary' | 'graph' | 'list'
    const chartRef = useRef(null);

    const [localEarningsSummary, setLocalEarningsSummary] = useState(earningsSummary || { monthly: [], yearly: {} });
    const [loadingYear, setLoadingYear] = useState(false);

    // Sync local year with viewY when viewY changes from the header dropdown
    React.useEffect(() => {
        if (viewY && viewY !== year) {
            setYear(viewY);
        }
    }, [viewY]);

    React.useEffect(() => {
        if (year === today.getFullYear() && earningsSummary?.yearly?.year_num === year) {
            setLocalEarningsSummary(earningsSummary);
            return;
        }
        let active = true;
        setLoadingYear(true);
        WorkEntryAPI.getEarningsSummary(userEmail, year).then(res => {
            if (active && res.success && res.data) {
                setLocalEarningsSummary(res.data);
            }
            if (active) setLoadingYear(false);
        }).catch(err => {
            console.error('Failed to fetch yearly earnings', err);
            if (active) setLoadingYear(false);
        });
        return () => { active = false; };
    }, [year, userEmail, earningsSummary]);

    // ── Define leave types with dynamic max values from props ──
    const LEAVE_TYPES = useMemo(() => [
        { key: 'sick', label: 'Sick Leave', icon: Stethoscope, color: '#F43F5E', bg: '#FFF1F3', max: leaveQuotas?.sick || 0 },
        { key: 'personal', label: 'Personal Leave', icon: UmbrellaOff, color: '#F472B6', bg: '#FCE7F3', max: leaveQuotas?.personal || 0 },
        { key: 'vacation', label: 'Annual Leave', icon: Plane, color: '#3B4FE4', bg: '#EEF0FD', max: leaveQuotas?.vacation || 0 },
    ], [leaveQuotas]);

    // ── Calculate leave data from entries ──
    const leaveData = useMemo(() => {
        const counts = { sick: 0, personal: 0, vacation: 0 };
        Object.keys(entries).forEach((dateStr) => {
            const [y] = dateStr.split('-');
            if (Number(y) !== year) return;

            const entry = entries[dateStr];
            if (entry?.leave?.type) {
                counts[entry.leave.type] = (counts[entry.leave.type] || 0) + 1;
            }
        });
        return counts;
    }, [entries, year]);

    // ── Compute per-month stats ────────────────────────────────────────────────
    const monthlyStats = useMemo(() => {
        return t.short_months.map((_, mIdx) => {
            const beMonth = (localEarningsSummary.monthly || []).find(m => m.month_num === mIdx + 1);

            const regEarn = beMonth?.total_regular_earning || 0;

            const otEarn = beMonth?.total_ot_earning || 0;
            const shiftEarn = beMonth?.total_shift_allowance || 0;

            return {
                month: t.short_months[mIdx],
                fullMonth: t.months[mIdx],
                mIdx,
                regHours: beMonth?.total_working_hour || 0,
                otHours: beMonth?.total_ot_hour || 0,
                daysWorked: beMonth?.days_worked || 0,
                otDays: beMonth?.ot_days || 0,
                shiftDays: beMonth?.shift_days || 0,
                regEarn,
                otEarn,
                shiftEarn,
                // OT แยกอัตรา (ot1 = วันหยุด 8 ชม.แรก, ot15 = วันปกติ, ot3 = วันหยุดเลย 8 ชม.)
                ot1Hours: beMonth?.total_ot_hour_1 || 0,
                ot1Earn: beMonth?.total_ot_earning_1 || 0,
                ot15Hours: beMonth?.total_ot_hour_15 || 0,
                ot15Earn: beMonth?.total_ot_earning_15 || 0,
                ot3Hours: beMonth?.total_ot_hour_3 || 0,
                ot3Earn: beMonth?.total_ot_earning_3 || 0,
                // ใช้ยอด total_earning ที่ backend คำนวณจากข้อมูลทั้งหมดใน DB (รวมเบี้ยกะแล้ว)
                totalEarn: beMonth?.total_earning != null
                    ? beMonth.total_earning
                    : (regEarn + otEarn + shiftEarn),
            };
        });
    }, [localEarningsSummary.monthly, t, paymentType, salary]);

    // ── Yearly totals ──────────────────────────────────────────────────────────
    const yearTotals = useMemo(() => ({
        totalEarn: monthlyStats.reduce((s, m) => s + m.totalEarn, 0),
        totalOTEarn: monthlyStats.reduce((s, m) => s + m.otEarn, 0),
        totalRegEarn: monthlyStats.reduce((s, m) => s + m.regEarn, 0),
        totalOTHrs: monthlyStats.reduce((s, m) => s + m.otHours, 0),
        totalDays: monthlyStats.reduce((s, m) => s + m.daysWorked, 0),
        totalShiftEarn: monthlyStats.reduce((s, m) => s + m.shiftEarn, 0),
        totalShiftDays: monthlyStats.reduce((s, m) => s + m.shiftDays, 0),
        totalOT1Hrs: monthlyStats.reduce((s, m) => s + m.ot1Hours, 0),
        totalOT1Earn: monthlyStats.reduce((s, m) => s + m.ot1Earn, 0),
        totalOT15Hrs: monthlyStats.reduce((s, m) => s + m.ot15Hours, 0),
        totalOT15Earn: monthlyStats.reduce((s, m) => s + m.ot15Earn, 0),
        totalOT3Hrs: monthlyStats.reduce((s, m) => s + m.ot3Hours, 0),
        totalOT3Earn: monthlyStats.reduce((s, m) => s + m.ot3Earn, 0),
        bestMonth: monthlyStats.reduce((best, m) => m.totalEarn > best.totalEarn ? m : best, monthlyStats[0] || { totalEarn: 0 }),
    }), [monthlyStats]);

    // ── OT tier summary (รายปี) ──
    const otTiers = [
        { key: '1', label: t.ot_x1, hint: t.ot_x1_hint, hours: yearTotals.totalOT1Hrs, earn: yearTotals.totalOT1Earn, color: OT_TIER_COLORS[0] },
        { key: '15', label: t.ot_x15, hint: t.ot_x15_hint, hours: yearTotals.totalOT15Hrs, earn: yearTotals.totalOT15Earn, color: OT_TIER_COLORS[1] },
        { key: '3', label: t.ot_x3, hint: t.ot_x3_hint, hours: yearTotals.totalOT3Hrs, earn: yearTotals.totalOT3Earn, color: OT_TIER_COLORS[2] },
    ];

    const totalLeave = LEAVE_TYPES.reduce((s, lt) => s + (leaveData[lt.key] || 0), 0);

    // ── Income breakdown (รายปี) — gross = reg+ot+shift ; net = total_earning (หัก SS แล้วจาก backend) ──
    const grossEarn = yearTotals.totalRegEarn + yearTotals.totalOTEarn + yearTotals.totalShiftEarn;
    const netEarn = yearTotals.totalEarn;
    const ssDeducted = Math.max(0, grossEarn - netEarn);

    const tabs = [
        { id: 'summary', Icon: LayoutGrid, label: t.tab_summary },
        { id: 'graph', Icon: PieChart, label: t.tab_graph },
        { id: 'list', Icon: List, label: t.tab_worklog },
    ];

    // ── Chart geometry ─────────────────────────────────────────────────────────
    const CHART_H = 220;
    const CHART_PAD = { top: 20, right: 10, bottom: 36, left: 52 };
    const maxVal = Math.max(...monthlyStats.map(m => m.totalEarn), salary * 1.2);
    const yTicks = 4;

    const barGroup = (idx, totalW) => {
        const inner = totalW - CHART_PAD.left - CHART_PAD.right;
        const groupW = inner / 12;
        const bW = Math.max(groupW * 0.55, 8);
        const x = CHART_PAD.left + idx * groupW + (groupW - bW) / 2;
        return { x, bW, groupW };
    };

    const yScale = (v) =>
        CHART_PAD.top + (CHART_H - CHART_PAD.top - CHART_PAD.bottom) * (1 - v / maxVal);

    // ── Tooltip position handler ───────────────────────────────────────────────
    const handleBarHover = (mIdx) => {
        setTooltip({ mIdx });
    };

    // ── Bar chart (แนวโน้มรายได้) — reuse ในแท็บ Graph ──
    const barChart = (
        <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                <div>
                    <div className="text-[15px] font-bold text-[#111827]">{t.monthly_earnings_title} {year}</div>
                    <div className="text-[11px] text-[#9CA3AF] mt-0.5">{t.hover_bars}</div>
                </div>
                {/* Legend */}
                <div className="hidden sm:flex items-center gap-4">
                    <LegendDot color="#3B4FE4" label={t.regular} />
                    <LegendDot color="#fbde3a" label={t.overtime} />
                    <LegendDot color="#FDBA74" label={t.shift_short} />
                </div>
            </div>

            {/* SVG Chart */}
            <div
                ref={chartRef}
                className="relative px-2 pt-4 pb-2"
                onMouseLeave={() => setTooltip(null)}
            >
                <svg
                    width="100%"
                    height={CHART_H}
                    viewBox={`0 0 800 ${CHART_H}`}
                    preserveAspectRatio="none"
                    className="overflow-visible"
                >
                    {/* Y-axis grid lines + labels */}
                    {Array.from({ length: yTicks + 1 }).map((_, i) => {
                        const val = (maxVal / yTicks) * (yTicks - i);
                        const y = yScale(val);
                        return (
                            <g key={i}>
                                <line
                                    x1={CHART_PAD.left} y1={y} x2={800 - CHART_PAD.right} y2={y}
                                    stroke="#E8EAEF" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '4 3'}
                                />
                                <text
                                    x={CHART_PAD.left - 6} y={y + 4}
                                    textAnchor="end" fill="#9CA3AF"
                                    style={{ fontSize: 9, fontFamily: 'Google Sans, sans-serif' }}
                                >
                                    {val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {monthlyStats.map((m, idx) => {
                        const totalW = 800;
                        const { x, bW } = barGroup(idx, totalW);
                        const regH = m.regEarn > 0 ? (CHART_H - CHART_PAD.top - CHART_PAD.bottom) * (m.regEarn / maxVal) : 0;
                        const otH = m.otEarn > 0 ? (CHART_H - CHART_PAD.top - CHART_PAD.bottom) * (m.otEarn / maxVal) : 0;
                        const shiftH = m.shiftEarn > 0 ? (CHART_H - CHART_PAD.top - CHART_PAD.bottom) * (m.shiftEarn / maxVal) : 0;
                        const totalH = regH + otH + shiftH;
                        const baseY = CHART_H - CHART_PAD.bottom;
                        const isActive = tooltip?.mIdx === idx;

                        return (
                            <g key={idx}>
                                {/* Hover zone */}
                                <rect
                                    x={x - 4} y={CHART_PAD.top}
                                    width={bW + 8} height={CHART_H - CHART_PAD.top - CHART_PAD.bottom}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => handleBarHover(idx)}
                                    onClick={() => handleBarHover(idx)}
                                    onTouchStart={() => handleBarHover(idx)}
                                />

                                {/* Hover highlight */}
                                {isActive && (
                                    <rect
                                        x={x - 4} y={CHART_PAD.top}
                                        width={bW + 8} height={CHART_H - CHART_PAD.top - CHART_PAD.bottom}
                                        fill="#EEF0FD"
                                    />
                                )}

                                {/* Regular bar */}
                                {regH > 0 && (
                                    <rect
                                        x={x} y={baseY - regH}
                                        width={bW} height={regH}
                                        fill={isActive ? '#3B4FE4' : '#C7CCFA'}
                                        style={{ transition: 'fill 0.15s' }}
                                    />
                                )}

                                {/* OT bar (stacked on top) */}
                                {otH > 0 && (
                                    <rect
                                        x={x} y={baseY - regH - otH}
                                        width={bW} height={otH}
                                        fill={isActive ? '#fbde3a' : '#FDE68A'}
                                        style={{ transition: 'fill 0.15s' }}
                                    />
                                )}

                                {/* Shift bar (light orange, stacked on top of OT) */}
                                {shiftH > 0 && (
                                    <rect
                                        x={x} y={baseY - regH - otH - shiftH}
                                        width={bW} height={shiftH}
                                        fill={isActive ? '#FB923C' : '#FED7AA'}
                                        style={{ transition: 'fill 0.15s' }}
                                    />
                                )}

                                {/* Empty bar placeholder */}
                                {totalH === 0 && (
                                    <rect
                                        x={x} y={baseY - 3}
                                        width={bW} height={3}
                                        fill="#E8EAEF"
                                    />
                                )}

                                {/* Month label */}
                                <text
                                    x={x + bW / 2} y={CHART_H - CHART_PAD.bottom + 14}
                                    textAnchor="middle" fill={isActive ? '#3B4FE4' : '#9CA3AF'}
                                    style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, fontFamily: 'Google Sans, sans-serif', transition: 'fill 0.15s' }}
                                >
                                    {m.month}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {tooltip !== null && (() => {
                    const mIdx = tooltip.mIdx;
                    const m = monthlyStats[mIdx];
                    const totalW = chartRef.current?.offsetWidth || 800;
                    const { x, bW } = barGroup(mIdx, totalW);
                    const TW = 200;

                    let tx = x + (bW / 2) - (TW / 2);
                    let ty = 20;

                    if (tx < 8) tx = 8;
                    if (tx + TW > totalW - 8) tx = totalW - TW - 8;

                    return (
                        <div
                            className="absolute pointer-events-none z-20 bg-white border border-[#E8EAEF] rounded-xl shadow-[0_8px_28px_rgba(17,24,39,0.12)] p-3.5"
                            style={{ left: tx, top: ty, width: TW }}
                        >
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-[13px] font-bold text-[#111827]">{m.fullMonth}</span>
                                <span className="text-[10px] font-semibold text-[#9CA3AF]">{m.daysWorked} {t.table_days}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <TooltipRow label={t.total} value={fmtB(m.totalEarn)} color="#111827" bold />
                                <div className="border-t border-[#E8EAEF] my-0.5" />
                                <TooltipRow label={t.regular} value={fmtB(m.regEarn)} color="#3B4FE4" />
                                <TooltipRow label={t.ot_earnings} value={fmtB(m.otEarn)} color="#c29302" />
                                <TooltipRow label={t.shift_earnings} value={fmtB(m.shiftEarn)} color="#E8730C" />
                                <div className="border-t border-[#E8EAEF] my-0.5" />
                                <TooltipRow label={t.total_ot_hours} value={`${fmt1(m.otHours)}h`} color="#9CA3AF" />
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 animate-[fadeUp_0.4s_ease_both]">

            {/* ── Page header: tabs (แทน title) + year picker ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1 bg-[#F8F9FB] border border-[#E8EAEF] rounded-[12px] p-1">
                    {tabs.map(({ id, Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] font-semibold cursor-pointer transition-all
                                ${tab === id
                                    ? 'bg-white text-[#3B4FE4] shadow-[0_1px_3px_rgba(17,24,39,0.08)]'
                                    : 'text-[#6B7280] hover:text-[#374151]'}`}
                        >
                            <Icon size={14} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Year picker */}
                <div className="flex items-center gap-2 bg-white border border-[#E8EAEF] rounded-xl px-1 py-1 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
                    <button
                        onClick={() => {
                            if (setViewY) setViewY(year - 1);
                            else setYear(y => y - 1);
                        }}
                        className="w-8 h-8 rounded-lg grid place-items-center text-[#6B7280] hover:bg-[#EEF0FD] hover:text-[#3B4FE4] cursor-pointer transition-all"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <div className="relative flex items-center justify-center">
                        <select
                            value={year}
                            onChange={(e) => {
                                const newY = Number(e.target.value);
                                if (setViewY) setViewY(newY);
                                else setYear(newY);
                                if (showToast) showToast(lang === 'th' ? 'กำลังโหลดข้อมูล...' : 'Loading data...');
                            }}
                            className="appearance-none bg-transparent font-bold text-[15px] text-[#111827] tabular-nums px-2 cursor-pointer outline-none text-center hover:text-[#3B4FE4]"
                        >
                            {Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i).map((y) => (
                                <option key={y} value={y}>{lang === 'th' ? y + 543 : y}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => {
                            if (setViewY) setViewY(year + 1);
                            else setYear(y => y + 1);
                        }}
                        className="w-8 h-8 rounded-lg grid place-items-center text-[#6B7280] hover:bg-[#EEF0FD] hover:text-[#3B4FE4] cursor-pointer transition-all"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            </div>

            {/* ══════════════ TAB: LIST (รายละเอียดรายเดือน) ══════════════ */}
            {tab === 'list' && (
                <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden animate-[fadeUp_0.35s_ease_both]">
                    <div className="flex items-start justify-between px-5 py-4 border-b border-[#E8EAEF]">
                        <div>
                            <div className="text-[15px] font-bold text-[#111827]">{t.monthly_breakdown}</div>
                            {socialSecurity > 0 && (
                                <div className="text-[11px] font-medium text-[#F43F5E] mt-1">
                                    {t.social_security_monthly_note} {fmtB(socialSecurity)}
                                </div>
                            )}
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] shrink-0">{t.per_month}</div>
                    </div>
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-[13px] sm:text-sm">
                            <thead>
                                <tr className="border-b border-[#E8EAEF]">
                                    {[t.table_month, t.table_days, t.table_reg, t.table_ot, t.table_shift, t.table_total].map((h, i) => (
                                        <th key={h} className={`px-2 sm:px-4 py-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] ${i === 0 ? 'text-left' : 'text-right'}`}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyStats.map((m, i) => {
                                    const isCurr = m.mIdx === today.getMonth() && year === today.getFullYear();
                                    return (
                                        <tr
                                            key={i}
                                            className={`border-b border-[#F3F4F8] transition-colors hover:bg-[#F8F9FB] cursor-default
                        ${isCurr ? 'bg-[#EEF0FD]/40' : ''}`}
                                        >
                                            <td className="px-2 sm:px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-bold w-[6px] h-[6px] rounded-full shrink-0 ${m.totalEarn > 0 ? 'bg-[#3B4FE4]' : 'bg-[#E8EAEF]'}`} />
                                                    <span className={`text-[13px] font-semibold ${isCurr ? 'text-[#3B4FE4]' : 'text-[#374151]'}`}>
                                                        {m.fullMonth}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-4 py-2.5 text-right text-[12px] text-[#6B7280]">{m.daysWorked}</td>
                                            <td className="px-2 sm:px-4 py-2.5 text-right text-[12px] font-semibold text-[#10B981]">
                                                {m.regEarn > 0 ? fmtB(m.regEarn) : <span className="text-[#D1D5E0]">—</span>}
                                            </td>
                                            <td className="px-2 sm:px-4 py-2.5 text-right text-[12px] font-semibold text-[#c29302]">
                                                {m.otEarn > 0 ? fmtB(m.otEarn) : <span className="text-[#D1D5E0]">—</span>}
                                            </td>
                                            <td className="px-2 sm:px-4 py-2.5 text-right text-[12px] font-semibold text-[#E8730C]">
                                                {m.shiftEarn > 0 ? fmtB(m.shiftEarn) : <span className="text-[#D1D5E0]">—</span>}
                                            </td>
                                            <td className="px-2 sm:px-4 py-2.5 text-right">
                                                <span className={`text-[13px] font-bold ${m.totalEarn > 0 ? 'text-[#111827]' : 'text-[#D1D5E0]'}`}>
                                                    {m.totalEarn > 0 ? fmtB(m.totalEarn) : '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Totals row */}
                            <tfoot>
                                <tr className="bg-[#F8F9FB] border-t-2 border-[#E8EAEF]">
                                    <td className="px-2 sm:px-4 py-3 text-[12px] font-bold text-[#111827]">{t.total_year} {year}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-[12px] font-bold text-[#374151]">{yearTotals.totalDays}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-[12px] font-bold text-[#10B981]">{fmtB(yearTotals.totalRegEarn)}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-[12px] font-bold text-[#c29302]">{fmtB(yearTotals.totalOTEarn)}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-[12px] font-bold text-[#E8730C]">{fmtB(yearTotals.totalShiftEarn)}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-[14px] font-bold text-[#3B4FE4]">{fmtB(yearTotals.totalEarn)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════ TAB: GRAPH ══════════════ */}
            {tab === 'graph' && (
                <div className="flex flex-col gap-5 animate-[fadeUp_0.35s_ease_both]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Income breakdown donut */}
                        <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex flex-col">
                            <div className="px-5 py-4 border-b border-[#E8EAEF] text-[15px] font-bold text-[#111827]">
                                {t.income_breakdown}
                            </div>
                            <div className="p-5 flex flex-col items-center gap-4">
                                <DonutChart
                                    size={210}
                                    thickness={30}
                                    centerLabel={t.gross_income}
                                    centerValue={fmtB(grossEarn)}
                                    segments={[
                                        { label: t.regular_earnings, value: yearTotals.totalRegEarn, color: '#3B4FE4' },
                                        { label: t.ot_earnings, value: yearTotals.totalOTEarn, color: '#c29302' },
                                        { label: t.shift_earnings, value: yearTotals.totalShiftEarn, color: '#E8730C' },
                                    ]}
                                />
                                <div className="w-full flex flex-col gap-2">
                                    <LegendRow color="#3B4FE4" label={t.regular_earnings} value={fmtB(yearTotals.totalRegEarn)} total={grossEarn} raw={yearTotals.totalRegEarn} />
                                    <LegendRow color="#c29302" label={t.ot_earnings} value={fmtB(yearTotals.totalOTEarn)} total={grossEarn} raw={yearTotals.totalOTEarn} />
                                    <LegendRow color="#E8730C" label={t.shift_earnings} value={fmtB(yearTotals.totalShiftEarn)} total={grossEarn} raw={yearTotals.totalShiftEarn} />
                                </div>
                                <div className="w-full mt-1 pt-4 border-t border-[#E8EAEF] flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-[13px]">
                                        <span className="text-[#6B7280]">{t.gross_income}</span>
                                        <span className="font-semibold text-[#111827]">{fmtB(grossEarn)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[13px]">
                                        <span className="text-[#6B7280]">{t.less_social_security}</span>
                                        <span className="font-semibold text-[#EF4444]">−{fmtB(ssDeducted)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-dashed border-[#E8EAEF]">
                                        <span className="text-[13px] font-bold text-[#111827]">{t.net_remaining}</span>
                                        <span className="text-[18px] font-bold text-[#10B981]">{fmtB(netEarn)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* OT breakdown donut */}
                        <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                                <span className="text-[15px] font-bold text-[#111827]">{t.ot_breakdown}</span>
                                <span className="text-[11px] text-[#9CA3AF]">{fmt1(yearTotals.totalOTHrs)}h</span>
                            </div>
                            <div className="p-5 flex flex-col items-center gap-4">
                                <DonutChart
                                    size={210}
                                    thickness={30}
                                    centerLabel={t.total_ot_earnings}
                                    centerValue={fmtB(yearTotals.totalOTEarn)}
                                    segments={otTiers.map((tier) => ({ label: tier.label, value: tier.earn, color: tier.color }))}
                                />
                                <div className="w-full flex flex-col gap-2">
                                    {otTiers.map((tier) => (
                                        <LegendRow
                                            key={tier.key}
                                            color={tier.color}
                                            label={tier.label}
                                            sub={`${fmt1(tier.hours)}h · ${tier.hint}`}
                                            value={fmtB(tier.earn)}
                                            total={yearTotals.totalOTEarn}
                                            raw={tier.earn}
                                        />
                                    ))}
                                </div>
                                <div className="w-full mt-1 pt-4 border-t border-[#E8EAEF] flex items-center justify-between">
                                    <span className="text-[13px] font-bold text-[#111827]">{t.total_ot_earnings}</span>
                                    <span className="text-[18px] font-bold text-[#c29302]">{fmtB(yearTotals.totalOTEarn)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* กราฟแนวโน้มรายได้ — อยู่ล่างสุด */}
                    {barChart}
                </div>
            )}

            {/* ══════════════ TAB: SUMMARY (Grid) ══════════════ */}
            {tab === 'summary' && (
                <div className="flex flex-col gap-5 animate-[fadeUp_0.35s_ease_both]">

                    {/* Annual KPI cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

                        {/* OT Earnings */}
                        <AnnualCard
                            Icon={TrendingUp}
                            label={t.ot_earnings}
                            value={fmtB(yearTotals.totalOTEarn)}
                            sub={`${fmt1(yearTotals.totalOTHrs)}h ${t.total_ot_hours}`}
                            iconCls="bg-[#fffdef] text-[#c29302]"
                            valCls="text-[#c29302]"
                            stripe="bg-[#fbde3a]"
                        />

                        {/* Shift Pay */}
                        <AnnualCard
                            Icon={Moon}
                            label={t.shift_earnings}
                            value={fmtB(yearTotals.totalShiftEarn)}
                            sub={`${yearTotals.totalShiftDays} ${t.shift_days_label}`}
                            iconCls="bg-[#FFF3E6] text-[#E8730C]"
                            valCls="text-[#E8730C]"
                            stripe="bg-[#FDBA74]"
                        />

                        {/* Regular */}
                        <AnnualCard
                            Icon={Banknote}
                            label={t.regular_earnings}
                            value={fmtB(yearTotals.totalRegEarn)}
                            sub={`${yearTotals.totalDays} ${t.worked_days}`}
                            iconCls="bg-[#ECFDF5] text-[#10B981]"
                            valCls="text-[#10B981]"
                            stripe="bg-[#10B981]"
                        />

                        {/* OT Hours */}
                        <AnnualCard
                            Icon={Timer}
                            label={t.total_ot_hours}
                            value={`${fmt1(yearTotals.totalOTHrs)}h`}
                            sub={t.across_months}
                            iconCls="bg-[#EEF0FD] text-[#3B4FE4]"
                            valCls="text-[#3B4FE4]"
                            stripe="bg-[#3B4FE4]"
                        />

                        {/* Total annual */}
                        <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A5AEFC] to-[#8995F4] p-4 sm:p-5 shadow-[0_8px_24px_rgba(137,149,244,0.3)] cursor-default transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(137,149,244,0.4)]">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-[8px] bg-white/25 grid place-items-center">
                                    <CircleDollarSign size={15} className="text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-white/80 uppercase tracking-[0.1em]">{t.total_year} {year}</span>
                            </div>
                            <div className="text-[1.4rem] sm:text-[1.85rem] font-bold text-white leading-none tracking-tight">
                                {fmtB(yearTotals.totalEarn)}
                            </div>
                            <div className="text-[11px] text-white/70 mt-1.5">{yearTotals.totalDays} {t.worked_days}</div>
                            {yearTotals.bestMonth && (
                                <div className="absolute top-4 right-4 bg-white/20 text-white/90 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.06em] flex items-center gap-1">
                                    <Award size={8} /> <span className="hidden sm:inline">{t.best_month}</span> {yearTotals.bestMonth.month}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* OT by rate — แสดงเป็นแถวชิดๆ (ไม่ใช่แถบชาร์จพลัง) */}
                    <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                            <div className="text-[15px] font-bold text-[#111827]">{t.ot_by_rate}</div>
                            <div className="text-[11px] text-[#9CA3AF]">{fmt1(yearTotals.totalOTHrs)}h · {fmtB(yearTotals.totalOTEarn)}</div>
                        </div>
                        <div className="p-2.5 flex flex-col gap-0.5">
                            {otTiers.map((tier) => (
                                <div key={tier.key} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-[#fffdef] transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-[6px] grid place-items-center shrink-0 bg-[#fffdef]">
                                            <Timer size={12} className="text-[#c29302]" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[12px] font-bold text-[#374151] leading-tight">{tier.label}</div>
                                            <div className="text-[10px] text-[#9CA3AF] leading-tight truncate">{tier.hint}</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 leading-tight">
                                        <div className="text-[12px] font-bold text-[#c29302]">{tier.earn > 0 ? '+' + fmtB(tier.earn) : '—'}</div>
                                        <div className="text-[10px] text-[#9CA3AF]">{fmt1(tier.hours)} h</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-5 py-3.5 border-t border-[#E8EAEF] flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em]">{t.total_ot_hours}</span>
                            <span className="text-[15px] font-bold text-[#c29302]">{fmt1(yearTotals.totalOTHrs)}<span className="text-[11px] font-normal text-[#9CA3AF]">h</span></span>
                        </div>
                    </div>

                    {/* Leave Summary */}
                    <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                            <div className="text-[15px] font-bold text-[#111827]">{t.leave_summary}</div>
                            <div className="text-[11px] text-[#9CA3AF]">{totalLeave} {t.leave_used}</div>
                        </div>

                        <div className="p-4 flex flex-col gap-3 flex-1">
                            {LEAVE_TYPES.map((lt) => {
                                const used = leaveData[lt.key] || 0;
                                const pct = Math.min((used / lt.max) * 100, 100);
                                const LeaveIcon = lt.icon;
                                return (
                                    <div key={lt.key} className="group">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-[6px] grid place-items-center shrink-0" style={{ background: lt.bg }}>
                                                    <LeaveIcon size={12} style={{ color: lt.color }} />
                                                </div>
                                                <span className="text-[12px] font-semibold text-[#374151]">
                                                    {lt.key === 'sick' ? t.sick_leave : lt.key === 'personal' ? t.personal_leave : t.vacation_leave}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[12px] font-bold" style={{ color: lt.color }}>
                                                    {used}
                                                </span>
                                                <span className="text-[11px] text-[#9CA3AF]">/ {lt.max}</span>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-[5px] bg-[#F3F4F8] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, background: lt.color, opacity: 0.75 }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Leave total summary */}
                            <div className="mt-2 pt-3 border-t border-[#E8EAEF] flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em]">{t.total_leave_taken}</span>
                                <span className="text-[15px] font-bold text-[#111827]">{totalLeave} <span className="text-[11px] font-normal text-[#9CA3AF]">{t.days_unit}</span></span>
                            </div>

                            {/* Info note */}
                            <div className="flex items-start gap-2 bg-[#F8F9FB] rounded-[8px] p-2.5 mt-1">
                                <Info size={12} className="text-[#9CA3AF] mt-0.5 shrink-0" />
                                <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
                                    {t.leave_info} {year}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function AnnualCard({ Icon, label, value, sub, iconCls, valCls, stripe }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#E8EAEF] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] cursor-default transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]">
            <span className={`absolute top-0 left-5 right-5 h-[3px] rounded-b-[4px] opacity-60 ${stripe}`} />
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] grid place-items-center mb-3 ${iconCls}`}>
                <Icon size={14} strokeWidth={2} className="sm:hidden" />
                <Icon size={16} strokeWidth={2} className="hidden sm:block" />
            </div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] sm:tracking-[0.1em] mb-1 truncate">{label}</div>
            <div className={`text-[1.4rem] sm:text-[1.65rem] font-bold leading-none tracking-tight truncate ${valCls}`}>{value}</div>
            {sub && <div className="text-[10px] sm:text-[11px] mt-1.5 text-[#9CA3AF] truncate">{sub}</div>}
        </div>
    );
}

function LegendDot({ color, label }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} />
            <span className="text-[11px] text-[#6B7280] font-medium">{label}</span>
        </div>
    );
}

function TooltipRow({ label, value, color, bold }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6B7280]">{label}</span>
            <span className="text-[12px] font-bold" style={{ color: color || '#111827', fontWeight: bold ? 800 : 700 }}>
                {value}
            </span>
        </div>
    );
}
