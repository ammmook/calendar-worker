/**
 * SkeletonLoader — Reusable skeleton loading components for TimeFlow.
 *
 * Provides shimmer-animated placeholder shapes that mimic the real UI
 * layout, giving users a sense of structure before data arrives.
 *
 * มี skeleton แยกตามหน้าให้ตรงกับ layout ล่าสุด:
 *   - SkeletonCalendarView : หน้า Work Calendar (ปฏิทิน + right panel + legend)
 *   - SkeletonMonthly      : แท็บรายเดือน (tabs + การ์ดสรุป 5 ใบ + OT แยกอัตรา)
 *   - SkeletonYearly       : แท็บรายปี (tabs + KPI 5 ใบ + OT แยกอัตรา + สรุปการลา)
 *   - SkeletonAuthLoading  : หน้าจอ auth เต็มจอ
 */
import React from 'react';
import {
  Timer, TrendingUp, Banknote, CircleDollarSign, Moon,
  CalendarDays,
} from 'lucide-react';

/* ─── Base shimmer block ─────────────────────────────────────────────── */
function SkeletonBlock({ className = '', style }) {
  return <div className={`skeleton-shimmer ${className}`} style={style} />;
}

/* ─── Stat card skeleton (KPI/summary card) ──────────────────────────── */
const STAT_VARIANTS = [
  { stripe: 'bg-[#fbde3a]', icon: 'bg-[#fffdef] text-[#c29302]', Icon: Timer },
  { stripe: 'bg-[#FDBA74]', icon: 'bg-[#FFF3E6] text-[#E8730C]', Icon: Moon },
  { stripe: 'bg-[#3B4FE4]', icon: 'bg-[#EEF0FD] text-[#3B4FE4]', Icon: TrendingUp },
  { stripe: 'bg-[#10B981]', icon: 'bg-[#ECFDF5] text-[#10B981]', Icon: Banknote },
];

/* การ์ดสรุป 5 ใบ (4 stat + hero) ตรงกับ grid grid-cols-2 lg:grid-cols-5 */
function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {STAT_VARIANTS.map(({ stripe, icon, Icon }, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-[#E8EAEF] p-4 sm:p-6 bg-white shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <span className={`absolute top-0 left-4 sm:left-6 right-4 sm:right-6 h-[3px] rounded-b-[4px] opacity-60 ${stripe}`} />
          <div className={`w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-[10px] grid place-items-center mb-3 sm:mb-4 ${icon}`}>
            <Icon size={14} strokeWidth={2} className="sm:hidden" />
            <Icon size={17} strokeWidth={2} className="hidden sm:block" />
          </div>
          <SkeletonBlock className="h-[10px] sm:h-[11px] w-20 rounded mb-2" />
          <SkeletonBlock className="h-[1.4rem] sm:h-[2rem] w-28 rounded-md mb-1.5" />
          <SkeletonBlock className="h-[10px] sm:h-[12px] w-16 rounded" />
        </div>
      ))}

      {/* Hero card */}
      <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl border-transparent bg-gradient-to-br from-[#A5AEFC] to-[#8995F4] shadow-[0_8px_24px_rgba(137,149,244,0.3)] p-4 sm:p-6">
        <span className="absolute top-4 right-4 sm:top-5 sm:right-5 bg-white/25 rounded-full skeleton-shimmer-light" style={{ width: 60, height: 16 }} />
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-white/25 grid place-items-center mb-3 sm:mb-4">
          <CircleDollarSign size={17} className="text-white/50" />
        </div>
        <div className="skeleton-shimmer-light h-[11px] w-24 rounded mb-2" />
        <div className="skeleton-shimmer-light h-[1.8rem] w-32 rounded-md mb-2" />
        <div className="skeleton-shimmer-light h-[12px] w-20 rounded" />
      </div>
    </div>
  );
}

/* ─── Tabs header (3 pills) + right-side nav ──────────────────────────── */
function SkeletonTabsHeader() {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-[#F8F9FB] border border-[#E8EAEF] rounded-[12px] p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-2 rounded-[9px]">
            <SkeletonBlock className="w-3.5 h-3.5 rounded" />
            <SkeletonBlock className="h-3 rounded" style={{ width: [56, 42, 48][i] }} />
          </div>
        ))}
      </div>
      {/* Nav (month/year) */}
      <SkeletonBlock className="h-[38px] w-[150px] rounded-xl" />
    </div>
  );
}

/* ─── OT by rate card skeleton (แถวชิดๆ 3 อัตรา) ──────────────────────── */
function SkeletonOtRows() {
  return (
    <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
        <SkeletonBlock className="h-[15px] w-32 rounded-md" />
        <SkeletonBlock className="h-[11px] w-24 rounded" />
      </div>
      <div className="p-2.5 flex flex-col gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center gap-2 min-w-0">
              <SkeletonBlock className="w-6 h-6 rounded-[6px]" />
              <div className="flex flex-col gap-1">
                <SkeletonBlock className="h-[12px] w-14 rounded" />
                <SkeletonBlock className="h-[10px] w-20 rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SkeletonBlock className="h-[12px] w-16 rounded" />
              <SkeletonBlock className="h-[10px] w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3.5 border-t border-[#E8EAEF] flex items-center justify-between">
        <SkeletonBlock className="h-[11px] w-24 rounded" />
        <SkeletonBlock className="h-[15px] w-14 rounded" />
      </div>
    </div>
  );
}

/* ═══════════════ MONTHLY (แท็บรายเดือน) ═══════════════ */
export function SkeletonMonthly() {
  return (
    <div className="flex flex-col gap-5 w-full animate-[fadeIn_0.3s_ease_both]">
      <SkeletonTabsHeader />
      <SkeletonStatCards />
      <SkeletonOtRows />
    </div>
  );
}

/* ═══════════════ YEARLY (แท็บรายปี) ═══════════════ */
export function SkeletonYearly() {
  return (
    <div className="flex flex-col gap-5 w-full animate-[fadeIn_0.3s_ease_both]">
      <SkeletonTabsHeader />
      <SkeletonStatCards />
      <SkeletonOtRows />

      {/* Leave summary card */}
      <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
          <SkeletonBlock className="h-[15px] w-28 rounded-md" />
          <SkeletonBlock className="h-[11px] w-16 rounded" />
        </div>
        <div className="p-4 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="w-6 h-6 rounded-[6px]" />
                  <SkeletonBlock className="h-[12px] w-20 rounded" />
                </div>
                <SkeletonBlock className="h-[12px] w-10 rounded" />
              </div>
              <SkeletonBlock className="h-[5px] w-full rounded-full" />
            </div>
          ))}
          <div className="mt-2 pt-3 border-t border-[#E8EAEF] flex items-center justify-between">
            <SkeletonBlock className="h-[11px] w-28 rounded" />
            <SkeletonBlock className="h-[15px] w-12 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Calendar card ──────────────────────────────────────────── */
function SkeletonCalendarCard({ daysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] }) {
  return (
    <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
        <SkeletonBlock className="h-[17px] w-28 rounded-md" />
        <div className="flex items-center gap-1.5">
          <SkeletonBlock className="w-[64px] h-[30px] rounded-lg" />
          <SkeletonBlock className="w-[30px] h-[30px] rounded-lg" />
          <SkeletonBlock className="w-[30px] h-[30px] rounded-lg" />
        </div>
      </div>

      <div className="p-4">
        {/* Weekday row */}
        <div className="grid grid-cols-7 mb-1.5">
          {daysShort.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em] py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells skeleton */}
        <div className="grid grid-cols-7 gap-[3px]">
          <div /><div />
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="skeleton-calendar-cell" style={{ animationDelay: `${i * 0.02}s` }}>
              <SkeletonBlock className="w-5 h-5 rounded-md mx-auto" />
            </div>
          ))}
          {Array.from({ length: 3 }).map((_, i) => <div key={`t${i}`} />)}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Right Panel (day detail placeholder) ──────────────────── */
function SkeletonDayDetail() {
  return (
    <div className="hidden xl:flex flex-col bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF]">
        <SkeletonBlock className="h-3.5 w-28 rounded-md" />
        <SkeletonBlock className="h-4 w-10 rounded-full" />
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <SkeletonBlock className="h-[10px] w-14 rounded" />
            <SkeletonBlock className="h-9 w-full rounded-[8px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <SkeletonBlock className="h-[10px] w-14 rounded" />
            <SkeletonBlock className="h-9 w-full rounded-[8px]" />
          </div>
        </div>
        <SkeletonBlock className="h-16 w-full rounded-[10px]" />
        <SkeletonBlock className="h-10 w-full rounded-[10px]" />
      </div>
    </div>
  );
}

/* ═══════════════ CALENDAR VIEW (หน้า Work Calendar) ═══════════════ */
export function SkeletonCalendarView({ daysShort }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_284px] gap-6 w-full animate-[fadeIn_0.3s_ease_both]">
      {/* Header */}
      <div className="order-1 xl:col-span-2 flex items-end justify-between flex-wrap gap-4">
        <div>
          <SkeletonBlock className="h-[26px] w-40 rounded-lg" />
          <SkeletonBlock className="h-3.5 w-32 rounded-md mt-1.5" />
        </div>
      </div>

      {/* Calendar */}
      <div className="order-2 xl:order-2">
        <SkeletonCalendarCard daysShort={daysShort} />
      </div>

      {/* Right panel */}
      <div className="relative order-3 min-w-0">
        <SkeletonDayDetail />
      </div>

      {/* Legend */}
      <div className="flex gap-5 flex-wrap px-1 order-4 xl:col-span-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <SkeletonBlock className="w-2.5 h-2.5 rounded-[3px]" />
            <SkeletonBlock className="h-[12px] rounded" style={{ width: `${50 + (i % 3) * 12}px` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Auth Loading Skeleton (full page) ──────────────────────────────── */
export function SkeletonAuthLoading() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] grid place-items-center font-sans">
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 bg-[#3B4FE4] rounded-2xl grid place-items-center shadow-lg skeleton-pulse-icon">
          <CalendarDays size={22} className="text-white" />
        </div>
        {/* Fake topbar shimmer */}
        <div className="flex flex-col items-center gap-3 w-[280px]">
          <SkeletonBlock className="h-3 w-36 rounded-md" />
          <SkeletonBlock className="h-2.5 w-24 rounded" />
        </div>
      </div>
    </div>
  );
}

export default SkeletonBlock;
