import React, { useMemo, useState } from 'react';
import {
  Timer, Moon, TrendingUp, Banknote, CircleDollarSign,
  CalendarCheck, ChevronLeft, ChevronRight,
  CalendarDays, List, PieChart, LayoutGrid,
} from 'lucide-react';
import { DonutChart, LegendRow } from './charts';

const fmt1 = (n) => n.toFixed(1);
const fmtB = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateKey = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayKeyFn = () => {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
};

// ─────────────────────────────────────────────────────────────────────────────
// แท็บ "รายเดือน" — มี 3 แท็บย่อย: List Worklog / Graph / สรุปรายได้ (Summary)
export default function MonthlySummary({
  earningsSummary, entries, holidays, publicHolidays,
  salary, otRate = 0, std = 8, socialSecurity = 0, paymentType = 'monthly',
  lang, t, viewY, viewM, setViewM, setViewY, today,
  onSelectDay, showToast,
}) {
  const [tab, setTab] = useState('list'); // 'list' | 'graph' | 'summary'

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
  const regEarn = paymentType === 'daily' ? s.total_regular_earning : salary;
  const otEarn = s.total_ot_earning;
  const shiftEarn = s.total_shift_allowance || 0;
  const shiftDays = s.shift_days || 0;
  const grossEarn = regEarn + otEarn + shiftEarn;
  const totalEarn = Math.max(0, grossEarn - (socialSecurity || 0));
  const otDisplayRate = Number(salary) > 0 ? (Number(salary) / 30 / (Number(std) || 8)) * 1.5 : otRate;

  // ── OT tier ──
  const otTiers = [
    { key: '1', label: t.ot_x1, hint: t.ot_x1_hint, hours: s.total_ot_hour_1 || 0, earn: s.total_ot_earning_1 || 0, color: '#fcd34d' },
    { key: '15', label: t.ot_x15, hint: t.ot_x15_hint, hours: s.total_ot_hour_15 || 0, earn: s.total_ot_earning_15 || 0, color: '#c29302' },
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

  const tabs = [
    { id: 'list', Icon: List, label: t.tab_worklog },
    { id: 'graph', Icon: PieChart, label: t.tab_graph },
    { id: 'summary', Icon: LayoutGrid, label: t.tab_summary },
  ];

  return (
    <div className="flex flex-col gap-5 animate-[fadeUp_0.4s_ease_both]">

      {/* ── Header: tabs (แทน title) + month nav ── */}
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

        {/* Month nav + Today */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile month/year selects */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="relative">
              <select value={viewM} onChange={(e) => setViewM(Number(e.target.value))}
                className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-[#3B4FE4]">
                {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
            </div>
            <div className="relative">
              <select value={viewY} onChange={(e) => { setViewY(Number(e.target.value)); showToast(lang === 'th' ? 'กำลังโหลดข้อมูล...' : 'Loading data...'); }}
                className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-[#3B4FE4]">
                {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>{lang === 'th' ? y + 543 : y}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-[#E8EAEF] rounded-xl px-1 py-1 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <button onClick={goToday}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[#6B7280] text-[12px] font-semibold hover:bg-[#EEF0FD] hover:text-[#3B4FE4] cursor-pointer transition-all">
              <CalendarCheck size={13} /> {t.today}
            </button>
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg grid place-items-center text-[#6B7280] hover:bg-[#EEF0FD] hover:text-[#3B4FE4] cursor-pointer transition-all">
              <ChevronLeft size={15} />
            </button>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg grid place-items-center text-[#6B7280] hover:bg-[#EEF0FD] hover:text-[#3B4FE4] cursor-pointer transition-all">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════ TAB: LIST WORKLOG ══════════════ */}
      {tab === 'list' && (
        <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex flex-col animate-[fadeUp_0.35s_ease_both]">
          <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF] shrink-0">
            <span className="text-sm font-bold text-[#111827]">{t.monthly_worklog}</span>
            <span className="text-[11px] text-[#9CA3AF] font-medium">{workedCount} {t.entries}</span>
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
                ? { border: 'border-l-[#EF4444]', box: 'bg-[#FEECEC] text-[#EF4444]', hover: 'hover:bg-[#FEF2F2]' }
                : isHol
                  ? { border: 'border-l-[#998ed9]', box: 'bg-[rgba(153,142,217,0.15)] text-[#998ed9]', hover: 'hover:bg-[rgba(153,142,217,0.06)]' }
                  : hasOT
                    ? { border: 'border-l-[#fbde3a]', box: 'bg-[#fffdef] text-[#c29302]', hover: 'hover:bg-[#fffdef]' }
                    : hasShift
                      ? { border: 'border-l-[#FDBA74]', box: 'bg-[#FFF3E6] text-[#E8730C]', hover: 'hover:bg-[#FFF3E6]' }
                      : isEmpty
                        ? { border: 'border-l-transparent', box: 'bg-[#F3F4F6] text-[#C0C5CE]', hover: 'hover:bg-[#F8F9FB]' }
                        : { border: 'border-l-transparent', box: 'bg-[#F8F9FB] text-[#374151]', hover: 'hover:bg-[#F8F9FB]' };
              const hasAccent = publicHol || isHol || hasOT || hasShift;

              return (
                <div
                  key={k}
                  onClick={() => onSelectDay(k)}
                  className={`grid grid-cols-[36px_1fr_auto] items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all border
                    ${isEmpty ? 'opacity-60' : ''}
                    ${hasAccent ? `border-l-[3px] ${accent.border} border-r-transparent border-t-transparent border-b-transparent ${accent.hover}`
                      : `border-transparent ${accent.hover} hover:border-[#E8EAEF]`}
                    ${isToday ? 'ring-1 ring-[#6fa3cb]' : ''}`}
                >
                  {/* Day box */}
                  <div className={`w-9 h-9 rounded-lg grid place-items-center text-sm font-bold shrink-0 ${accent.box}`}>
                    {day}
                  </div>

                  {/* Middle info */}
                  <div className="min-w-0">
                    <div className={`text-[11px] font-semibold ${isEmpty ? 'text-[#C0C5CE]' : 'text-[#6B7280]'}`}>{t.days_short[dw]}</div>
                    {publicHol ? (
                      <div className="text-[10px] font-bold text-[#EF4444] truncate flex items-center gap-1" title={publicHolName}>
                        <CalendarDays size={10} className="shrink-0" /> {publicHolName || t.public_holiday_legend}
                      </div>
                    ) : isLeaveEntry ? (
                      <div className="text-[10px] font-medium" style={{ color: e.leave?.type === 'training' ? '#111827' : '#8B5CF6' }}>
                        {e.leave?.type === 'sick' ? (lang === 'th' ? 'ลาป่วย' : 'Sick')
                          : e.leave?.type === 'personal' ? (lang === 'th' ? 'ลากิจ' : 'Personal')
                          : e.leave?.type === 'training' ? (lang === 'th' ? 'อบรม' : 'Training')
                          : (lang === 'th' ? 'ลาพักร้อน' : 'Vacation')}
                      </div>
                    ) : hasEntry ? (
                      <div className="text-[11px] text-[#9CA3AF]">{e.in} → {e.out}</div>
                    ) : isHol ? (
                      <div className="text-[10px] font-medium text-[#998ed9]">{t.holiday_legend}</div>
                    ) : (
                      <div className="text-[10px] text-[#C0C5CE]">{t.no_work_day}</div>
                    )}
                  </div>

                  {/* Right: hours / earnings */}
                  {hasEntry && !isLeaveEntry && (
                    <div className="text-right flex flex-col items-end gap-0.5">
                      {(paymentType !== 'monthly' || eEarn > 0) && (
                        <div className="text-[12px] font-bold text-[#10B981]">{fmtB(eEarn)}</div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-[#3B4FE4]">{fmt1(hTotal)}h</span>
                        {hasOT && (
                          <span className="text-[9px] font-bold bg-[#fffdef] text-[#c29302] px-1 py-px rounded">+{fmt1(netOt)}h OT</span>
                        )}
                        {hasShift && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold bg-[#FFF3E6] text-[#E8730C] px-1 py-px rounded">
                            <Moon size={8} strokeWidth={2.5} /> {t.shift_short}
                          </span>
                        )}
                      </div>
                      {hasOT && de?.ot_earning > 0 && (
                        <span className="text-[9px] font-bold text-[#c29302] leading-none">+{fmtB(de.ot_earning)}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: GRAPH ══════════════ */}
      {tab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-[fadeUp_0.35s_ease_both]">

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
                  { label: t.regular_earnings, value: regEarn, color: '#3B4FE4' },
                  { label: t.ot_earnings, value: otEarn, color: '#c29302' },
                  { label: t.shift_earnings, value: shiftEarn, color: '#E8730C' },
                ]}
              />
              {/* Legend */}
              <div className="w-full flex flex-col gap-2">
                <LegendRow color="#3B4FE4" label={t.regular_earnings} value={fmtB(regEarn)} total={grossEarn} raw={regEarn} />
                <LegendRow color="#c29302" label={t.ot_earnings} value={fmtB(otEarn)} total={grossEarn} raw={otEarn} />
                <LegendRow color="#E8730C" label={t.shift_earnings} value={fmtB(shiftEarn)} total={grossEarn} raw={shiftEarn} />
              </div>
              {/* Net summary */}
              <div className="w-full mt-1 pt-4 border-t border-[#E8EAEF] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6B7280]">{t.gross_income}</span>
                  <span className="font-semibold text-[#111827]">{fmtB(grossEarn)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6B7280]">{t.less_social_security}</span>
                  <span className="font-semibold text-[#EF4444]">−{fmtB(socialSecurity || 0)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-dashed border-[#E8EAEF]">
                  <span className="text-[13px] font-bold text-[#111827]">{t.net_remaining}</span>
                  <span className="text-[18px] font-bold text-[#10B981]">{fmtB(totalEarn)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* OT breakdown donut */}
          <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
              <span className="text-[15px] font-bold text-[#111827]">{t.ot_breakdown}</span>
              <span className="text-[11px] text-[#9CA3AF]">{fmt1(totalOT)}h</span>
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
              <div className="w-full mt-1 pt-4 border-t border-[#E8EAEF] flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#111827]">{t.total_ot_earnings}</span>
                <span className="text-[18px] font-bold text-[#c29302]">{fmtB(otEarn)}</span>
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
            <SummaryCard variant="amber" Icon={Timer} label={t.total_ot_hours} value={`${fmt1(totalOT)}h`} sub={`${otDays} ${t.with_overtime}`} />
            <SummaryCard variant="orange" Icon={Moon} label={t.shift_earnings} value={fmtB(shiftEarn)} sub={`${shiftDays} ${t.shift_days_label}`} />
            <SummaryCard variant="indigo" Icon={TrendingUp} label={t.ot_earnings} value={fmtB(otEarn)} sub={`${t.at_rate} ${fmt1(otDisplayRate)}${t.hr_unit}`} />
            <SummaryCard variant="green" Icon={Banknote} label={t.regular_earnings} value={fmtB(regEarn)} sub={t.est_daily_base} />

            {/* Hero card */}
            <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl border-transparent cursor-default
              bg-gradient-to-br from-[#A5AEFC] to-[#8995F4]
              shadow-[0_8px_24px_rgba(137,149,244,0.3)] p-4 sm:p-6
              transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
              hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(137,149,244,0.4)]">
              <span className="absolute top-4 right-4 sm:top-5 sm:right-5 bg-white/25 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                {t.this_month}
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-white/25 grid place-items-center mb-3 sm:mb-4">
                <CircleDollarSign size={17} className="text-white" />
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-white/80 uppercase tracking-[0.05em] sm:tracking-[0.1em] mb-1 sm:mb-1.5">{t.total_earnings}</div>
              <div className="text-[1.4rem] sm:text-[2rem] font-bold text-white leading-none tracking-tight">{fmtB(totalEarn)}</div>
              <div className="text-[10px] sm:text-[12px] text-white/70 mt-1 sm:mt-1.5">{daysWorked} {t.worked_days}</div>
            </div>
          </div>

          {/* OT by rate — แสดงเป็นการ์ดปกติ (ไม่ใช่แถบชาร์จพลัง) */}
          <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
              <div className="text-[15px] font-bold text-[#111827]">{t.ot_by_rate}</div>
              <div className="text-[11px] text-[#9CA3AF]">{fmt1(totalOT)}h · {fmtB(otEarn)}</div>
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
              <span className="text-[15px] font-bold text-[#c29302]">{fmt1(totalOT)}<span className="text-[11px] font-normal text-[#9CA3AF]">h</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
const variantStyles = {
  amber: {
    wrap: 'bg-white border-[#E8EAEF] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]',
    stripe: 'bg-[#fbde3a]', icon: 'bg-[#fffdef] text-[#c29302]', val: 'text-[#c29302]',
  },
  indigo: {
    wrap: 'bg-white border-[#E8EAEF] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]',
    stripe: 'bg-[#3B4FE4]', icon: 'bg-[#EEF0FD] text-[#3B4FE4]', val: 'text-[#3B4FE4]',
  },
  green: {
    wrap: 'bg-white border-[#E8EAEF] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]',
    stripe: 'bg-[#10B981]', icon: 'bg-[#ECFDF5] text-[#10B981]', val: 'text-[#10B981]',
  },
  orange: {
    wrap: 'bg-white border-[#E8EAEF] hover:shadow-[0_8px_28px_rgba(17,24,39,0.10)] hover:border-[#D1D5E0]',
    stripe: 'bg-[#FDBA74]', icon: 'bg-[#FFF3E6] text-[#E8730C]', val: 'text-[#E8730C]',
  },
};

function SummaryCard({ variant, Icon, label, value, sub }) {
  const st = variantStyles[variant];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-6 cursor-default
      transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      shadow-[0_1px_3px_rgba(17,24,39,0.06)] hover:-translate-y-[3px] ${st.wrap}`}>
      <span className={`absolute top-0 left-4 sm:left-6 right-4 sm:right-6 h-[3px] rounded-b-[4px] opacity-60 ${st.stripe}`} />
      <div className={`w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-[10px] grid place-items-center mb-3 sm:mb-4 ${st.icon}`}>
        <Icon size={14} strokeWidth={2} className="sm:hidden" />
        <Icon size={17} strokeWidth={2} className="hidden sm:block" />
      </div>
      <div className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.05em] sm:tracking-[0.1em] mb-1 sm:mb-1.5 truncate">{label}</div>
      <div className={`text-[1.4rem] sm:text-[2rem] font-bold leading-none tracking-tight truncate ${st.val}`}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[12px] mt-1 sm:mt-1.5 text-[#9CA3AF] truncate">{sub}</div>}
    </div>
  );
}
