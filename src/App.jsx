import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight,
  LayoutDashboard, Settings2,
  Clock, TrendingUp, Wallet, BadgeDollarSign,
  Sun, Palmtree,
  Timer, CircleDollarSign, Banknote,
  CalendarDays, CheckCircle2,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dateKey = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayKey = () => {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
};
const calc = (inT, outT, stdVal) => {
  if (!inT || !outT) return { total: 0, reg: 0, ot: 0 };
  const [ih, im] = inT.split(':').map(Number);
  const [oh, om] = outT.split(':').map(Number);
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins <= 0) return { total: 0, reg: 0, ot: 0 };
  const total = mins / 60;
  const std = parseFloat(stdVal || 8);
  return { total, reg: Math.min(total, std), ot: Math.max(0, total - std) };
};

// Use monthly base (salary), hourly OT (otR) and standard hours (stD) for earnings
const earn = (reg, ot, sal, otR, stD) => {
  return (sal / 30) * (reg / stD) + (ot * otR);
};

const fmt1 = (n) => n.toFixed(1);
const fmtB = (n) => '฿' + Math.round(n).toLocaleString('en-US');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const today = useMemo(() => new Date(), []);

  const [entries, setEntries] = useState({});
  const [holidays, setHolidays] = useState(new Set());
  const [selectedKey, setSelectedKey] = useState(null);
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  
  const [salary, setSalary] = useState(15000); // Monthly Base
  const [otRate, setOtRate] = useState(100);   // Hourly OT Rate
  const [std, setStd] = useState(8);           // Standard Hours

  const [dIn, setDIn] = useState('');
  const [dOut, setDOut] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });

  // ── Seed sample data ──
  useEffect(() => {
    const y = today.getFullYear(), m = today.getMonth();
    const rows = [
      [1, '08:30', '18:45'], [2, '09:00', '17:00'], [3, '08:00', '20:30'],
      [4, '09:15', '18:00'], [5, '08:30', '19:00'], [8, '09:00', '21:00'],
      [9, '08:45', '17:45'], [10, '09:00', '22:00'], [11, '08:30', '18:30'],
      [12, '09:00', '17:00'], [15, '08:00', '19:30'], [16, '09:00', '20:00'],
    ];
    const init = {};
    rows.forEach(([d, i, o]) => {
      if (d > today.getDate()) return;
      init[dateKey(y, m + 1, d)] = { in: i, out: o };
    });
    setEntries(init);
  }, [today]);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2600);
  };

  // ── Sync selected entry → detail inputs ──
  const selEntry = selectedKey ? (entries[selectedKey] || {}) : {};
  useEffect(() => {
    setDIn(selEntry.in || '');
    setDOut(selEntry.out || '');
  }, [selectedKey, selEntry.in, selEntry.out]);

  // ── Monthly aggregates ──
  const { totalReg, totalOT, otDays, daysWorked } = useMemo(() => {
    let tR = 0, tO = 0, oD = 0, dW = 0;
    Object.keys(entries).forEach((k) => {
      const [y, m] = k.split('-').map(Number);
      if (y === viewY && m === viewM + 1) {
        const h = calc(entries[k].in, entries[k].out, std);
        if (h.total > 0) { dW++; tR += h.reg; tO += h.ot; if (h.ot > 0) oD++; }
      }
    });
    return { totalReg: tR, totalOT: tO, otDays: oD, daysWorked: dW };
  }, [entries, viewY, viewM, std]);

  const regEarn = (salary / 30) * (totalReg / std);
  const otEarn = totalOT * otRate;
  const totalEarn = regEarn + otEarn;

  // ── Calendar cells ──
  const daysInM = new Date(viewY, viewM + 1, 0).getDate();
  const firstDow = new Date(viewY, viewM, 1).getDay();
  const emptyCells = Array.from({ length: firstDow });
  const dayCells = Array.from({ length: daysInM }, (_, i) => i + 1);

  // Toggle holiday for a date key
  const toggleHoliday = (e, k) => {
    e.stopPropagation();
    setHolidays((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const saveSelectedEntry = () => {
    if (!dIn || !dOut || !selectedKey) return;
    setEntries((p) => ({ ...p, [selectedKey]: { in: dIn, out: dOut } }));
    showToast('Entry saved');
  };

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY((y) => y - 1); }
    else setViewM((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY((y) => y + 1); }
    else setViewM((m) => m + 1);
  };
  const goToday = () => { setViewY(today.getFullYear()); setViewM(today.getMonth()); };

  // ── Detail panel calc ──
  const detH = calc(dIn, dOut, std);
  const detE = earn(detH.reg, detH.ot, salary, otRate, std);

  const selDateObj = selectedKey ? new Date(selectedKey + 'T00:00:00') : null;
  const selLabel = selDateObj
    ? `${DAYS_LONG[selDateObj.getDay()]}, ${selDateObj.getDate()} ${SHORT_MONTHS[viewM]}`
    : 'Select a Day';
  const isTodaySelected = selectedKey === todayKey();

  // ── Recent logs for current view month ──
  const recentLogs = useMemo(() =>
    Object.keys(entries)
      .filter((k) => k.startsWith(`${viewY}-${String(viewM + 1).padStart(2, '0')}`))
      .sort((a, b) => b.localeCompare(a)),
    [entries, viewY, viewM]
  );

  // ── Shared utility classes ──
  const labelCls = 'text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] block mb-1';
  const inputCls = 'w-full min-w-0 block bg-[#F8F9FB] border-[1.5px] border-[#D1D5E0] rounded-[6px] text-[#111827] text-sm font-medium px-1 sm:px-3 py-2 outline-none cursor-pointer transition-colors focus:border-[#3B4FE4] focus:bg-white box-border';
  
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-[#374151] font-sans antialiased selection:bg-[#EEF0FD]">

      {/* ════════════════════════════════════════════
          TOPBAR
      ════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full h-[60px] bg-white border-b border-[#E8EAEF] flex items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-[#3B4FE4] rounded-lg grid place-items-center shrink-0">
            <CalendarDays size={15} className="text-white" />
          </div>
          <span className="font-bold text-[17px] text-[#111827] tracking-tight">TimeFlow</span>
        </div>

        {/* Period filters (desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9CA3AF] mr-1">Period:</span>

          <div className="relative">
            <select
              value={viewM}
              onChange={(e) => setViewM(Number(e.target.value))}
              className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[#111827] text-[13px] font-medium pl-3 pr-7 py-[7px] cursor-pointer outline-none shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all hover:border-[#3B4FE4] hover:shadow-[0_0_0_3px_#EEF0FD] focus:border-[#3B4FE4] focus:shadow-[0_0_0_3px_#EEF0FD]"
            >
              {MONTHS.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
          </div>

          <div className="relative">
            <select
              value={viewY}
              onChange={(e) => setViewY(Number(e.target.value))}
              className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[#111827] text-[13px] font-medium pl-3 pr-7 py-[7px] cursor-pointer outline-none shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all hover:border-[#3B4FE4] hover:shadow-[0_0_0_3px_#EEF0FD] focus:border-[#3B4FE4] focus:shadow-[0_0_0_3px_#EEF0FD]"
            >
              {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
          </div>

          <button
            onClick={goToday}
            className="px-3.5 py-[7px] rounded-[10px] bg-white border-[1.5px] border-[#D1D5E0] text-[#374151] text-[13px] font-medium cursor-pointer shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all hover:border-[#3B4FE4] hover:text-[#3B4FE4] hover:bg-[#EEF0FD] hover:-translate-y-px"
          >
            Today
          </button>
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#EEF0FD] border-2 border-[#C7CCFA] grid place-items-center text-[13px] font-bold text-[#3B4FE4] cursor-pointer select-none">
          JD
        </div>
      </header>

      {/* ════════════════════════════════════════════
          LAYOUT
      ════════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-60px)]">

        {/* ── SIDEBAR ─────────────────────────────── */}
        <aside className="hidden xl:flex flex-col w-[220px] shrink-0 bg-white border-r border-[#E8EAEF] sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto p-4 gap-1">

          {/* Single nav: Dashboard */}
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] px-3 pt-3 pb-2">Menu</div>

          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer bg-[#EEF0FD] text-[#3B4FE4]">
            <LayoutDashboard size={15} />
            Dashboard
          </div>

          {/* Rate settings at bottom */}
          <div className="mt-auto pt-4 border-t border-[#E8EAEF]">
            <div className="bg-[#F8F9FB] rounded-[10px] p-3.5">

              <div className="flex items-center gap-1.5 mb-3">
                <Settings2 size={12} className="text-[#9CA3AF]" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Rate Settings</span>
              </div>

              {/* Monthly Salary */}
              <div className="mb-2">
                <label className={labelCls}>Monthly Salary</label>
                <div className="flex items-center bg-white border-[1.5px] border-[#D1D5E0] rounded-[6px] overflow-hidden focus-within:border-[#3B4FE4] transition-colors">
                  <div className="px-2 h-[34px] flex items-center justify-center bg-[#EEF0FD] border-r border-[#E8EAEF] shrink-0">
                    <Wallet size={12} className="text-[#3B4FE4]" />
                  </div>
                  <input
                    type="number" min="1" value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="flex-1 bg-transparent border-none outline-none text-[#111827] text-sm font-medium px-2 h-[34px] w-0"
                  />
                  <span className="pr-2 text-[11px] text-[#9CA3AF] font-semibold shrink-0">฿/mo</span>
                </div>
              </div>

              {/* Hourly OT */}
              <div className="mb-2">
                <label className={labelCls}>OT Rate / Hr</label>
                <div className="flex items-center bg-white border-[1.5px] border-[#D1D5E0] rounded-[6px] overflow-hidden focus-within:border-[#3B4FE4] transition-colors">
                  <div className="px-2 h-[34px] flex items-center justify-center bg-[#EEF0FD] border-r border-[#E8EAEF] shrink-0">
                    <CircleDollarSign size={12} className="text-[#3B4FE4]" />
                  </div>
                  <input
                    type="number" min="0" value={otRate}
                    onChange={(e) => setOtRate(Number(e.target.value))}
                    className="flex-1 bg-transparent border-none outline-none text-[#111827] text-sm font-medium px-2 h-[34px] w-0"
                  />
                  <span className="pr-2 text-[11px] text-[#9CA3AF] font-semibold shrink-0">฿/hr</span>
                </div>
              </div>

              {/* Standard hours */}
              <div>
                <label className={labelCls}>Standard Hours</label>
                <div className="flex items-center bg-white border-[1.5px] border-[#D1D5E0] rounded-[6px] overflow-hidden focus-within:border-[#3B4FE4] transition-colors">
                  <div className="px-2 h-[34px] flex items-center justify-center bg-[#EEF0FD] border-r border-[#E8EAEF] shrink-0">
                    <Clock size={12} className="text-[#3B4FE4]" />
                  </div>
                  <input
                    type="number" min="1" max="24" value={std}
                    onChange={(e) => setStd(Number(e.target.value))}
                    className="flex-1 bg-transparent border-none outline-none text-[#111827] text-sm font-medium px-2 h-[34px] w-0"
                  />
                  <span className="pr-2 text-[11px] text-[#9CA3AF] font-semibold shrink-0">h/day</span>
                </div>
              </div>

            </div>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-6 p-6 overflow-y-auto">

          {/* Dashboard header */}
          <div className="flex items-end justify-between flex-wrap gap-4 animate-[fadeUp_0.4s_ease_both]">
            <div>
              <h1 className="text-[26px] font-bold text-[#111827] tracking-tight leading-tight">Dashboard</h1>
              <p className="text-sm text-[#9CA3AF] mt-0.5">
                {MONTHS[viewM]} {viewY} · {daysWorked} day{daysWorked !== 1 ? 's' : ''} worked · {fmt1(totalOT)}h overtime
              </p>
            </div>

            {/* Mobile filters */}
            <div className="flex sm:hidden items-center gap-2 flex-wrap">
              <div className="relative">
                <select value={viewM} onChange={(e) => setViewM(Number(e.target.value))}
                  className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-[#3B4FE4]">
                  {MONTHS.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
              </div>
              <div className="relative">
                <select value={viewY} onChange={(e) => setViewY(Number(e.target.value))}
                  className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-[#3B4FE4]">
                  {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
              </div>
            </div>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeUp_0.4s_0.08s_ease_both]">

            <SummaryCard variant="amber" Icon={Timer} label="Total OT Hours" value={`${fmt1(totalOT)}h`} sub={`${otDays} day${otDays !== 1 ? 's' : ''} with overtime`} />
            <SummaryCard variant="indigo" Icon={TrendingUp} label="OT Earnings" value={fmtB(otEarn)} sub={`at ${otRate}฿/hr`} />
            <SummaryCard variant="green" Icon={Banknote} label="Regular Earnings" value={fmtB(regEarn)} sub={`Est. daily base`} />

            {/* Hero card */}
            <div className="relative overflow-hidden rounded-2xl border-transparent cursor-default
              bg-gradient-to-br from-[#3B4FE4] to-[#2A3BC0]
              shadow-[0_8px_32px_rgba(59,79,228,0.28)] p-6
              transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
              hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(59,79,228,0.36)]">
              <span className="absolute top-5 right-5 bg-white/20 text-white/85 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                THIS MONTH
              </span>
              <div className="w-9 h-9 rounded-[10px] bg-white/[0.18] grid place-items-center mb-4">
                <CircleDollarSign size={18} className="text-white" />
              </div>
              <div className="text-[11px] font-bold text-white/65 uppercase tracking-[0.1em] mb-1.5">Total Earnings</div>
              <div className="text-[2.2rem] font-bold text-white leading-none tracking-tight">{fmtB(totalEarn)}</div>
              <div className="text-[12px] text-white/55 mt-1.5">{daysWorked} day{daysWorked !== 1 ? 's' : ''} worked</div>
            </div>
          </div>

          {/* ── CALENDAR + RIGHT PANEL ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_284px] gap-5 animate-[fadeUp_0.4s_0.16s_ease_both]">

            {/* ── Calendar ── */}
            <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">

              {/* Calendar header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                <span className="text-[17px] font-bold text-[#111827]">{MONTHS[viewM]} {viewY}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={prevMonth}
                    className="w-[30px] h-[30px] rounded-lg bg-[#F8F9FB] border border-[#E8EAEF] text-[#6B7280] grid place-items-center cursor-pointer transition-all hover:bg-[#EEF0FD] hover:border-[#3B4FE4] hover:text-[#3B4FE4]">
                    <ChevronLeft size={15} />
                  </button>
                  <button onClick={nextMonth}
                    className="w-[30px] h-[30px] rounded-lg bg-[#F8F9FB] border border-[#E8EAEF] text-[#6B7280] grid place-items-center cursor-pointer transition-all hover:bg-[#EEF0FD] hover:border-[#3B4FE4] hover:text-[#3B4FE4]">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* Calendar body */}
              <div className="p-4">
                {/* Weekday row */}
                <div className="grid grid-cols-7 mb-1.5">
                  {DAYS_SHORT.map((d) => (
                    <div key={d} className="text-center text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em] py-1.5">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells grid */}
                <div className="grid grid-cols-7 gap-[3px]">

                  {/* Empty leading cells */}
                  {emptyCells.map((_, i) => <div key={`e-${i}`} />)}

                  {/* Actual day cells */}
                  {dayCells.map((d) => {
                    const k = dateKey(viewY, viewM + 1, d);
                    const entry = entries[k];
                    const isToday = k === todayKey();
                    const isSel = k === selectedKey;
                    const isHol = holidays.has(k);
                    const dow = new Date(viewY, viewM, d).getDay();
                    const isWE = dow === 0 || dow === 6;
                    const h = entry ? calc(entry.in, entry.out, std) : { total: 0, reg: 0, ot: 0 };
                    const eEarn = earn(h.reg, h.ot, salary, otRate, std);
                    const hasOT = h.ot > 0;
                    const hasEntry = !!entry;

                    /*
                     * Corner icon logic:
                     *  - Default (workday): show Sun icon (amber) — visible on hover
                     *  - Holiday: always show Palmtree icon (indigo / cyan) — always visible
                     *  - Clicking toggles between states
                     */
                    const CornerIcon = isHol ? Palmtree : Sun;
                    const cornerVisible = isHol ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';
                    const cornerColorCls = isHol
                      ? 'text-[#998ed9] bg-[rgba(153,142,217,0.15)] hover:bg-[rgba(153,142,217,0.25)] border border-[rgba(153,142,217,0.4)]'
                      : 'text-[#c29302] bg-[#fffdef] hover:bg-[#ffe270] border border-[#ffe270]';

                    // Cell background / border
                    const baseBg = isHol
                      ? 'bg-[rgba(153,142,217,0.15)]'
                      : hasOT
                        ? 'bg-[#fffdef]'
                        : isToday
                          ? 'bg-[#f0f5fa]'
                          : 'bg-transparent hover:bg-[#F8F9FB]';

                    const baseBorder = isSel
                      ? 'border-[#6ab9dc] outline outline-[1.5px] outline-[#6ab9dc] z-10'
                      : isHol
                        ? 'border-transparent'
                        : isToday
                          ? 'border-[#6fa3cb] hover:border-[#5c96bb]'
                          : hasOT
                            ? 'border-transparent hover:border-[#fbde3a]'
                            : 'border-transparent hover:border-[#E8EAEF]';

                    const cellBg = `${baseBg} ${baseBorder}`;

                    return (
                      <div
                        key={d}
                        onClick={() => setSelectedKey(prev => prev === k ? null : k)}
                        className={`relative min-h-[72px] sm:min-h-[80px] p-[7px_6px_5px] rounded-lg flex flex-col gap-[2px] border cursor-pointer transition-all duration-[220ms] group ${cellBg}`}
                      >
                        {/* Day number */}
                        <span className={`text-[11px] font-bold leading-none
                          ${isToday ? 'text-[#6fa3cb]' : isWE ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          {d}
                        </span>

                        {/*
                         * Corner toggle button
                         * ☀ Sun   → workday (shown on hover when not holiday)
                         * 🌴 Palmtree → holiday
                         * Click toggles holiday status
                         */}
                        <button
                          title={isHol ? 'Mark as workday' : 'Mark as holiday'}
                          onClick={(e) => toggleHoliday(e, k)}
                          className={[
                            'absolute top-[5px] right-[5px]',
                            'w-[18px] h-[18px] rounded-[4px]',
                            'grid place-items-center cursor-pointer',
                            'transition-all duration-150',
                            cornerVisible,
                            cornerColorCls,
                          ].join(' ')}
                        >
                          <CornerIcon size={10} strokeWidth={2.5} />
                        </button>

                        {/* Entry data */}
                        {hasEntry && (
                          <div className="mt-auto flex flex-col gap-[2px]">
                            <span className="text-[9px] font-medium text-[#9CA3AF] leading-tight hidden sm:block">
                              {entry.in}–{entry.out}
                            </span>
                            <div className="flex justify-between items-end">
                              {hasOT ? (
                                <span className="text-[10px] font-bold text-[#c29302] leading-none">OT {fmt1(h.ot)}h</span>
                              ) : (
                                <span className="text-[10px] font-bold text-[#6B7280] leading-none">{fmt1(h.total)}h</span>
                              )}
                              <span className="text-[9px] font-bold text-[#10B981] leading-none hidden sm:block">
                                {fmtB(eEarn)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex flex-col gap-4 min-w-0 overflow-hidden">

              {/* Day detail card */}
              <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
                <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF]">
                  <span className="text-sm font-bold text-[#111827]">{selLabel}</span>
                  {isTodaySelected && (
                    <span className="text-[10px] font-bold bg-[#6fa3cb] text-white px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                      Today
                    </span>
                  )}
                </div>

                <div className="p-4 w-full overflow-hidden">
                  {!selectedKey ? (
                    <p className="text-sm text-[#9CA3AF] text-center py-4">
                      Click any day on the calendar to log hours.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3 w-full min-w-0">
                      {/* Time inputs — grid-cols-2 so each cell is exactly 50% and never overflows */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                        <div className="min-w-0">
                          <label className={labelCls}>Clock In</label>
                          <input type="time" className={inputCls} value={dIn} onChange={(e) => setDIn(e.target.value)} />
                        </div>
                        <div className="min-w-0">
                          <label className={labelCls}>Clock Out</label>
                          <input type="time" className={inputCls} value={dOut} onChange={(e) => setDOut(e.target.value)} />
                        </div>
                      </div>

                      {/* Calc summary */}
                      <div className="bg-[#F8F9FB] rounded-[10px] p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">Total</span>
                          <span className="text-[13px] font-bold text-[#111827]">{dIn && dOut ? fmt1(detH.total) + 'h' : '—'}</span>
                        </div>
                        <hr className="border-[#E8EAEF]" />
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">Regular</span>
                          <span className="text-[13px] font-bold text-[#3B4FE4]">{dIn && dOut ? fmt1(detH.reg) + 'h' : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">Overtime</span>
                          <span className="text-[13px] font-bold text-[#c29302]">{dIn && dOut ? fmt1(detH.ot) + 'h' : '—'}</span>
                        </div>
                        <hr className="border-[#E8EAEF]" />
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">Earnings</span>
                          <span className="text-[13px] font-bold text-[#10B981]">{dIn && dOut ? fmtB(detE) : '—'}</span>
                        </div>
                      </div>

                      {/* Save / Update */}
                      <button
                        onClick={saveSelectedEntry}
                        className="w-full py-2.5 rounded-[10px] bg-[#3B4FE4] text-white text-[13px] font-bold cursor-pointer border-none transition-all flex items-center justify-center gap-2 hover:bg-[#2A3BC0] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(59,79,228,0.32)]"
                      >
                        <CheckCircle2 size={14} />
                        {entries[selectedKey]?.in ? 'Update Entry' : 'Save Entry'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Work log */}
              <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex-1">
                <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF]">
                  <span className="text-sm font-bold text-[#111827]">Work Log</span>
                  <span className="text-[11px] text-[#9CA3AF] font-medium">{recentLogs.length} entries</span>
                </div>
                <div className="p-2.5 max-h-[240px] overflow-y-auto flex flex-col gap-1">
                  {recentLogs.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF] text-center py-4">No entries this month</p>
                  ) : (
                    recentLogs.map((k) => {
                      const e = entries[k];
                      const d = k.split('-')[2];
                      const dw = new Date(k + 'T00:00:00').getDay();
                      const h = calc(e.in, e.out, std);
                      const hasOT = h.ot > 0;
                      return (
                        <div
                          key={k}
                          onClick={() => setSelectedKey(prev => prev === k ? null : k)}
                          className={`grid grid-cols-[36px_1fr_auto] items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all border
                            ${hasOT
                              ? 'border-l-[3px] border-l-[#fbde3a] border-r-transparent border-t-transparent border-b-transparent'
                              : 'border-transparent'}
                            hover:bg-[#F8F9FB] hover:border-[#E8EAEF]`}
                        >
                          <div className={`w-9 h-9 rounded-lg grid place-items-center text-sm font-bold shrink-0
                            ${hasOT ? 'bg-[#fffdef] text-[#c29302]' : 'bg-[#F8F9FB] text-[#374151]'}`}>
                            {d}
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-[#6B7280]">{DAYS_SHORT[dw]}</div>
                            <div className="text-[11px] text-[#9CA3AF]">{e.in} → {e.out}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[12px] font-bold text-[#3B4FE4]">{fmt1(h.total)}h</div>
                            {hasOT && (
                              <span className="text-[10px] font-bold bg-[#fffdef] text-[#c29302] px-1.5 py-px rounded">
                                OT {fmt1(h.ot)}h
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-5 flex-wrap px-1 animate-[fadeUp_0.4s_0.24s_ease_both]">
            {[
              { color: 'bg-[#EEF0FD] border border-[#C7CCFA]', label: 'Regular day' },
              { color: 'bg-[#fffdef] border border-[#ffe270]', label: 'OT day' },
              { color: 'bg-[rgba(153,142,217,0.15)] border border-[rgba(153,142,217,0.4)]', label: 'Holiday' },
              { color: 'bg-[#f0f5fa] border-2 border-[#6fa3cb]', label: 'Today' },
              { color: 'bg-[#f2f8fa] border-2 border-[#6ab9dc]', label: 'Selected' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[12px] text-[#6B7280] font-medium">
                <div className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${color}`} />
                {label}
              </div>
            ))}
          </div>

        </main>
      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 right-6 bg-[#111827] text-white text-[13px] font-medium px-4 py-3 rounded-[10px] z-[300] shadow-[0_8px_28px_rgba(17,24,39,0.1)] flex items-center gap-2 pointer-events-none transition-all duration-300
        ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <CheckCircle2 size={14} className="text-[#10B981]" />
        {toast.msg}
      </div>

    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
const variantStyles = {
  amber: {
    wrap: 'bg-white border-[#E8EAEF] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]',
    stripe: 'bg-[#fbde3a]',
    icon: 'bg-[#fffdef] text-[#c29302]',
    val: 'text-[#c29302]',
  },
  indigo: {
    wrap: 'bg-white border-[#E8EAEF] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]',
    stripe: 'bg-[#3B4FE4]',
    icon: 'bg-[#EEF0FD] text-[#3B4FE4]',
    val: 'text-[#3B4FE4]',
  },
  green: {
    wrap: 'bg-white border-[#E8EAEF] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]',
    stripe: 'bg-[#10B981]',
    icon: 'bg-[#ECFDF5] text-[#10B981]',
    val: 'text-[#10B981]',
  },
};

function SummaryCard({ variant, Icon, label, value, sub }) {
  const s = variantStyles[variant];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-6 cursor-default
      transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      shadow-[0_1px_3px_rgba(17,24,39,0.06)] hover:-translate-y-[3px] ${s.wrap}`}>
      <span className={`absolute top-0 left-6 right-6 h-[3px] rounded-b-[4px] opacity-60 ${s.stripe}`} />
      <div className={`w-[38px] h-[38px] rounded-[10px] grid place-items-center mb-4 ${s.icon}`}>
        <Icon size={17} strokeWidth={2} />
      </div>
      <div className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1.5">{label}</div>
      <div className={`text-[2rem] font-bold leading-none tracking-tight ${s.val}`}>{value}</div>
      {sub && <div className="text-[12px] mt-1.5 text-[#9CA3AF]">{sub}</div>}
    </div>
  );
}