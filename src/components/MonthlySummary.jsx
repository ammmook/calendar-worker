import React, { useMemo, useState } from 'react';
import {
  Timer, Moon, TrendingUp, Banknote, CircleDollarSign,
  CalendarCheck, ChevronLeft, ChevronRight,
  CalendarDays, List, PieChart, LayoutGrid,
} from 'lucide-react';
import { DonutChart, LegendRow } from './charts';
import { LEAVE_META } from './leaveMeta';
import { fmt1, fmtB, dateKey, todayKey as todayKeyFn, yearOptions } from '../utils/format';
import { forecastMonth, compareMonths, buildInsights } from '../utils/insights';
import { buildStatement } from '../utils/exportReport';
import GoalForecast from './GoalForecast';
import MonthCompare from './MonthCompare';
import ExportMenu from './ExportMenu';
import CountUp from './CountUp';

// ─────────────────────────────────────────────────────────────────────────────
// แท็บ "รายเดือน" — มี 3 แท็บย่อย: List Worklog / Graph / สรุปรายได้ (Summary)
export default function MonthlySummary({
  earningsSummary, entries, holidays, publicHolidays,
  salary, otRate = 0, std = 8, socialSecurity = 0,
  lang, t, viewY, viewM, setViewM, setViewY, today,
  onSelectDay, showToast, goal = 0, onGoalChange,
}) {
  const [tab, setTab] = useState('summary'); // 'summary' | 'graph' | 'list'

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(viewY - 1); }
    else setViewM(viewM - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(viewY + 1); }
    else setViewM(viewM + 1);
  };
  const goToday = () => { setViewY(today.getFullYear()); setViewM(today.getMonth()); };

  // ── Monthly aggregates (mirror App.jsx) ──
  const s = useMemo(() => {
    return earningsSummary.monthly.find(m => m.month_num === viewM + 1 && m.year_num === viewY) || {
      days_worked: 0, ot_days: 0, shift_days: 0,
      total_working_hour: 0, total_ot_hour: 0, total_ot_earning: 0,
      total_regular_earning: 0, total_shift_allowance: 0, total_earning: 0,
      total_ot_hour_15: 0, total_ot_earning_15: 0,
      total_ot_hour_1: 0, total_ot_earning_1: 0,
      total_ot_hour_3: 0, total_ot_earning_3: 0,
    };
  }, [earningsSummary.monthly, viewY, viewM]);

  const totalOT = s.total_ot_hour;
  const otDays = s.ot_days;
  const daysWorked = s.days_worked;
  // ใช้ยอดจาก monthly_summary (backend) — เดือนที่ไม่มี entry = 0 (ไม่บวกเงินเดือน/ไม่หักประกันสังคม)
  const regEarn = s.total_regular_earning || 0;
  const otEarn = s.total_ot_earning;
  const shiftEarn = s.total_shift_allowance || 0;
  const shiftDays = s.shift_days || 0;
  const grossEarn = regEarn + otEarn + shiftEarn;
  const totalEarn = s.total_earning || 0; // หักประกันสังคมแล้วจาก backend
  const otDisplayRate = Number(salary) > 0 ? (Number(salary) / 30 / (Number(std) || 8)) * 1.5 : otRate;

  // ── เป้าหมาย + พยากรณ์ / เทียบเดือนก่อน / ส่งออก (แสดงผลล้วน ไม่แตะสูตรคิดเงิน) ──
  const forecast = useMemo(
    () => forecastMonth({ viewY, viewM, today, summary: s, salary, socialSecurity, otRate: otDisplayRate, goal }),
    [viewY, viewM, today, s, salary, socialSecurity, otDisplayRate, goal]
  );
  const cmp = useMemo(
    () => compareMonths({ daily: earningsSummary.daily, viewY, viewM, today }),
    [earningsSummary.daily, viewY, viewM, today]
  );
  const insights = useMemo(() => buildInsights(cmp), [cmp]);
  const getStatement = () => buildStatement({
    t, lang, viewY, viewM, s, entries, daily: earningsSummary.daily, socialSecurity,
  });

  // ── OT tier ──
  const otTiers = [
    { key: '1', label: t.ot_x1, hint: t.ot_x1_hint, hours: s.total_ot_hour_1 || 0, earn: s.total_ot_earning_1 || 0, color: '#fcd34d' },
    { key: '15', label: t.ot_x15, hint: t.ot_x15_hint, hours: s.total_ot_hour_15 || 0, earn: s.total_ot_earning_15 || 0, color: 'var(--color-ot)' },
    { key: '3', label: t.ot_x3, hint: t.ot_x3_hint, hours: s.total_ot_hour_3 || 0, earn: s.total_ot_earning_3 || 0, color: '#92700a' },
  ];

  // ── Full-month worklog rows (ทุกวันในเดือน) ──
  const daysInM = new Date(viewY, viewM + 1, 0).getDate();
  const monthKey = `${viewY}-${String(viewM + 1).padStart(2, '0')}`;
  const workedCount = useMemo(
    () => Object.keys(entries).filter((k) => k.startsWith(monthKey)).length,
    [entries, monthKey]
  );
  const todayK = todayKeyFn();
  const isCurrentMonth = viewY === today.getFullYear() && viewM === today.getMonth();

  const tabs = [
    { id: 'summary', Icon: LayoutGrid, label: t.tab_summary },
    { id: 'graph', Icon: PieChart, label: t.tab_graph },
    { id: 'list', Icon: List, label: t.tab_worklog },
  ];

  return (
    <div className="flex flex-col gap-5 animate-[fadeUp_0.4s_ease_both]">

      {/* ── Header: tabs (แทน title) + month nav ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-surface-alt border border-line rounded-[12px] p-1">
          {tabs.map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] font-semibold cursor-pointer transition
                ${tab === id
                  ? 'bg-white text-primary shadow-[0_1px_3px_rgba(17,24,39,0.08)]'
                  : 'text-muted hover:text-ink-2'}`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Month nav + Today */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile month/year selects */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="relative">
              <select value={viewM} aria-label={t.month_label} onChange={(e) => setViewM(Number(e.target.value))}
                className="appearance-none bg-white border-[1.5px] border-line-strong rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/25 hover:border-primary">
                {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">▾</span>
            </div>
            <div className="relative">
              <select value={viewY} aria-label={t.year_label} onChange={(e) => { setViewY(Number(e.target.value)); showToast(t.loading_data); }}
                className="appearance-none bg-white border-[1.5px] border-line-strong rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/25 hover:border-primary">
                {yearOptions(today, viewY).map((y) => (
                  <option key={y} value={y}>{lang === 'th' ? y + 543 : y}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">▾</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-line rounded-xl px-1 py-1 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <button type="button" onClick={goToday}
              className="flex items-center gap-1.5 h-10 sm:h-8 px-2.5 rounded-lg text-muted text-[12px] font-semibold hover:bg-primary-soft hover:text-primary cursor-pointer transition">
              <CalendarCheck size={13} /> {t.today}
            </button>
            <button type="button" onClick={prevMonth} aria-label={t.prev_month} className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg grid place-items-center text-muted hover:bg-primary-soft hover:text-primary cursor-pointer transition">
              <ChevronLeft size={15} />
            </button>
            <button type="button" onClick={nextMonth} aria-label={t.next_month} className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg grid place-items-center text-muted hover:bg-primary-soft hover:text-primary cursor-pointer transition">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="hidden sm:block">
            <ExportMenu variant="dropdown" getStatement={getStatement} disabled={workedCount === 0} t={t} />
          </div>
        </div>
      </div>

      {/* ══════════════ TAB: LIST WORKLOG ══════════════ */}
      {tab === 'list' && (
        <div className="card overflow-hidden flex flex-col animate-[fadeUp_0.35s_ease_both]">
          <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-line shrink-0">
            <span className="text-sm font-bold text-ink">{t.monthly_worklog}</span>
            <span className="text-[11px] text-muted font-medium">{workedCount} {t.entries}</span>
          </div>
          <div className="p-2.5 flex flex-col gap-1">
            {Array.from({ length: daysInM }, (_, i) => i + 1).map((day) => {
              const k = dateKey(viewY, viewM + 1, day);
              const e = entries[k];
              const dw = new Date(k + 'T00:00:00').getDay();
              const publicHol = publicHolidays?.[k] || null;
              const publicHolName = publicHol ? (lang === 'th' ? publicHol.name_th : publicHol.name_en) : '';
              const isHol = holidays.has(k);
              const isToday = k === todayK;
              const de = earningsSummary.daily[k];
              const hTotal = de?.working_hour || 0;
              const netOt = de?.ot_hour || 0;
              const eEarn = de?.total_earning || 0;
              const shiftPay = de?.shift_allowance || 0;
              const hasOT = netOt > 0;
              const hasShift = shiftPay > 0;
              const hasEntry = !!e;
              const isLeaveEntry = hasEntry && e.leave !== null && e.leave !== undefined;
              // วันที่ไม่มีการทำงาน/ลา/หยุด = ทำสีเทาเหมือน disable
              const isEmpty = !hasEntry && !isHol && !publicHol;

              // สีขอบซ้าย + กล่องเลขวันตามประเภทวัน (นักขัตฤกษ์ > วันหยุด > OT > กะ)
              const accent = publicHol
                ? { border: 'border-l-danger', box: 'bg-[#FEECEC] text-danger', hover: 'hover:bg-[#FEF2F2]' }
                : isHol
                  ? { border: 'border-l-holiday-user', box: 'bg-holiday-user/15 text-holiday-user', hover: 'hover:bg-holiday-user/5' }
                  : hasOT
                    ? { border: 'border-l-ot-bar', box: 'bg-ot-soft text-ot', hover: 'hover:bg-ot-soft' }
                    : hasShift
                      ? { border: 'border-l-[#FDBA74]', box: 'bg-shift-soft text-shift', hover: 'hover:bg-shift-soft' }
                      : isEmpty
                        ? { border: 'border-l-transparent', box: 'bg-[#F3F4F6] text-[#C0C5CE]', hover: 'hover:bg-surface-alt' }
                        : { border: 'border-l-transparent', box: 'bg-surface-alt text-ink-2', hover: 'hover:bg-surface-alt' };
              const hasAccent = publicHol || isHol || hasOT || hasShift;

              return (
                <button
                  type="button"
                  key={k}
                  onClick={() => onSelectDay(k)}
                  className={`w-full text-left bg-transparent grid grid-cols-[36px_1fr_auto] items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition border
                    ${isEmpty ? 'opacity-60' : ''}
                    ${hasAccent ? `border-l-[3px] ${accent.border} border-r-transparent border-t-transparent border-b-transparent ${accent.hover}`
                      : `border-transparent ${accent.hover} hover:border-line`}
                    ${isToday ? 'ring-1 ring-today' : ''}`}
                >
                  {/* Day box */}
                  <div className={`w-9 h-9 rounded-lg grid place-items-center text-sm font-bold shrink-0 ${accent.box}`}>
                    {day}
                  </div>

                  {/* Middle info */}
                  <div className="min-w-0">
                    <div className={`text-[11px] font-semibold ${isEmpty ? 'text-[#C0C5CE]' : 'text-muted'}`}>{t.days_short[dw]}</div>
                    {publicHol ? (
                      <div className="text-[10px] font-bold text-danger truncate flex items-center gap-1" title={publicHolName}>
                        <CalendarDays size={10} className="shrink-0" /> {publicHolName || t.public_holiday_legend}
                      </div>
                    ) : isLeaveEntry ? (
                      <div className="text-[10px] font-medium" style={{ color: e.leave?.type === 'training' ? '#111827' : '#8B5CF6' }}>
                        {(() => { const li = LEAVE_META[e.leave?.type] || LEAVE_META.vacation; return lang === 'th' ? li.th : li.en; })()}
                      </div>
                    ) : hasEntry ? (
                      <>
                        <div className="text-[11px] text-muted">{e.in} → {e.out}</div>
                        {e.note && (
                          <div className="text-[10px] text-muted truncate flex items-center gap-1" title={e.note}>
                            <span className="w-1 h-1 rounded-full bg-muted shrink-0" />
                            <span className="truncate">{e.note}</span>
                          </div>
                        )}
                      </>
                    ) : isHol ? (
                      <div className="text-[10px] font-medium text-holiday-user">{t.holiday_legend}</div>
                    ) : (
                      <div className="text-[10px] text-[#C0C5CE]">{t.no_work_day}</div>
                    )}
                  </div>

                  {/* Right: hours / earnings */}
                  {hasEntry && !isLeaveEntry && (
                    <div className="text-right flex flex-col items-end gap-0.5">
                      {eEarn > 0 && (
                        <div className="text-[12px] font-bold text-income">{fmtB(eEarn)}</div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-primary">{fmt1(hTotal)}h</span>
                        {hasOT && (
                          <span className="text-[10px] font-bold bg-ot-soft text-ot px-1 py-px rounded">+{fmt1(netOt)}h OT</span>
                        )}
                        {hasShift && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold bg-shift-soft text-shift px-1 py-px rounded">
                            <Moon size={8} strokeWidth={2.5} /> {t.shift_short}
                          </span>
                        )}
                      </div>
                      {hasOT && de?.ot_earning > 0 && (
                        <span className="text-[10px] font-bold text-ot leading-none">+{fmtB(de.ot_earning)}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: GRAPH ══════════════ */}
      {tab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-[fadeUp_0.35s_ease_both]">

          {/* Income breakdown donut */}
          <div className="card overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-line text-[15px] font-bold text-ink">
              {t.income_breakdown}
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              <DonutChart
                size={210}
                thickness={30}
                centerLabel={t.gross_income}
                centerValue={fmtB(grossEarn)}
                segments={[
                  { label: t.regular_earnings, value: regEarn, color: 'var(--color-primary)' },
                  { label: t.ot_earnings, value: otEarn, color: 'var(--color-ot)' },
                  { label: t.shift_earnings, value: shiftEarn, color: 'var(--color-shift)' },
                ]}
              />
              {/* Legend */}
              <div className="w-full flex flex-col gap-2">
                <LegendRow color="var(--color-primary)" label={t.regular_earnings} value={fmtB(regEarn)} total={grossEarn} raw={regEarn} />
                <LegendRow color="var(--color-ot)" label={t.ot_earnings} value={fmtB(otEarn)} total={grossEarn} raw={otEarn} />
                <LegendRow color="var(--color-shift)" label={t.shift_earnings} value={fmtB(shiftEarn)} total={grossEarn} raw={shiftEarn} />
              </div>
              {/* Net summary */}
              <div className="w-full mt-1 pt-4 border-t border-line flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{t.gross_income}</span>
                  <span className="font-semibold text-ink">{fmtB(grossEarn)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{t.less_social_security}</span>
                  <span className="font-semibold text-danger">−{fmtB(socialSecurity || 0)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-dashed border-line">
                  <span className="text-[13px] font-bold text-ink">{t.net_remaining}</span>
                  <span className="text-[18px] font-bold text-income">{fmtB(totalEarn)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* OT breakdown donut */}
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <span className="text-[15px] font-bold text-ink">{t.ot_breakdown}</span>
              <span className="text-[11px] text-muted">{fmt1(totalOT)}h</span>
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              <DonutChart
                size={210}
                thickness={30}
                centerLabel={t.total_ot_earnings}
                centerValue={fmtB(otEarn)}
                segments={otTiers.map((tier) => ({ label: tier.label, value: tier.earn, color: tier.color }))}
              />
              {/* Legend */}
              <div className="w-full flex flex-col gap-2">
                {otTiers.map((tier) => (
                  <LegendRow
                    key={tier.key}
                    color={tier.color}
                    label={tier.label}
                    sub={`${fmt1(tier.hours)}h · ${tier.hint}`}
                    value={fmtB(tier.earn)}
                    total={otEarn}
                    raw={tier.earn}
                  />
                ))}
              </div>
              <div className="w-full mt-1 pt-4 border-t border-line flex items-center justify-between">
                <span className="text-[13px] font-bold text-ink">{t.total_ot_earnings}</span>
                <span className="text-[18px] font-bold text-ot">{fmtB(otEarn)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: SUMMARY (Grid) ══════════════ */}
      {tab === 'summary' && (
        <div className="flex flex-col gap-5 animate-[fadeUp_0.35s_ease_both]">
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard variant="amber" Icon={Timer} label={t.total_ot_hours} value={<CountUp value={totalOT} format={(n) => `${fmt1(n)}h`} />} sub={`${otDays} ${t.with_overtime}`} />
            <SummaryCard variant="orange" Icon={Moon} label={t.shift_earnings} value={<CountUp value={shiftEarn} format={fmtB} />} sub={`${shiftDays} ${t.shift_days_label}`} />
            <SummaryCard variant="indigo" Icon={TrendingUp} label={t.ot_earnings} value={<CountUp value={otEarn} format={fmtB} />} sub={`${t.at_rate} ${fmt1(otDisplayRate)}${t.hr_unit}`} />
            <SummaryCard variant="green" Icon={Banknote} label={t.regular_earnings} value={<CountUp value={regEarn} format={fmtB} />} sub={t.est_daily_base} />

            {/* Hero card */}
            <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl border-transparent cursor-default
              bg-gradient-to-br from-[#A5AEFC] to-[#8995F4]
              shadow-[0_8px_24px_rgba(137,149,244,0.3)] p-4 sm:p-6
              transition duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
              hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(137,149,244,0.4)]">
              <span className="absolute top-4 right-4 sm:top-5 sm:right-5 bg-white/25 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                {isCurrentMonth ? t.this_month : `${t.short_months[viewM]} ${lang === 'th' ? viewY + 543 : viewY}`}
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-white/25 grid place-items-center mb-3 sm:mb-4">
                <CircleDollarSign size={17} className="text-white" />
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-white/80 uppercase tracking-[0.05em] sm:tracking-[0.1em] mb-1 sm:mb-1.5">{t.total_earnings}</div>
              <div className="text-[1.4rem] sm:text-[2rem] font-bold text-white leading-none tracking-tight tabular-nums"><CountUp value={totalEarn} format={fmtB} /></div>
              <div className="text-[10px] sm:text-[12px] text-white/70 mt-1 sm:mt-1.5">{daysWorked} {t.worked_days}</div>
              {/* มือถือ: ส่งออกอยู่ที่มุมการ์ดรายได้รวม (สิ่งที่กำลังจะส่งออก) เปิดเป็นแผ่นเลื่อนขึ้นจากล่าง */}
              <div className="absolute bottom-3.5 right-3.5 sm:hidden">
                <ExportMenu variant="sheet" period={`${t.months[viewM]} ${lang === 'th' ? viewY + 543 : viewY}`}
                  getStatement={getStatement} disabled={workedCount === 0} t={t} />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* คอลัมน์ซ้าย: สรุป OT แยกอัตรา แล้วต่อด้วยเป้าหมายรายได้ */}
          <div className="flex flex-col gap-5 min-w-0">
          {/* OT by rate — แสดงเป็นการ์ดปกติ (ไม่ใช่แถบชาร์จพลัง) */}
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="text-[15px] font-bold text-ink">{t.ot_by_rate}</div>
              <div className="text-[11px] text-muted">{fmt1(totalOT)}h · {fmtB(otEarn)}</div>
            </div>
            <div className="p-2.5 flex flex-col gap-0.5">
              {otTiers.map((tier) => (
                <div key={tier.key} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-ot-soft transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-[6px] grid place-items-center shrink-0 bg-ot-soft">
                      <Timer size={12} className="text-ot" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-ink-2 leading-tight">{tier.label}</div>
                      <div className="text-[10px] text-muted leading-tight truncate">{tier.hint}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 leading-tight">
                    <div className="text-[12px] font-bold text-ot">{tier.earn > 0 ? '+' + fmtB(tier.earn) : '—'}</div>
                    <div className="text-[10px] text-muted">{fmt1(tier.hours)} h</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3.5 border-t border-line flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em]">{t.total_ot_hours}</span>
              <span className="text-[15px] font-bold text-ot">{fmt1(totalOT)}<span className="text-[11px] font-normal text-muted">h</span></span>
            </div>
          </div>

          {/* เป้าหมายรายได้ + พยากรณ์สิ้นเดือน — ซ่อนในเดือนที่ยังไม่เริ่ม */}
          {forecast.state !== 'future' && (
            <GoalForecast f={forecast} goal={goal} setGoal={onGoalChange} otRate={otDisplayRate} t={t} />
          )}
          </div>

          {/* เทียบเดือนก่อน + ข้อสังเกต */}
          <MonthCompare cmp={cmp} insights={insights} viewM={viewM} t={t} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
const variantStyles = {
  amber: {
    wrap: 'bg-white border-line hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-line-strong',
    stripe: 'bg-ot-bar', icon: 'bg-ot-soft text-ot', val: 'text-ot',
  },
  indigo: {
    wrap: 'bg-white border-line hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-line-strong',
    stripe: 'bg-primary', icon: 'bg-primary-soft text-primary', val: 'text-primary',
  },
  green: {
    wrap: 'bg-white border-line hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-line-strong',
    stripe: 'bg-income', icon: 'bg-income-soft text-income', val: 'text-income',
  },
  orange: {
    wrap: 'bg-white border-line hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-line-strong',
    stripe: 'bg-[#FDBA74]', icon: 'bg-shift-soft text-shift', val: 'text-shift',
  },
};

function SummaryCard({ variant, Icon, label, value, sub }) {
  const st = variantStyles[variant];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-6 cursor-default
      transition duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      shadow-[0_1px_3px_rgba(17,24,39,0.06)] hover:-translate-y-[3px] ${st.wrap}`}>
      <span className={`absolute top-0 left-4 sm:left-6 right-4 sm:right-6 h-[3px] rounded-b-[4px] opacity-60 ${st.stripe}`} />
      <div className={`w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-[10px] grid place-items-center mb-3 sm:mb-4 ${st.icon}`}>
        <Icon size={14} strokeWidth={2} className="sm:hidden" />
        <Icon size={17} strokeWidth={2} className="hidden sm:block" />
      </div>
      <div className="text-[10px] sm:text-[11px] font-bold text-muted uppercase tracking-[0.05em] sm:tracking-[0.1em] mb-1 sm:mb-1.5 truncate">{label}</div>
      <div className={`text-[1.4rem] sm:text-[2rem] font-bold leading-none tracking-tight truncate ${st.val}`}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[12px] mt-1 sm:mt-1.5 text-muted truncate">{sub}</div>}
    </div>
  );
}
