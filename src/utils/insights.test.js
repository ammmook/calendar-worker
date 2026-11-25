import { describe, it, expect } from 'vitest';
import { forecastMonth, aggregateDaily, compareMonths, buildInsights } from './insights';

const TODAY = new Date(2026, 10, 10); // 10 พ.ย. 2026 (เดือนมี 30 วัน)

const summary = {
  days_worked: 8, total_ot_earning: 1000, total_shift_allowance: 500,
  total_earning: 20000 + 1500, // ฐานสุทธิ 20,000 + รายได้เสริม 1,500
};

describe('forecastMonth', () => {
  it('เดือนปัจจุบัน: คาดการณ์เฉพาะส่วน OT+กะ ตามค่าเฉลี่ยต่อวัน', () => {
    const f = forecastMonth({ viewY: 2026, viewM: 10, today: TODAY, summary, otRate: 150, goal: 25000 });
    expect(f.state).toBe('current');
    expect(f.base).toBe(20000);
    // 1,500 ÷ 10 วัน × 30 วัน = 4,500 → 24,500
    expect(f.projected).toBeCloseTo(24500);
    expect(f.gap).toBeCloseTo(500);
    expect(f.otHoursNeeded).toBeCloseTo(500 / 150);
    expect(f.daysLeft).toBe(20);
    expect(f.onTrack).toBe(false);
  });

  it('คาดการณ์ถึงเป้า → ไม่ขาด ไม่ต้อง OT เพิ่ม', () => {
    const f = forecastMonth({ viewY: 2026, viewM: 10, today: TODAY, summary, otRate: 150, goal: 24000 });
    expect(f.onTrack).toBe(true);
    expect(f.gap).toBe(0);
    expect(f.otHoursNeeded).toBe(0);
  });

  it('ไม่มี rate → ไม่คำนวณชั่วโมง OT', () => {
    const f = forecastMonth({ viewY: 2026, viewM: 10, today: TODAY, summary, otRate: 0, goal: 30000 });
    expect(f.gap).toBeGreaterThan(0);
    expect(f.otHoursNeeded).toBe(0);
  });

  it('เดือนที่ยังไม่มี entry: ฐาน = เงินเดือน − ประกันสังคม', () => {
    const f = forecastMonth({ viewY: 2026, viewM: 10, today: TODAY, summary: undefined, salary: 22000, socialSecurity: 750, goal: 25000 });
    expect(f.base).toBe(21250);
    expect(f.projected).toBe(21250);
  });

  it('เดือนที่จบแล้ว: ใช้ยอดจริง ไม่พยากรณ์ชั่วโมง', () => {
    const f = forecastMonth({ viewY: 2026, viewM: 9, today: TODAY, summary, otRate: 150, goal: 30000 });
    expect(f.state).toBe('past');
    expect(f.projected).toBe(21500);
    expect(f.gap).toBe(8500);
    expect(f.otHoursNeeded).toBe(0);
  });

  it('เดือนอนาคต: ไม่มีค่าพยากรณ์', () => {
    const f = forecastMonth({ viewY: 2026, viewM: 11, today: TODAY, summary: undefined, goal: 25000 });
    expect(f.state).toBe('future');
    expect(f.projected).toBeNull();
  });

  it('ต้นเดือน (<5 วัน) ติดธง lowData', () => {
    const f = forecastMonth({ viewY: 2026, viewM: 10, today: new Date(2026, 10, 3), summary, goal: 25000 });
    expect(f.lowData).toBe(true);
  });
});

const daily = {
  '2026-10-02': { working_hour: 8, ot_hour: 2, ot_earning: 300, shift_allowance: 0 },
  '2026-10-20': { working_hour: 8, ot_hour: 4, ot_earning: 600, shift_allowance: 100 },
  '2026-11-03': { working_hour: 8, ot_hour: 3, ot_earning: 450, shift_allowance: 0 },
  '2026-11-09': { working_hour: 8, ot_hour: 0, ot_earning: 0, shift_allowance: 200 },
  '2026-11-25': { working_hour: 8, ot_hour: 5, ot_earning: 750, shift_allowance: 0 },
};

describe('aggregateDaily', () => {
  it('รวมเฉพาะเดือนที่ขอ และตัดตามวันที่ upToDay', () => {
    const a = aggregateDaily(daily, 2026, 10, 10);
    expect(a.days).toBe(2);
    expect(a.otHours).toBe(3);
    expect(a.extra).toBe(650);
    expect(a.best).toEqual({ key: '2026-11-03', amount: 450 });
  });
});

describe('compareMonths', () => {
  it('เดือนปัจจุบันเทียบช่วงวันที่ 1–N ของทั้งสองเดือน', () => {
    const c = compareMonths({ daily, viewY: 2026, viewM: 10, today: TODAY });
    expect(c.available).toBe(true);
    expect(c.partial).toBe(true);
    expect(c.prev.otHours).toBe(2); // ต.ค. ถึงวันที่ 10 มีแค่วันที่ 2
    expect(c.metrics.find((m) => m.key === 'otHours').pct).toBeCloseTo(50);
  });

  it('มกราคม → เทียบข้ามปีไม่ได้', () => {
    const c = compareMonths({ daily, viewY: 2026, viewM: 0, today: TODAY });
    expect(c.available).toBe(false);
    expect(c.reason).toBe('cross_year');
  });

  it('เดือนก่อนไม่มีข้อมูล', () => {
    const c = compareMonths({ daily, viewY: 2026, viewM: 5, today: TODAY });
    expect(c.available).toBe(false);
    expect(c.reason).toBe('no_prev');
  });
});

describe('buildInsights', () => {
  it('OT มากขึ้นกี่ % + วันที่ดีที่สุด + วันที่ OT เยอะสุด', () => {
    const ins = buildInsights(compareMonths({ daily, viewY: 2026, viewM: 10, today: TODAY }));
    expect(ins.map((i) => i.id)).toEqual(['ot_up', 'best_day', 'ot_weekday']);
    expect(ins[0].pct).toBe(50);
  });

  it('เดือนก่อนไม่มี OT เลย → ot_new', () => {
    const d = { '2026-10-02': { working_hour: 8 }, '2026-11-03': { working_hour: 8, ot_hour: 2, ot_earning: 300 } };
    const ins = buildInsights(compareMonths({ daily: d, viewY: 2026, viewM: 10, today: TODAY }));
    expect(ins[0]).toMatchObject({ id: 'ot_new', hours: 2 });
  });
});
