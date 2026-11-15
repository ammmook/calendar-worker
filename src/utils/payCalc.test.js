import { describe, it, expect } from 'vitest';
import {
  parseHHMM, addDaysStr, deductOtHours, isWithinShift,
  baseHourlyRate, parseWorkSpan, calcWorkDay,
} from './payCalc';

// base 100 บาท/ชม. ให้ตัวเลขอ่านง่าย (1.5x = 150, 3x = 300)
const BASE = { stdH: 8, baseHourly: 100 };

describe('helpers', () => {
  it('parseHHMM', () => {
    expect(parseHHMM('09:30')).toBe(570);
    expect(parseHHMM('')).toBeNull();
    expect(parseHHMM('ab:cd')).toBeNull();
  });

  it('addDaysStr ข้ามเดือน/ปี/ปีอธิกสุรทิน', () => {
    expect(addDaysStr('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysStr('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysStr('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('deductOtHours: ≤2 ไม่หัก, >2 หัก 30น., ≥9 หัก 1ชม.', () => {
    expect(deductOtHours(0)).toBe(0);
    expect(deductOtHours(2)).toBe(2);
    expect(deductOtHours(3)).toBe(2.5);
    expect(deductOtHours(9)).toBe(8);
  });

  it('isWithinShift: ปกติ / ไม่มีเวลาจบ / กะข้ามคืน', () => {
    const s = parseHHMM('08:00'), e = parseHHMM('16:00');
    expect(isWithinShift(parseHHMM('07:59'), s, e)).toBe(false);
    expect(isWithinShift(parseHHMM('08:00'), s, e)).toBe(true);
    expect(isWithinShift(parseHHMM('16:01'), s, e)).toBe(false);
    expect(isWithinShift(parseHHMM('20:00'), s, null)).toBe(true);
    expect(isWithinShift(10, null, null)).toBe(false);
    const ns = parseHHMM('22:00'), ne = parseHHMM('06:00');
    expect(isWithinShift(parseHHMM('23:00'), ns, ne)).toBe(true);
    expect(isWithinShift(parseHHMM('03:00'), ns, ne)).toBe(true);
    expect(isWithinShift(parseHHMM('12:00'), ns, ne)).toBe(false);
  });

  it('baseHourlyRate: เงินเดือน ÷30÷8 / fallback OT rate', () => {
    expect(baseHourlyRate(30000, 0, 8)).toBe(125);
    expect(baseHourlyRate(0, 80, 8)).toBe(80);
  });

  it('parseWorkSpan ข้ามเที่ยงคืน', () => {
    expect(parseWorkSpan('09:00', '18:00')).toMatchObject({ totalMins: 540, crossedMidnight: false });
    expect(parseWorkSpan('22:00', '06:00')).toMatchObject({ totalMins: 480, crossedMidnight: true });
  });
});

describe('calcWorkDay — วันปกติ', () => {
  it('9:00–18:00 = 8 ชม.ปกติ ไม่มี OT (หักพัก 1 ชม.)', () => {
    const r = calcWorkDay({ clockIn: '09:00', clockOut: '18:00', ...BASE });
    expect(r.workingHour).toBe(8);
    expect(r.otHour).toBe(0);
    expect(r.totalEarning).toBe(0);
  });

  it('9:00–19:00 = OT 1 ชม. คิด 1.5x เต็ม', () => {
    const r = calcWorkDay({ clockIn: '09:00', clockOut: '19:00', ...BASE });
    expect(r.otHour).toBe(1);
    expect(r.ot15Hour).toBe(1);
    expect(r.ot15Earn).toBeCloseTo(150);
  });

  it('9:00–21:00 = OT ดิบ 3 ชม. หัก 30 นาที เหลือ 2.5', () => {
    const r = calcWorkDay({ clockIn: '09:00', clockOut: '21:00', ...BASE });
    expect(r.otHour).toBe(2.5);
    expect(r.otEarning).toBeCloseTo(375);
  });

  it('เวลาเข้า = ออก → ไม่คิดอะไร', () => {
    const r = calcWorkDay({ clockIn: '09:00', clockOut: '09:00', ...BASE });
    expect(r.workingHour).toBe(0);
    expect(r.otHour).toBe(0);
  });

  it('ทำสั้นกว่า 8 ชม. → ชั่วโมงทำงาน = netH', () => {
    const r = calcWorkDay({ clockIn: '09:00', clockOut: '14:00', ...BASE });
    expect(r.workingHour).toBe(4);
    expect(r.otHour).toBe(0);
  });
});

describe('calcWorkDay — นักขัตฤกษ์', () => {
  it('8 ชม.แรก = 1x ได้ทั้งค่าแรงปกติและ OT 1x', () => {
    const r = calcWorkDay({ clockIn: '09:00', clockOut: '18:00', isPublicHolidayToday: true, ...BASE });
    expect(r.workingHour).toBe(8);
    expect(r.ot1Hour).toBe(8);
    expect(r.ot1Earn).toBeCloseTo(800);
    expect(r.ot3Hour).toBe(0);
  });

  it('เลย 8 ชม. = 3x (หักเศษ) : 9:00–21:00 → 1x 8 ชม. + 3x 2.5 ชม.', () => {
    const r = calcWorkDay({ clockIn: '09:00', clockOut: '21:00', isPublicHolidayToday: true, ...BASE });
    expect(r.ot1Hour).toBe(8);
    expect(r.ot3Hour).toBe(2.5);
    expect(r.otHour).toBe(10.5);
    expect(r.otEarning).toBeCloseTo(800 + 750);
  });
});

describe('calcWorkDay — ข้ามเที่ยงคืน', () => {
  const span = { clockIn: '14:00', clockOut: '02:00', ...BASE };

  it('วันถัดไปเป็นวันปกติ → ×1.5 ทั้งหมด หักเศษครั้งเดียว (netH 11 → OT 3 → 2.5)', () => {
    const r = calcWorkDay(span);
    expect(r.ot15Hour).toBe(2.5);
    expect(r.ot3Hour).toBe(0);
    expect(r.otEarning).toBeCloseTo(375);
  });

  it('วันถัดไปเป็นนักขัตฤกษ์ → แยกช่วง: ก่อนเที่ยงคืน 1.5x 1 ชม. + หลัง 3x 2 ชม.', () => {
    const r = calcWorkDay({ ...span, nextIsPublic: true });
    expect(r.ot15Hour).toBe(1);
    expect(r.ot3Hour).toBe(2);
    expect(r.otEarning).toBeCloseTo(150 + 600);
  });

  it('วันถัดไปเป็นวันหยุด user ไม่มีกะ → ช่วงหลังเที่ยงคืน 3x', () => {
    const r = calcWorkDay({ ...span, nextIsUserHoliday: true });
    expect(r.ot3Hour).toBe(2);
    expect(r.otEarning).toBeCloseTo(750);
  });

  it('วันถัดไปเป็นวันหยุด user แต่มีกะ → 1.5x ทั้งหมด + ได้เบี้ยกะ', () => {
    const r = calcWorkDay({
      ...span, nextIsUserHoliday: true,
      shiftAllowance: 300, shiftStart: '14:00', shiftEnd: '',
    });
    expect(r.ot3Hour).toBe(0);
    expect(r.otEarning).toBeCloseTo(375);
    expect(r.shiftAllowance).toBe(300);
    expect(r.totalEarning).toBeCloseTo(675);
  });

  it('นักขัตฤกษ์ข้ามไปวันปกติ → ยังคิดเรตวันหยุดต่อจนเลิกงาน', () => {
    const r = calcWorkDay({ ...span, isPublicHolidayToday: true });
    expect(r.ot1Hour).toBe(8);
    expect(r.ot3Hour).toBe(2.5);
  });
});

describe('calcWorkDay — เบี้ยกะ', () => {
  it('เข้างานก่อนเวลาเริ่มกะ = ไม่ได้เบี้ยกะ', () => {
    const r = calcWorkDay({
      clockIn: '07:00', clockOut: '16:00', ...BASE,
      shiftAllowance: 300, shiftStart: '08:00', shiftEnd: '16:00',
    });
    expect(r.shiftAllowance).toBe(0);
  });

  it('เข้างานตรงเวลาเริ่มกะ = ได้เบี้ยกะ', () => {
    const r = calcWorkDay({
      clockIn: '08:00', clockOut: '17:00', ...BASE,
      shiftAllowance: 300, shiftStart: '08:00', shiftEnd: '16:00',
    });
    expect(r.shiftAllowance).toBe(300);
    expect(r.totalEarning).toBe(300);
  });

  it('ไม่ตั้งเบี้ยกะ (0) = ไม่ได้ แม้เข้าตรงเวลา', () => {
    const r = calcWorkDay({
      clockIn: '08:00', clockOut: '17:00', ...BASE,
      shiftAllowance: 0, shiftStart: '08:00',
    });
    expect(r.shiftAllowance).toBe(0);
  });
});
