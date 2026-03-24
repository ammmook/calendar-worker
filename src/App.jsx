import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight,
  LayoutDashboard, Settings2,
  Clock, TrendingUp, Wallet,
  Sun, Palmtree,
  Timer, CircleDollarSign, Banknote,
  CalendarDays, CheckCircle2, BarChart2,
  LogOut, UserCircle2, ChevronDown, X, Trash2
} from 'lucide-react';
import YearlyDashboard from './components/YearlyDashboard';
import { getLang } from './locales';
import { useAuth } from './components/AuthContext';
import LoginPage from './components/LoginPage';
import ProfilePage, { OT_MODE } from './components/ProfilePage';

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

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const today = useMemo(() => new Date(), []);

  // ── Auth ──
  const { user, loading: authLoading, signOut } = useAuth();

  // ── Page routing ──
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'profile'

  const [lang, setLang] = useState('en');
  const t = getLang(lang);

  const [entries, setEntries] = useState({});
  const [holidays, setHolidays] = useState(new Set());
  const [selectedKey, setSelectedKey] = useState(null);
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  const [salary, setSalary] = useState(15000); // Monthly Base
  const [otRate, setOtRate] = useState(100);   // Hourly OT Rate
  const [std, setStd] = useState(8);           // Standard Hours

  // ── OT Calculation Mode (from ProfilePage) ──
  const [otMode, setOtMode] = useState(OT_MODE.HOURLY);
  const [otBlockHours, setOtBlockHours] = useState(2);
  const [otDeductMins, setOtDeductMins] = useState(30);
  const [leaveQuotas, setLeaveQuotas] = useState({ sick: 30, personal: 6, vacation: 10 });

  const [dIn, setDIn] = useState('');
  const [dOut, setDOut] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'yearly'

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

  const deleteSelectedEntry = () => {
    if (!selectedKey || !entries[selectedKey]) return;
    if (window.confirm(t.confirm_delete || 'Are you sure you want to delete this entry?')) {
      setEntries((p) => {
        const next = { ...p };
        delete next[selectedKey];
        return next;
      });
      setSelectedKey(null);
      showToast(t.entry_deleted || 'Entry deleted');
    }
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
    ? `${t.days_long[selDateObj.getDay()]}, ${selDateObj.getDate()} ${t.short_months[viewM]}`
    : t.select_day;
  const isTodaySelected = selectedKey === todayKey();
  const isSelectedHoliday = selectedKey ? holidays.has(selectedKey) : false;

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

  // ── Auth guard — show login if not signed in ──────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] grid place-items-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-[#3B4FE4] rounded-2xl grid place-items-center shadow-lg animate-pulse">
            <CalendarDays size={20} className="text-white" />
          </div>
          <div className="text-[13px] text-[#9CA3AF]">กำลังโหลด...</div>
        </div>
      </div>
    );
  }
  if (!user) return <LoginPage />;

  // ── Profile page ──────────────────────────────────────────────────────────
  if (page === 'profile') {
    return (
      <ProfilePage
        salary={salary} setSalary={setSalary}
        otRate={otRate} setOtRate={setOtRate}
        std={std} setStd={setStd}
        otMode={otMode} setOtMode={setOtMode}
        otBlockHours={otBlockHours} setOtBlockHours={setOtBlockHours}
        otDeductMins={otDeductMins} setOtDeductMins={setOtDeductMins}
        leaveQuotas={leaveQuotas} setLeaveQuotas={setLeaveQuotas}
        lang={lang}
        onBack={() => setPage('dashboard')}
      />
    );
  }

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
          <span className="text-xs font-semibold text-[#9CA3AF] mr-1">{t.period}</span>

          <div className="relative">
            <select
              value={viewM}
              onChange={(e) => setViewM(Number(e.target.value))}
              className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[#111827] text-[13px] font-medium pl-3 pr-7 py-[7px] cursor-pointer outline-none shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all hover:border-[#3B4FE4] hover:shadow-[0_0_0_3px_#EEF0FD] focus:border-[#3B4FE4] focus:shadow-[0_0_0_3px_#EEF0FD]"
            >
              {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
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
            {t.today}
          </button>
        </div>

        {/* Tab toggle (always visible) */}
        <div className="flex items-center gap-1 bg-[#F8F9FB] border border-[#E8EAEF] rounded-[10px] p-1">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold cursor-pointer transition-all
              ${activeTab === 'monthly'
                ? 'bg-white text-[#3B4FE4] shadow-[0_1px_3px_rgba(17,24,39,0.08)]'
                : 'text-[#6B7280] hover:text-[#374151]'}`}
          >
            <LayoutDashboard size={13} />
            <span className="hidden sm:inline">{t.monthly}</span>
          </button>
          <button
            onClick={() => setActiveTab('yearly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold cursor-pointer transition-all
              ${activeTab === 'yearly'
                ? 'bg-white text-[#3B4FE4] shadow-[0_1px_3px_rgba(17,24,39,0.08)]'
                : 'text-[#6B7280] hover:text-[#374151]'}`}
          >
            <BarChart2 size={13} />
            <span className="hidden sm:inline">{t.annual}</span>
          </button>
        </div>

        {/* Language Toggle & User Menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(l => l === 'en' ? 'th' : 'en')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-[#E8EAEF] text-[11px] font-bold text-[#6B7280] cursor-pointer transition-all hover:border-[#C7CCFA] hover:text-[#3B4FE4]"
          >
            {lang.toUpperCase()}
          </button>

          {/* User Menu Dropdown */}
          <UserMenu
            user={user}
            t={t}
            onProfile={() => setPage('profile')}
            onSignOut={signOut}
          />
        </div>
      </header>

      {/* ════════════════════════════════════════════
          LAYOUT
      ════════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-60px)]">

        {/* ── SIDEBAR ─────────────────────────────── */}
        <aside className="hidden xl:flex flex-col w-[220px] shrink-0 bg-white border-r border-[#E8EAEF] sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto p-4 gap-1">

          {/* Single nav: Dashboard */}
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] px-3 pt-3 pb-2">{t.menu}</div>

          {/* Nav: Dashboard */}
          <div
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all
              ${activeTab === 'monthly' ? 'bg-[#EEF0FD] text-[#3B4FE4]' : 'text-[#6B7280] hover:bg-[#F8F9FB] hover:text-[#374151]'}`}
          >
            <LayoutDashboard size={15} />
            {t.dashboard}
          </div>

          {/* Nav: Annual Overview */}
          <div
            onClick={() => setActiveTab('yearly')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all
              ${activeTab === 'yearly' ? 'bg-[#EEF0FD] text-[#3B4FE4]' : 'text-[#6B7280] hover:bg-[#F8F9FB] hover:text-[#374151]'}`}
          >
            <BarChart2 size={15} />
            {t.annual_overview}
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-6 p-6 overflow-y-auto">

          {/* ══ YEARLY VIEW ══ */}
          {activeTab === 'yearly' && (
            <YearlyDashboard
              entries={entries}
              holidays={holidays}
              salary={salary}
              otRate={otRate}
              std={std}
              lang={lang}
            />
          )}

          {/* ══ MONTHLY VIEW ══ */}
          {activeTab === 'monthly' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_284px] gap-6 w-full">

            {/* Dashboard header */}
            <div className="flex items-end justify-between flex-wrap gap-4 animate-[fadeUp_0.4s_ease_both] order-1 xl:col-span-2">
              <div>
                <h1 className="text-[26px] font-bold text-[#111827] tracking-tight leading-tight">{t.dashboard}</h1>
                <p className="text-sm text-[#9CA3AF] mt-0.5">
                  {t.months[viewM]} {viewY} · {daysWorked} {t.worked_days} · {fmt1(totalOT)}h {t.with_overtime}
                </p>
              </div>

              {/* Mobile filters */}
              <div className="flex sm:hidden items-center gap-2 flex-wrap">
                <div className="relative">
                  <select value={viewM} onChange={(e) => setViewM(Number(e.target.value))}
                    className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-[#3B4FE4]">
                    {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeUp_0.4s_0.08s_ease_both] order-3 xl:order-2 xl:col-span-2">

              <SummaryCard variant="amber" Icon={Timer} label={t.total_ot_hours} value={`${fmt1(totalOT)}h`} sub={`${otDays} ${t.with_overtime}`} />
              <SummaryCard variant="indigo" Icon={TrendingUp} label={t.ot_earnings} value={fmtB(otEarn)} sub={`${t.at_rate} ${otRate}${t.hr_unit}`} />
              <SummaryCard variant="green" Icon={Banknote} label={t.regular_earnings} value={fmtB(regEarn)} sub={t.est_daily_base} />

              {/* Hero card */}
              <div className="relative overflow-hidden rounded-2xl border-transparent cursor-default
              bg-gradient-to-br from-[#A5AEFC] to-[#8995F4]
              shadow-[0_8px_24px_rgba(137,149,244,0.3)] p-6
              transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
              hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(137,149,244,0.4)]">
                <span className="absolute top-5 right-5 bg-white/25 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                  {t.this_month}
                </span>
                <div className="w-9 h-9 rounded-[10px] bg-white/25 grid place-items-center mb-4">
                  <CircleDollarSign size={18} className="text-white" />
                </div>
                <div className="text-[11px] font-bold text-white/80 uppercase tracking-[0.1em] mb-1.5">{t.total_earnings}</div>
                <div className="text-[2.2rem] font-bold text-white leading-none tracking-tight">{fmtB(totalEarn)}</div>
                <div className="text-[12px] text-white/70 mt-1.5">{daysWorked} {t.worked_days}</div>
              </div>
            </div>

            {/* ── CALENDAR ── */}
            <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden animate-[fadeUp_0.4s_0.16s_ease_both] order-2 xl:order-3">

                {/* Calendar header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                  <span className="text-[17px] font-bold text-[#111827]">{t.months[viewM]} {viewY}</span>
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
                    {t.days_short.map((d) => (
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
            <div className="flex flex-col gap-4 min-w-0 overflow-hidden animate-[fadeUp_0.4s_0.20s_ease_both] order-4 xl:order-4">

                {/* Day detail card */}
                <div className="hidden xl:block bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
                  <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF]">
                    <span className="text-sm font-bold text-[#111827]">{selLabel}</span>
                    {isTodaySelected && (
                      <span className="text-[10px] font-bold bg-[#6fa3cb] text-white px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                        {t.today}
                      </span>
                    )}
                  </div>

                  <div className="p-4 w-full overflow-hidden">
                    {!selectedKey ? (
                      <p className="text-sm text-[#9CA3AF] text-center py-4">
                        {t.click_any_day}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3 w-full min-w-0">
                        {/* Time inputs — grid-cols-2 so each cell is exactly 50% and never overflows */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                          <div className="min-w-0">
                            <label className={labelCls}>{t.clock_in}</label>
                            <input type="time" className={`${inputCls} ${isSelectedHoliday ? 'opacity-50 cursor-not-allowed bg-[#E8EAEF]' : ''}`} value={dIn} onChange={(e) => setDIn(e.target.value)} disabled={isSelectedHoliday} />
                          </div>
                          <div className="min-w-0">
                            <label className={labelCls}>{t.clock_out}</label>
                            <input type="time" className={`${inputCls} ${isSelectedHoliday ? 'opacity-50 cursor-not-allowed bg-[#E8EAEF]' : ''}`} value={dOut} onChange={(e) => setDOut(e.target.value)} disabled={isSelectedHoliday} />
                          </div>
                        </div>

                        {/* Calc summary */}
                        <div className="bg-[#F8F9FB] rounded-[10px] p-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.total}</span>
                            <span className="text-[13px] font-bold text-[#111827]">{dIn && dOut ? fmt1(detH.total) + 'h' : '—'}</span>
                          </div>
                          <hr className="border-[#E8EAEF]" />
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.regular}</span>
                            <span className="text-[13px] font-bold text-[#3B4FE4]">{dIn && dOut ? fmt1(detH.reg) + 'h' : '—'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.overtime}</span>
                            <span className="text-[13px] font-bold text-[#c29302]">{dIn && dOut ? fmt1(detH.ot) + 'h' : '—'}</span>
                          </div>
                          <hr className="border-[#E8EAEF]" />
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.earnings}</span>
                            <span className="text-[13px] font-bold text-[#10B981]">{dIn && dOut ? fmtB(detE) : '—'}</span>
                          </div>
                        </div>

                        {/* Save / Update / Delete */}
                        <div className="flex gap-2 w-full mt-1">
                          {entries[selectedKey]?.in && (
                            <button
                              onClick={deleteSelectedEntry}
                              disabled={isSelectedHoliday}
                              title={t.delete_entry}
                              className={`px-4 py-2.5 rounded-[10px] border-none transition-all flex items-center justify-center shrink-0
                                ${isSelectedHoliday 
                                  ? 'bg-[#E8EAEF] text-[#9CA3AF] cursor-not-allowed' 
                                  : 'bg-[#F8F9FB] text-[#9CA3AF] cursor-pointer hover:bg-[#E8EAEF] hover:text-[#6B7280]'}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <button
                            onClick={saveSelectedEntry}
                            disabled={isSelectedHoliday}
                            className={`flex-1 py-2.5 rounded-[10px] text-white text-[13px] font-bold border-none transition-all flex items-center justify-center gap-2
                              ${isSelectedHoliday 
                                ? 'bg-[#D1D5E0] cursor-not-allowed' 
                                : 'bg-[#3B4FE4] cursor-pointer hover:bg-[#2A3BC0] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(59,79,228,0.32)]'}`}
                          >
                            <CheckCircle2 size={14} />
                            {entries[selectedKey]?.in ? t.update_entry : t.save_entry}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Work log */}
                <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex-1">
                  <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF]">
                    <span className="text-sm font-bold text-[#111827]">{t.work_log}</span>
                    <span className="text-[11px] text-[#9CA3AF] font-medium">{recentLogs.length} {t.entries}</span>
                  </div>
                  <div className="p-2.5 max-h-[240px] overflow-y-auto flex flex-col gap-1">
                    {recentLogs.length === 0 ? (
                      <p className="text-[12px] text-[#9CA3AF] text-center py-4">{t.no_entries}</p>
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
                              <div className="text-[11px] font-semibold text-[#6B7280]">{t.days_short[dw]}</div>
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

            {/* Legend */}
            <div className="flex gap-5 flex-wrap px-1 animate-[fadeUp_0.4s_0.24s_ease_both] order-5 xl:col-span-2">
              {[
                { color: 'bg-[#EEF0FD] border border-[#C7CCFA]', label: t.regular_day_legend },
                { color: 'bg-[#fffdef] border border-[#ffe270]', label: t.ot_day_legend },
                { color: 'bg-[rgba(153,142,217,0.15)] border border-[rgba(153,142,217,0.4)]', label: t.holiday_legend },
                { color: 'bg-[#f0f5fa] border-2 border-[#6fa3cb]', label: t.today },
                { color: 'bg-[#f2f8fa] border-2 border-[#6ab9dc]', label: t.selected_legend },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[12px] text-[#6B7280] font-medium">
                  <div className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${color}`} />
                  {label}
                </div>
              ))}
            </div>

            {/* Mobile Modal for Date Details */}
            {selectedKey && (
              <div 
                className="xl:hidden fixed inset-0 z-[200] bg-[#111827]/40 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease_both]"
                onClick={() => setSelectedKey(null)}
              >
                <div 
                  className="bg-white rounded-[20px] w-full max-w-[340px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden max-h-[90vh] scale-100 animate-[zoomIn_0.2s_ease_both]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-[#111827]">{selLabel}</span>
                      {isTodaySelected && (
                        <span className="text-[10px] font-bold bg-[#6fa3cb] text-white px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                          {t.today}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setSelectedKey(null)} className="w-[30px] h-[30px] grid place-items-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F8] hover:text-[#111827] cursor-pointer transition-colors bg-transparent border-none">
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="p-5 overflow-y-auto">
                    <div className="flex flex-col gap-4 w-full min-w-0">
                      {/* Time inputs */}
                      <div className="grid grid-cols-2 gap-3 w-full min-w-0">
                        <div className="min-w-0">
                          <label className={labelCls}>{t.clock_in}</label>
                          <input type="time" className={`${inputCls} ${isSelectedHoliday ? 'opacity-50 cursor-not-allowed bg-[#E8EAEF]' : ''}`} value={dIn} onChange={(e) => setDIn(e.target.value)} disabled={isSelectedHoliday} />
                        </div>
                        <div className="min-w-0">
                          <label className={labelCls}>{t.clock_out}</label>
                          <input type="time" className={`${inputCls} ${isSelectedHoliday ? 'opacity-50 cursor-not-allowed bg-[#E8EAEF]' : ''}`} value={dOut} onChange={(e) => setDOut(e.target.value)} disabled={isSelectedHoliday} />
                        </div>
                      </div>

                      {/* Calc summary */}
                      <div className="bg-[#F8F9FB] rounded-[10px] p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.total}</span>
                          <span className="text-[14px] font-bold text-[#111827]">{dIn && dOut ? fmt1(detH.total) + 'h' : '—'}</span>
                        </div>
                        <div className="h-px bg-[#E8EAEF] w-full" />
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.regular}</span>
                          <span className="text-[14px] font-bold text-[#3B4FE4]">{dIn && dOut ? fmt1(detH.reg) + 'h' : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.overtime}</span>
                          <span className="text-[14px] font-bold text-[#c29302]">{dIn && dOut ? fmt1(detH.ot) + 'h' : '—'}</span>
                        </div>
                        <div className="h-px bg-[#E8EAEF] w-full" />
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]">{t.earnings}</span>
                          <span className="text-[16px] font-bold text-[#10B981]">{dIn && dOut ? fmtB(detE) : '—'}</span>
                        </div>
                      </div>

                      {/* Save / Update / Delete */}
                      <div className="flex gap-2.5 w-full mt-2">
                        {entries[selectedKey]?.in && (
                          <button
                            onClick={deleteSelectedEntry}
                            disabled={isSelectedHoliday}
                            title={t.delete_entry}
                            className={`px-5 py-3.5 rounded-[10px] border-none transition-all flex items-center justify-center shrink-0
                              ${isSelectedHoliday 
                                ? 'bg-[#E8EAEF] text-[#9CA3AF] cursor-not-allowed' 
                                : 'bg-[#F8F9FB] text-[#9CA3AF] cursor-pointer hover:bg-[#E8EAEF] hover:text-[#6B7280]'}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (dIn && dOut && selectedKey) {
                               saveSelectedEntry(); 
                               setSelectedKey(null); 
                            }
                          }}
                          disabled={isSelectedHoliday}
                          className={`flex-1 py-3.5 rounded-[10px] text-white text-[14px] font-bold border-none transition-all flex items-center justify-center gap-2.5
                            ${isSelectedHoliday 
                              ? 'bg-[#D1D5E0] cursor-not-allowed' 
                              : 'bg-[#3B4FE4] cursor-pointer hover:bg-[#2A3BC0] shadow-[0_4px_14px_rgba(59,79,228,0.25)]'}`}
                        >
                          <CheckCircle2 size={16} />
                          {entries[selectedKey]?.in ? t.update_entry : t.save_entry}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>)} {/* end monthly view */}

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
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-6 cursor-default
      transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      shadow-[0_1px_3px_rgba(17,24,39,0.06)] hover:-translate-y-[3px] ${s.wrap}`}>
      <span className={`absolute top-0 left-4 sm:left-6 right-4 sm:right-6 h-[3px] rounded-b-[4px] opacity-60 ${s.stripe}`} />
      <div className={`w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-[10px] grid place-items-center mb-3 sm:mb-4 ${s.icon}`}>
        <Icon size={14} strokeWidth={2} className="sm:hidden" />
        <Icon size={17} strokeWidth={2} className="hidden sm:block" />
      </div>
      <div className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] sm:tracking-[0.1em] mb-1 sm:mb-1.5 truncate">{label}</div>
      <div className={`text-[1.4rem] sm:text-[2rem] font-bold leading-none tracking-tight truncate ${s.val}`}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[12px] mt-1 sm:mt-1.5 text-[#9CA3AF] truncate">{sub}</div>}
    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────
function UserMenu({ user, t, onProfile, onSignOut }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border-[1.5px] border-[#E8EAEF] bg-white cursor-pointer transition-all hover:border-[#C7CCFA] hover:shadow-[0_2px_8px_rgba(17,24,39,0.08)] select-none"
      >
        {/* Avatar image */}
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-7 h-7 rounded-full object-cover border border-[#E8EAEF]"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#EEF0FD] grid place-items-center text-[11px] font-bold text-[#3B4FE4]">
            {initials}
          </div>
        )}
        {/* Name (desktop only) */}
        <span className="hidden md:block text-[12px] font-semibold text-[#374151] max-w-[100px] truncate">
          {user?.name?.split(' ')[0]}
        </span>
        <ChevronDown size={12} className={`text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[240px] bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_8px_32px_rgba(17,24,39,0.12)] z-[999] overflow-hidden animate-[fadeUp_0.2s_ease_both]">

          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-[#F3F4F8]">
            <div className="flex items-center gap-3">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-9 h-9 rounded-xl object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#EEF0FD] grid place-items-center text-[13px] font-bold text-[#3B4FE4]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#111827] truncate">{user?.name}</div>
                <div className="text-[11px] text-[#9CA3AF] truncate">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <MenuItem
              Icon={UserCircle2}
              label={t?.profile || "Profile"}
              sub={t?.profile_desc || "Personal & Work Info"}
              onClick={() => { setOpen(false); onProfile(); }}
            />
          </div>

          <div className="border-t border-[#F3F4F8] py-1.5">
            <MenuItem
              Icon={LogOut}
              label={t?.logout || "Sign Out"}
              danger
              onClick={() => { setOpen(false); onSignOut(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ Icon, label, sub, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors
        ${danger
          ? 'text-[#F43F5E] hover:bg-[#FFF1F3]'
          : 'text-[#374151] hover:bg-[#F8F9FB]'}`}
    >
      <div className={`w-7 h-7 rounded-[7px] grid place-items-center shrink-0
        ${danger ? 'bg-[#FFF1F3]' : 'bg-[#F8F9FB]'}`}>
        <Icon size={14} className={danger ? 'text-[#F43F5E]' : 'text-[#6B7280]'} />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold">{label}</div>
        {sub && <div className="text-[10px] text-[#9CA3AF]">{sub}</div>}
      </div>
    </button>
  );
}