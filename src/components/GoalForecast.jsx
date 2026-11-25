import React, { useState } from 'react';
import { Target, Pencil } from 'lucide-react';
import { fmtB, fmt1, fill } from '../utils/format';
import CountUp from './CountUp';
import Bubbles from './Bubbles';
import { useInView } from './useMotion';

// ลายทแยงแทนช่วง "คาดการณ์" — ต่างจากยอดจริงที่เป็นสีทึบ (ขนาด tile 10px เพื่อให้เลื่อนวนได้เนียน)
const STRIPE = 'rgba(99,102,241,0.34)';
const FORECAST_STRIPES = `linear-gradient(135deg, ${STRIPE} 25%, transparent 25%, transparent 50%, ${STRIPE} 50%, ${STRIPE} 75%, transparent 75%, transparent)`;

// ไล่สีของแต่ละส่วน (ยังคงโทนสีตามความหมาย: คราม=เงินเดือน เหลือง=OT ส้ม=เบี้ยกะ)
const GRAD = {
  base: 'linear-gradient(90deg, #4C5CF0 0%, #7461F2 55%, #A78BFA 100%)',
  ot: 'linear-gradient(90deg, #F2A200 0%, #FFC83D 60%, #FFE08A 100%)',
  shift: 'linear-gradient(90deg, #F2650A 0%, #FF9A4D 100%)',
};

// การ์ดเป้าหมายรายได้ + พยากรณ์สิ้นเดือน (f มาจาก forecastMonth)
export default function GoalForecast({ f, goal, setGoal, otRate, t, month = '', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => { setDraft(goal ? String(goal) : ''); setEditing(true); };
  const save = (e) => { e.preventDefault(); setGoal(draft); setEditing(false); };
  const remove = () => { setGoal(0); setEditing(false); };

  const showForm = editing || !goal;

  // ยังไม่ตั้งเป้า → แถบบรรทัดเดียว กดแล้วค่อยขยายเป็นฟอร์ม (ไม่กินพื้นที่คนที่ไม่ใช้)
  if (!goal && !editing) {
    return (
      <section className={`card px-4 py-3 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[9px] bg-primary-soft text-primary grid place-items-center shrink-0">
            <Target size={15} strokeWidth={2} />
          </div>
          <p className="text-[13px] font-semibold text-ink-2 leading-snug">{t.goal_empty_title}</p>
        </div>
        <button type="button" onClick={startEdit}
          className="h-9 px-3.5 rounded-[10px] bg-primary-soft text-primary text-[12px] font-bold cursor-pointer hover:bg-primary-mid transition-colors shrink-0">
          {t.goal_set}
        </button>
      </section>
    );
  }

  return (
    <section className={`card p-5 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-[10px] bg-primary-soft text-primary grid place-items-center shrink-0">
            <Target size={17} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-ink leading-tight">{t.goal_title}</h3>
            {goal > 0 && !editing && (
              <p className="text-[12px] text-muted leading-tight mt-0.5">{fill(t.goal_per_month, { amount: fmtB(goal), month })}</p>
            )}
          </div>
        </div>
        {goal > 0 && !editing && (
          <button type="button" onClick={startEdit}
            className="flex items-center gap-1.5 h-9 px-2.5 -mr-1 rounded-lg text-muted text-[12px] font-semibold hover:bg-primary-soft hover:text-primary cursor-pointer transition shrink-0">
            <Pencil size={13} /> {t.goal_edit}
          </button>
        )}
      </div>

      {showForm ? (
        <div className="mt-4">
          {!goal && (
            <p className="text-[13px] text-ink-2 leading-snug mb-3 max-w-[52ch]">
              <span className="font-semibold">{t.goal_empty_title}</span> {t.goal_empty_desc}
            </p>
          )}
          <form onSubmit={save} className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[170px]">
              <span className="block text-[11px] font-semibold text-muted mb-1">{fill(t.goal_input_label, { month })}</span>
              <input
                type="number" inputMode="numeric" min="0" step="100" value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="30000"
                className="w-full bg-surface border-[1.5px] border-line-strong rounded-[10px] text-[14px] font-medium px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus:border-primary"
              />
            </label>
            <button type="submit"
              className="h-10 px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold cursor-pointer hover:bg-primary-dark transition-colors">
              {t.goal_save}
            </button>
            {goal > 0 && (
              <>
                <button type="button" onClick={() => setEditing(false)}
                  className="h-10 px-3 rounded-[10px] text-muted text-[13px] font-semibold cursor-pointer hover:bg-surface-alt transition-colors">
                  {t.goal_cancel}
                </button>
                <button type="button" onClick={remove}
                  className="h-10 px-3 rounded-[10px] text-danger text-[13px] font-semibold cursor-pointer hover:bg-danger-soft transition-colors">
                  {t.goal_remove}
                </button>
              </>
            )}
          </form>
        </div>
      ) : (
        <GoalBody f={f} goal={goal} otRate={otRate} t={t} />
      )}
    </section>
  );
}

function GoalBody({ f, goal, otRate, t }) {
  const projected = f.projected ?? f.current;
  const scale = Math.max(goal, projected, f.current, 1);
  const w = (v) => `${Math.max(0, Math.min(100, (v / scale) * 100))}%`;
  const baseNow = Math.max(0, f.current - f.ot - f.shift);
  const forecastExtra = f.state === 'current' ? Math.max(0, projected - f.current) : 0;
  const pctText = `${Math.min(999, Math.round(f.progress * 100))}%`;
  const [barRef, seen] = useInView();
  const sw = (v) => (seen ? w(v) : '0%'); // แถบยืดออกเมื่อผู้ใช้เลื่อนมาเห็น

  // ข้อความสรุป (ลำดับสำคัญ: ถึงเป้าแล้ว → จบเดือนแล้ว → ยังไม่ถึง)
  let message = null;
  let good = false;
  if (f.state === 'future') {
    message = t.goal_future;
  } else if (f.reached) {
    message = fill(t.goal_reached, { amount: fmtB(f.current - goal) });
    good = true;
  } else if (f.state === 'past') {
    message = fill(t.goal_past_miss, { amount: fmtB(goal - f.current) });
  } else if (f.onTrack) {
    message = t.goal_on_track;
    good = true;
  } else if (f.otHoursNeeded > 0) {
    message = f.daysLeft > 0
      ? fill(t.goal_need_ot, { hours: fmt1(f.otHoursNeeded), perDay: fmt1(f.otPerDay) })
      : fill(t.goal_need_ot_last, { hours: fmt1(f.otHoursNeeded) });
  } else if (!(otRate > 0)) {
    message = t.goal_no_rate;
  }

  const legend = [
    { key: 'base', label: t.goal_base, value: baseNow, style: { backgroundImage: GRAD.base } },
    { key: 'ot', label: t.ot_earnings, value: f.ot, style: { backgroundImage: GRAD.ot } },
    { key: 'shift', label: t.shift_earnings, value: f.shift, style: { backgroundImage: GRAD.shift } },
    { key: 'fc', label: t.goal_forecast_more, value: forecastExtra, style: { backgroundImage: FORECAST_STRIPES, backgroundSize: '6px 6px', outline: '1px solid rgba(99,102,241,0.4)' } },
  ].filter((x) => x.value > 0);

  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[1.6rem] sm:text-[1.9rem] font-bold text-ink leading-none tracking-tight tabular-nums truncate">
            <CountUp value={f.current} format={fmtB} />
          </div>
          <div className="text-[12px] text-muted mt-1.5">{fill(t.goal_of, { amount: fmtB(goal) })}</div>
        </div>
        <div className={`text-[1.2rem] font-bold tabular-nums ${f.reached ? 'text-income' : 'text-ink-2'}`}>
          <CountUp value={Math.min(999, f.progress * 100)} format={(n) => `${Math.round(n)}%`} />
        </div>
      </div>

      {/* แถบเป้า: เหมือนหลอดน้ำที่เติมขึ้น — สีไล่ตามที่มาของรายได้ มีฟองลอยขึ้นในส่วนที่ได้แล้ว
          ลายทแยงที่เลื่อนช้า ๆ = ที่คาดว่าจะได้เพิ่ม ขีดดำ = เป้า */}
      <div
        ref={barRef}
        className="relative h-6 rounded-full bg-surface-alt mt-4 shadow-[inset_0_1px_2px_rgba(17,24,39,0.12)]"
        role="img"
        aria-label={`${t.goal_title}: ${pctText}`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="flex h-full">
            <div className="h-full shrink-0 transition-[width] duration-[900ms] ease-out" style={{ boxShadow: 'inset -1.5px 0 0 rgba(255,255,255,0.7)', width: sw(baseNow), backgroundImage: GRAD.base }} />
            <div className="h-full shrink-0 transition-[width] duration-[900ms] ease-out" style={{ boxShadow: 'inset -1.5px 0 0 rgba(255,255,255,0.7)', width: sw(f.ot), backgroundImage: GRAD.ot }} />
            <div className="h-full shrink-0 transition-[width] duration-[900ms] ease-out" style={{ boxShadow: 'inset -1.5px 0 0 rgba(255,255,255,0.7)', width: sw(f.shift), backgroundImage: GRAD.shift }} />
            <div
              className="h-full shrink-0 transition-[width] duration-[900ms] ease-out"
              style={{
                width: sw(forecastExtra), backgroundImage: FORECAST_STRIPES, backgroundSize: '10px 10px',
                animation: 'stripeMarch 1.2s linear infinite',
              }}
            />
          </div>
          {/* ประกายด้านบนให้แถบดูนูนเหมือนหลอดแก้ว */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" aria-hidden="true" />
          {/* ฟองลอยจากล่างขึ้นบน — ขอบกว้างเท่ากับส่วนที่เติมแล้ว */}
          <div className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-[900ms] ease-out pointer-events-none" style={{ width: sw(f.current) }}>
            <Bubbles count={Math.max(8, Math.round(f.progress * 30))} rise={36} size={[4, 8]} />
          </div>
        </div>
        {f.reached && (
          <span
            className="absolute top-1/2 w-3.5 h-3.5 -mt-[7px] rounded-full bg-income animate-ping pointer-events-none"
            style={{ left: `calc(${w(goal)} - 8px)` }}
          />
        )}
        <span
          className="absolute -top-1.5 -bottom-1.5 w-[3px] rounded-full bg-ink"
          style={{ left: `calc(${w(goal)} - 2px)` }}
          title={`${t.goal_marker} ${fmtB(goal)}`}
        />
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3.5 text-[11px] text-muted">
        {legend.map((x) => (
          <li key={x.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]" style={x.style} />
            {x.label} <span className="font-semibold text-ink-2 tabular-nums">{fmtB(x.value)}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="w-[3px] h-3 rounded-full bg-ink shrink-0" />
          {t.goal_marker}
        </li>
      </ul>

      {f.state === 'current' && (
        <dl className="mt-4 pt-4 border-t border-line flex flex-col gap-1.5 text-[13px]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">{t.goal_forecast}</dt>
            <dd className="font-bold text-ink tabular-nums">~<CountUp value={Math.round(projected)} format={fmtB} /></dd>
          </div>
          {f.gap > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">{t.goal_short}</dt>
              <dd className="font-bold text-danger tabular-nums">{fmtB(Math.round(f.gap))}</dd>
            </div>
          )}
        </dl>
      )}

      {message && (
        <p className={`mt-4 rounded-xl px-3.5 py-3 text-[13px] font-semibold leading-snug
          ${good ? 'bg-income-soft text-income-ink' : 'bg-surface-alt text-ink-2'}`}>
          {message}
        </p>
      )}

      {f.state === 'current' && (
        <p className="mt-3 text-[11px] text-muted leading-snug">
          {f.lowData ? `${t.goal_low_data} ` : ''}{t.goal_forecast_note}
        </p>
      )}
    </div>
  );
}
