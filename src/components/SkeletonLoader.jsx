/**
 * SkeletonLoader — Reusable skeleton loading components for TimeFlow.
 *
 * Provides shimmer-animated placeholder shapes that mimic the real UI
 * layout, giving users a sense of structure before data arrives.
 */
import React from 'react';
import {
  Timer, TrendingUp, Banknote, CircleDollarSign,
  CalendarDays, LayoutDashboard, BarChart2,
} from 'lucide-react';

/* ─── Base shimmer block ─────────────────────────────────────────────── */
function SkeletonBlock({ className = '', style }) {
  return <div className={`skeleton-shimmer ${className}`} style={style} />;
}

/* ─── Skeleton Summary Cards (4 cards matching the dashboard) ──────── */
export function SkeletonSummaryCards() {
  const cards = [
    { variant: 'amber', Icon: Timer },
    { variant: 'indigo', Icon: TrendingUp },
    { variant: 'green', Icon: Banknote },
  ];

  const variantStyles = {
    amber: { stripe: 'bg-[#fbde3a]', icon: 'bg-[#fffdef] text-[#c29302]' },
    indigo: { stripe: 'bg-[#3B4FE4]', icon: 'bg-[#EEF0FD] text-[#3B4FE4]' },
    green: { stripe: 'bg-[#10B981]', icon: 'bg-[#ECFDF5] text-[#10B981]' },
  };

  return (
    <>
      {cards.map(({ variant, Icon }, i) => {
        const s = variantStyles[variant];
        return (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-[#E8EAEF] p-4 sm:p-6 bg-white
              shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <span className={`absolute top-0 left-4 sm:left-6 right-4 sm:right-6 h-[3px] rounded-b-[4px] opacity-60 ${s.stripe}`} />
            <div className={`w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-[10px] grid place-items-center mb-3 sm:mb-4 ${s.icon}`}>
              <Icon size={14} strokeWidth={2} className="sm:hidden" />
              <Icon size={17} strokeWidth={2} className="hidden sm:block" />
            </div>
            <SkeletonBlock className="h-[10px] sm:h-[11px] w-20 rounded mb-2" />
            <SkeletonBlock className="h-[1.4rem] sm:h-[2rem] w-28 rounded-md mb-1.5" />
            <SkeletonBlock className="h-[10px] sm:h-[12px] w-16 rounded" />
          </div>
        );
      })}

      {/* Hero card skeleton */}
      <div className="relative overflow-hidden rounded-2xl border-transparent
        bg-gradient-to-br from-[#A5AEFC] to-[#8995F4]
        shadow-[0_8px_24px_rgba(137,149,244,0.3)] p-6"
      >
        <span className="absolute top-5 right-5 bg-white/25 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.06em] skeleton-shimmer-light" style={{ width: 60 }}>&nbsp;</span>
        <div className="w-9 h-9 rounded-[10px] bg-white/25 grid place-items-center mb-4">
          <CircleDollarSign size={18} className="text-white/50" />
        </div>
        <div className="skeleton-shimmer-light h-[11px] w-24 rounded mb-2" />
        <div className="skeleton-shimmer-light h-[2.2rem] w-32 rounded-md mb-2" />
        <div className="skeleton-shimmer-light h-[12px] w-20 rounded" />
      </div>
    </>
  );
}

/* ─── Skeleton Calendar ──────────────────────────────────────────────── */
export function SkeletonCalendar({ daysShort = ['S','M','T','W','T','F','S'] }) {
  return (
    <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
        <SkeletonBlock className="h-[17px] w-28 rounded-md" />
        <div className="flex items-center gap-1.5">
          <div className="w-[30px] h-[30px] rounded-lg bg-[#F8F9FB] border border-[#E8EAEF]" />
          <div className="w-[30px] h-[30px] rounded-lg bg-[#F8F9FB] border border-[#E8EAEF]" />
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

        {/* Day cells skeleton — 5 rows x 7 cols */}
        <div className="grid grid-cols-7 gap-[3px]">
          {/* 2 leading empties */}
          <div /><div />
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-calendar-cell"
              style={{ animationDelay: `${i * 0.02}s` }}
            >
              <SkeletonBlock className="w-5 h-5 rounded-md mx-auto" />
            </div>
          ))}
          {/* trailing empties to fill grid */}
          {Array.from({ length: 3 }).map((_, i) => <div key={`t${i}`} />)}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Right Panel (Day detail + Work log) ───────────────────── */
export function SkeletonRightPanel() {
  return (
    <div className="flex flex-col gap-4">
      {/* Work log skeleton */}
      <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF] shrink-0">
          <SkeletonBlock className="h-3.5 w-16 rounded-md" />
          <SkeletonBlock className="h-[11px] w-10 rounded" />
        </div>
        <div className="p-2.5 flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[36px_1fr_auto] items-center gap-2.5 px-2.5 py-2 rounded-lg border border-transparent"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <SkeletonBlock className="w-9 h-9 rounded-lg" />
              <div className="flex flex-col gap-1">
                <SkeletonBlock className="h-[11px] w-8 rounded" />
                <SkeletonBlock className="h-[11px] w-20 rounded" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <SkeletonBlock className="h-[12px] w-12 rounded" />
                <SkeletonBlock className="h-[10px] w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Header ────────────────────────────────────────────────── */
export function SkeletonHeader() {
  return (
    <div className="flex items-end justify-between flex-wrap gap-4">
      <div>
        <SkeletonBlock className="h-[26px] w-36 rounded-lg" />
        <SkeletonBlock className="h-3.5 w-52 rounded-md mt-1.5" />
      </div>
    </div>
  );
}

/* ─── Full Dashboard Skeleton (monthly view) ─────────────────────────── */
export function SkeletonDashboard({ daysShort }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_284px] gap-6 w-full animate-[fadeIn_0.3s_ease_both]">
      {/* Header */}
      <div className="order-1 xl:col-span-2">
        <SkeletonHeader />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 order-3 xl:order-2 xl:col-span-2">
        <SkeletonSummaryCards />
      </div>

      {/* Calendar */}
      <div className="order-2 xl:order-3">
        <SkeletonCalendar daysShort={daysShort} />
      </div>

      {/* Right Panel */}
      <div className="relative order-4 min-w-0">
        <SkeletonRightPanel />
      </div>

      {/* Legend */}
      <div className="flex gap-5 flex-wrap px-1 order-5 xl:col-span-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <SkeletonBlock className="w-2.5 h-2.5 rounded-[3px]" />
            <SkeletonBlock className="h-[12px] rounded" style={{ width: `${50 + i * 8}px` }} />
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
