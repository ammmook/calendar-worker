// ตรรกะ "เป้าหมาย + พยากรณ์" และ "เทียบเดือนก่อน + insight" — ฟังก์ชันล้วน (ไม่แตะ DB/DOM)
// ใช้แสดงผลเท่านั้น ไม่ยุ่งกับสูตรคิดเงินใน payCalc.js

export const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();

const monthIndex = (y, m0) => y * 12 + m0;

/**
 * พยากรณ์รายได้สุทธิสิ้นเดือน เทียบกับเป้า
 * - เงินเดือนเป็นก้อนคงที่ → ส่วนที่ขยับจริงคือ OT + เบี้ยกะ จึงคาดการณ์เฉพาะส่วนนี้
 *   (รายได้เสริมสะสม ÷ วันที่ผ่านไปแล้ว × จำนวนวันในเดือน)
 * - state: 'past' (จบแล้ว) | 'current' | 'future'
 * @param otRate อัตรา OT วันปกติ/ชม. (×1.5 แล้ว)
 */
export function forecastMonth({ viewY, viewM, today, summary, salary = 0, socialSecurity = 0, otRate = 0, goal = 0 }) {
  const dim = daysInMonth(viewY, viewM);
  const diff = monthIndex(viewY, viewM) - monthIndex(today.getFullYear(), today.getMonth());
  const state = diff < 0 ? 'past' : diff === 0 ? 'current' : 'future';

  const ot = Number(summary?.total_ot_earning) || 0;
  const shift = Number(summary?.total_shift_allowance) || 0;
  const current = Number(summary?.total_earning) || 0;
  const hasEntries = current > 0 || (Number(summary?.days_worked) || 0) > 0;
  const variable = ot + shift;
  // ฐานสุทธิ = เงินเดือนหลังหักประกันสังคม (เดือนที่มีข้อมูลใช้ยอดจริง/snapshot จากสรุป)
  const base = hasEntries ? Math.max(0, current - variable) : Math.max(0, Number(salary) - Number(socialSecurity));

  const elapsed = state === 'current' ? Math.max(1, today.getDate()) : dim;
  const daysLeft = state === 'current' ? dim - today.getDate() : 0;

  let projected = null;
  if (state === 'past') projected = current;
  else if (state === 'current') projected = base + (variable / elapsed) * dim;

  const hasGoal = Number(goal) > 0;
  const gap = hasGoal && projected !== null ? Math.max(0, goal - projected) : 0;
  const otHoursNeeded = state === 'current' && gap > 0 && otRate > 0 ? gap / otRate : 0;
  const otPerDay = otHoursNeeded > 0 && daysLeft > 0 ? otHoursNeeded / daysLeft : 0;

  return {
    state, dim, daysLeft, current, base, ot, shift, variable,
    projected, gap, otHoursNeeded, otPerDay,
    reached: hasGoal && current >= goal,
    onTrack: hasGoal && projected !== null && projected >= goal,
    lowData: state === 'current' && elapsed < 5,
    progress: hasGoal ? current / goal : 0,
  };
}

/** รวมข้อมูลรายวันของเดือนหนึ่ง (ถึงวันที่ upToDay) จาก daily ของ earningsSummary */
export function aggregateDaily(daily, y, m0, upToDay = 31) {
  const prefix = `${y}-${String(m0 + 1).padStart(2, '0')}-`;
  const agg = {
    days: 0, workHours: 0, otHours: 0, otEarn: 0, shiftEarn: 0, extra: 0,
    best: null,                       // { key, amount } วันที่ได้รายได้เสริมสูงสุด
    otByWeekday: [0, 0, 0, 0, 0, 0, 0], // ชม. OT รวมแยกวันในสัปดาห์
  };
  for (const [key, d] of Object.entries(daily || {})) {
    if (!key.startsWith(prefix)) continue;
    const day = Number(key.slice(8, 10));
    if (day > upToDay) continue;
    const wh = Number(d.working_hour) || 0;
    const oh = Number(d.ot_hour) || 0;
    const oe = Number(d.ot_earning) || 0;
    const se = Number(d.shift_allowance) || 0;
    if (wh > 0) agg.days += 1;
    agg.workHours += wh;
    agg.otHours += oh;
    agg.otEarn += oe;
    agg.shiftEarn += se;
    const extra = oe + se;
    if (extra > 0 && (!agg.best || extra > agg.best.amount)) agg.best = { key, amount: extra };
    if (oh > 0) agg.otByWeekday[new Date(`${key}T00:00:00`).getDay()] += oh;
  }
  agg.extra = agg.otEarn + agg.shiftEarn;
  return agg;
}

const pctChange = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

/**
 * เทียบเดือนที่ดูอยู่กับเดือนก่อน
 * - เดือนที่ยังไม่จบ: เทียบ "วันที่ 1–N" ของทั้งสองเดือน (ไม่งั้นเทียบกับเดือนเต็มแล้วดูน้อยเกินจริง)
 * - เดือนมกราคม: ข้อมูลปีก่อนไม่ได้โหลด → available=false, reason='cross_year'
 */
export function compareMonths({ daily, viewY, viewM, today }) {
  const diff = monthIndex(viewY, viewM) - monthIndex(today.getFullYear(), today.getMonth());
  const partial = diff === 0;
  const upTo = partial ? today.getDate() : 31;

  const cur = aggregateDaily(daily, viewY, viewM, upTo);
  if (viewM === 0) return { available: false, reason: 'cross_year', cur, prev: null, partial, upTo };

  const prev = aggregateDaily(daily, viewY, viewM - 1, upTo);
  if (prev.days === 0 && prev.otHours === 0 && prev.extra === 0) {
    return { available: false, reason: 'no_prev', cur, prev, partial, upTo };
  }

  const metric = (key, c, p) => ({ key, cur: c, prev: p, pct: pctChange(c, p), delta: c - p });
  return {
    available: true, partial, upTo, cur, prev,
    metrics: [
      metric('extra', cur.extra, prev.extra),
      metric('otHours', cur.otHours, prev.otHours),
      metric('workHours', cur.workHours, prev.workHours),
      metric('days', cur.days, prev.days),
    ],
  };
}

/**
 * ข้อสังเกตอัตโนมัติ — คืนเป็นข้อมูล (id + ตัวแปร) ให้ UI เลือกประโยคตามภาษา
 * ลำดับ: OT เทียบเดือนก่อน → วันที่ได้รายได้เสริมสูงสุด → วันในสัปดาห์ที่ OT เยอะสุด
 */
export function buildInsights(cmp) {
  const { cur, prev } = cmp;
  const out = [];

  if (cmp.available && prev) {
    if (prev.otHours > 0 && cur.otHours > 0) {
      const pct = Math.round(Math.abs(pctChange(cur.otHours, prev.otHours)));
      if (pct === 0) out.push({ id: 'ot_same' });
      else out.push({ id: cur.otHours > prev.otHours ? 'ot_up' : 'ot_down', pct });
    } else if (prev.otHours === 0 && cur.otHours > 0) {
      out.push({ id: 'ot_new', hours: cur.otHours });
    } else if (prev.otHours > 0 && cur.otHours === 0) {
      out.push({ id: 'ot_gone', hours: prev.otHours });
    }
  }

  if (cur.best) out.push({ id: 'best_day', key: cur.best.key, amount: cur.best.amount });

  const top = Math.max(...cur.otByWeekday);
  if (top > 0) out.push({ id: 'ot_weekday', weekday: cur.otByWeekday.indexOf(top), hours: top });

  return out;
}
