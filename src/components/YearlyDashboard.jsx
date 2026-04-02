import React, { useMemo, useState, useRef } from 'react';
import {
    TrendingUp, Banknote, CircleDollarSign, Timer,
    UmbrellaOff, Stethoscope, Baby, Plane, BookOpen,
    CalendarDays, ChevronLeft, ChevronRight, Info,
    ArrowUpRight, Award,
} from 'lucide-react';
import { getLang } from '../locales';

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

const fmtB = (n) => '฿' + Math.round(n).toLocaleString('en-US');
const fmt1 = (n) => n.toFixed(1);

// ─────────────────────────────────────────────────────────────────────────────
export default function YearlyDashboard({ entries, holidays, salary, otRate, std, leaveQuotas, lang }) {
    const t = getLang(lang || 'th');
    const today = useMemo(() => new Date(), []);
    const [year, setYear] = useState(today.getFullYear());
    const [tooltip, setTooltip] = useState(null);   // { monthIdx, x, y }
    const chartRef = useRef(null);

    // ── Define leave types with dynamic max values from props ──
    const LEAVE_TYPES = useMemo(() => [
        { key: 'sick', label: 'Sick Leave', icon: Stethoscope, color: '#F43F5E', bg: '#FFF1F3', max: leaveQuotas?.sick || 30 },
        { key: 'personal', label: 'Personal Leave', icon: UmbrellaOff, color: '#F43F5E', bg: '#FFF1F3', max: leaveQuotas?.personal || 6 },
        { key: 'vacation', label: 'Annual Leave', icon: Plane, color: '#3B4FE4', bg: '#EEF0FD', max: leaveQuotas?.vacation || 10 },
    ], [leaveQuotas]);

    // ── Calculate leave data from entries ──
    const leaveData = useMemo(() => {
        const counts = { sick: 0, personal: 0, vacation: 0 };
        Object.keys(entries).forEach((dateStr) => {
            const entry = entries[dateStr];
            if (entry?.leave?.type) {
                counts[entry.leave.type] = (counts[entry.leave.type] || 0) + 1;
            }
        });
        return counts;
    }, [entries]);

    // ── Compute per-month stats ────────────────────────────────────────────────
    const monthlyStats = useMemo(() => {
        return t.short_months.map((_, mIdx) => {
            const mKey = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
            let tReg = 0, tOT = 0, daysW = 0, otDays = 0;

            Object.keys(entries).forEach((k) => {
                if (!k.startsWith(mKey)) return;
                const e = entries[k];
                if (!e?.in || !e?.out) return;
                const [ih, im] = e.in.split(':').map(Number);
                const [oh, om] = e.out.split(':').map(Number);
                const mins = (oh * 60 + om) - (ih * 60 + im);
                if (mins <= 0) return;
                const total = mins / 60;
                const stdH = parseFloat(std || 8);
                const reg = Math.min(total, stdH);
                const ot = Math.max(0, total - stdH);
                daysW++;
                tReg += reg;
                tOT += ot;
                if (ot > 0) otDays++;
            });

            const regEarn = daysW > 0 ? (salary / 22) * daysW : 0;
            const otEarn = tOT * otRate;
            const totalEarn = regEarn + otEarn;

            return {
                month: t.short_months[mIdx],
                fullMonth: t.months[mIdx],
                mIdx,
                regHours: tReg,
                otHours: tOT,
                daysWorked: daysW,
                otDays,
                regEarn,
                otEarn,
                totalEarn,
            };
        });
    }, [entries, year, salary, otRate, std]);

    // ── Yearly totals ──────────────────────────────────────────────────────────
    const yearTotals = useMemo(() => ({
        totalEarn: monthlyStats.reduce((s, m) => s + m.totalEarn, 0),
        totalOTEarn: monthlyStats.reduce((s, m) => s + m.otEarn, 0),
        totalRegEarn: monthlyStats.reduce((s, m) => s + m.regEarn, 0),
        totalOTHrs: monthlyStats.reduce((s, m) => s + m.otHours, 0),
        totalDays: monthlyStats.reduce((s, m) => s + m.daysWorked, 0),
        bestMonth: monthlyStats.reduce((best, m) => m.totalEarn > best.totalEarn ? m : best, monthlyStats[0]),
    }), [monthlyStats]);

    const totalLeave = LEAVE_TYPES.reduce((s, lt) => s + (leaveData[lt.key] || 0), 0);

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

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 animate-[fadeUp_0.4s_ease_both]">

            {/* ── Page header ── */}
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-[26px] font-bold text-[#111827] tracking-tight leading-tight">
                        {t.annual_overview}
                    </h1>
                    <p className="text-sm text-[#9CA3AF] mt-0.5">
                        {t.yearly_desc}
                    </p>
                </div>

                {/* Year picker */}
                <div className="flex items-center gap-2 bg-white border border-[#E8EAEF] rounded-xl px-1 py-1 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
                    <button
                        onClick={() => setYear(y => y - 1)}
                        className="w-8 h-8 rounded-lg grid place-items-center text-[#6B7280] hover:bg-[#EEF0FD] hover:text-[#3B4FE4] cursor-pointer transition-all"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <span className="px-2 text-[15px] font-bold text-[#111827] tabular-nums">{year}</span>
                    <button
                        onClick={() => setYear(y => y + 1)}
                        className="w-8 h-8 rounded-lg grid place-items-center text-[#6B7280] hover:bg-[#EEF0FD] hover:text-[#3B4FE4] cursor-pointer transition-all"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            </div>

            {/* ── Annual KPI cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeUp_0.4s_0.06s_ease_both]">

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
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A5AEFC] to-[#8995F4] p-4 sm:p-5 shadow-[0_8px_24px_rgba(137,149,244,0.3)] cursor-default transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(137,149,244,0.4)]">
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

            {/* ── Bar Chart ── */}
            <div
                className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden animate-[fadeUp_0.4s_0.12s_ease_both]"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                    <div>
                        <div className="text-[15px] font-bold text-[#111827]">{t.monthly_earnings_title} {year}</div>
                        <div className="text-[11px] text-[#9CA3AF] mt-0.5">{t.hover_bars}</div>
                    </div>
                    {/* Legend */}
                    <div className="hidden sm:flex items-center gap-4">
                        <LegendDot color="#3B4FE4" label={t.regular} />
                        <LegendDot color="#fbde3a" label={t.overtime} />
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
                            const totalH = regH + otH;
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
                                    <div className="border-t border-[#E8EAEF] my-0.5" />
                                    <TooltipRow label={t.total_ot_hours} value={`${fmt1(m.otHours)}h`} color="#9CA3AF" />
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* ── Bottom row: monthly table + leave ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 animate-[fadeUp_0.4s_0.18s_ease_both]">

                {/* Monthly Breakdown Table */}
                <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                        <div className="text-[15px] font-bold text-[#111827]">{t.monthly_breakdown}</div>
                        <div className="text-[11px] text-[#9CA3AF]">{t.per_month}</div>
                    </div>
                    <div className="w-full overflow-hidden">
                        <table className="w-full text-[13px] sm:text-sm">
                            <thead>
                                <tr className="border-b border-[#E8EAEF]">
                                    {[t.table_month, t.table_days, t.table_reg, t.table_ot, t.table_total].map((h, i) => (
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
                                    <td className="px-2 sm:px-4 py-3 text-right text-[14px] font-bold text-[#3B4FE4]">{fmtB(yearTotals.totalEarn)}</td>
                                </tr>
                            </tfoot>
                        </table>
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
                                            {/* Display text instead of input */}
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
