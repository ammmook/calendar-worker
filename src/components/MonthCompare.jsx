import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Timer, Trophy, CalendarDays, GitCompareArrows } from 'lucide-react';
import { fmt1, fmtB, fill } from '../utils/format';
import CountUp from './CountUp';
import { useInView } from './useMotion';

// ข้อความ insight ตามภาษา (insights มาจาก buildInsights)
function insightText(i, t) {
  switch (i.id) {
    case 'ot_up': return fill(t.ins_ot_up, { pct: i.pct });
    case 'ot_down': return fill(t.ins_ot_down, { pct: i.pct });
    case 'ot_same': return t.ins_ot_same;
    case 'ot_new': return fill(t.ins_ot_new, { hours: fmt1(i.hours) });
    case 'ot_gone': return fill(t.ins_ot_gone, { hours: fmt1(i.hours) });
    case 'best_day': {
      const dow = new Date(`${i.key}T00:00:00`).getDay();
      const date = `${t.days_short[dow]} ${Number(i.key.slice(8, 10))} ${t.short_months[Number(i.key.slice(5, 7)) - 1]}`;
      return fill(t.ins_best_day, { date, amount: fmtB(i.amount) });
    }
    case 'ot_weekday': return fill(t.ins_ot_weekday, { day: t.days_long[i.weekday], hours: fmt1(i.hours) });
    default: return '';
  }
}

const INSIGHT_STYLE = {
  ot: { Icon: Timer, box: 'bg-ot-soft text-ot' },
  best: { Icon: Trophy, box: 'bg-income-soft text-income' },
  weekday: { Icon: CalendarDays, box: 'bg-primary-soft text-primary' },
};
const styleOf = (id) => (id === 'best_day' ? INSIGHT_STYLE.best : id === 'ot_weekday' ? INSIGHT_STYLE.weekday : INSIGHT_STYLE.ot);

const METRIC = {
  extra: { label: 'cmp_extra', fmt: fmtB },
  otHours: { label: 'cmp_ot_hours', fmt: (n) => `${fmt1(n)} h` },
  workHours: { label: 'cmp_work_hours', fmt: (n) => `${fmt1(n)} h` },
  days: { label: 'cmp_days', fmt: (n) => String(Math.round(n)) },
};

function Delta({ m, t }) {
  if (m.delta === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-muted bg-surface-alt rounded-full px-2 py-0.5"><Minus size={11} />0%</span>;
  }
  const up = m.delta > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const text = m.pct === null ? t.cmp_new : `${Math.round(Math.abs(m.pct))}%`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5 tabular-nums
      ${up ? 'text-income-ink bg-income-soft' : 'text-muted bg-surface-alt'}`}>
      <Icon size={12} strokeWidth={2.4} />{text}
    </span>
  );
}

// การ์ด "เทียบเดือนก่อน" + ข้อสังเกตอัตโนมัติ
export default function MonthCompare({ cmp, insights, viewM, t }) {
  const [listRef, seen] = useInView();
  const range = cmp.available
    ? (cmp.partial
      ? fill(t.cmp_range_partial, { n: cmp.upTo })
      : fill(t.cmp_range_full, { a: t.short_months[viewM - 1], b: t.short_months[viewM] }))
    : '';

  return (
    <section className="card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <GitCompareArrows size={16} className="text-primary shrink-0" />
          <h3 className="text-[15px] font-bold text-ink">{t.cmp_title}</h3>
        </div>
        {range && <span className="text-[11px] text-muted text-right">{range}</span>}
      </div>

      {cmp.available ? (
        <ul ref={listRef} className="p-2.5 flex flex-col gap-0.5">
          {cmp.metrics.map((m) => {
            const def = METRIC[m.key];
            const max = Math.max(m.cur, m.prev, 0.0001);
            return (
              <li key={m.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-2.5 py-2.5 rounded-lg hover:bg-surface-alt transition-colors">
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-ink-2 leading-tight truncate">{t[def.label]}</div>
                  <div className="text-[10px] text-muted leading-tight mt-0.5 tabular-nums">{t.cmp_before} {def.fmt(m.prev)}</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-bold text-ink tabular-nums"><CountUp value={m.cur} format={def.fmt} duration={800} /></span>
                  <span className="w-[62px] flex justify-end"><Delta m={m} t={t} /></span>
                </div>
                {/* แถบเทียบ: เข้ม = เดือนนี้ จาง = เดือนก่อน ยืดออกเมื่อเลื่อนมาเห็น */}
                <div className="col-span-2 flex flex-col gap-[3px]" aria-hidden="true">
                  <span className="block h-[4px] rounded-full bg-primary transition-[width] duration-[800ms] ease-out"
                    style={{ width: seen ? `${(m.cur / max) * 100}%` : '0%' }} />
                  <span className="block h-[4px] rounded-full bg-primary-mid transition-[width] duration-[800ms] ease-out"
                    style={{ width: seen ? `${(m.prev / max) * 100}%` : '0%', transitionDelay: '120ms' }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-4 text-[13px] text-muted leading-snug">
          {cmp.reason === 'cross_year' ? t.cmp_cross_year : t.cmp_none}
        </p>
      )}

      <div className="px-5 pt-4 pb-5 border-t border-line mt-auto">
        <h4 className="text-[12px] font-bold text-ink-2 mb-3">{t.ins_title}</h4>
        {insights.length === 0 ? (
          <p className="text-[12px] text-muted">{t.ins_empty}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {insights.map((i) => {
              const { Icon, box } = styleOf(i.id);
              return (
                <li key={i.id} className="flex items-start gap-2.5">
                  <span className={`w-6 h-6 rounded-[6px] grid place-items-center shrink-0 ${box}`}><Icon size={13} /></span>
                  <span className="text-[13px] text-ink-2 leading-snug pt-0.5">{insightText(i, t)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
