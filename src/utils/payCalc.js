// ตรรกะคำนวณชั่วโมง/OT/เบี้ยกะรายวัน — pure function ใช้ร่วมกันทั้ง
//   • services/api.js  (upsertWorkEntry: คำนวณจริงก่อนบันทึกลง DB)
//   • App.jsx          (previewCalc: แสดงตัวอย่างก่อนกดบันทึก)
// แก้กฎการคิดเงินที่ไฟล์นี้ที่เดียว (ดู "กติกาการคิดเงิน" ใน CLAUDE.md)

/** แปลง "HH:mm" → จำนวนนาทีตั้งแต่เที่ยงคืน (คืน null ถ้าไม่ถูกต้อง) */
export function parseHHMM(str) {
  const p = String(str || '').split(':');
  if (p.length < 2) return null;
  const h = Number(p[0]);
  const m = Number(p[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/** บวก n วันจากสตริง "YYYY-MM-DD" → คืน "YYYY-MM-DD" */
export function addDaysStr(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const yy = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mo}-${dd}`;
}

/** หักเศษชั่วโมง OT ตามกฎ: ≤2 ไม่หัก ; >2 หัก 30น. ; ≥9 หัก 1ชม. */
export function deductOtHours(h) {
  if (h >= 9) return Math.max(0, h - 1);
  if (h > 2) return Math.max(0, h - 0.5);
  return Math.max(0, h);
}

/**
 * เข้างานถือว่า "เข้ากะ" หรือไม่ — เข้างาน >= เวลาเริ่มกะ และยังไม่เกินเวลาจบกะ
 * - ไม่มีเวลาจบกะ → แค่ >= เวลาเริ่มกะก็พอ
 * - กะข้ามคืน (จบ ≤ เริ่ม เช่น 22:00–06:00) → อยู่ในช่วง [เริ่ม, เที่ยงคืน] ∪ [เที่ยงคืน, จบ]
 */
export function isWithinShift(inMin, startMin, endMin) {
  if (startMin == null) return false;
  if (endMin == null) return inMin >= startMin;
  if (endMin > startMin) return inMin >= startMin && inMin <= endMin;
  return inMin >= startMin || inMin <= endMin; // กะข้ามคืน
}

/** base ต่อชั่วโมง = เงินเดือน ÷ 30 ÷ stdH ; ไม่มีเงินเดือน → fallback เป็น OT rate ที่เก็บไว้ */
export function baseHourlyRate(salary, otRate, stdH) {
  return Number(salary) > 0 ? Number(salary) / 30 / stdH : Number(otRate) || 0;
}

/**
 * แยกช่วงเวลาทำงานจาก "HH:mm" เข้า-ออก
 * คืน { inMin, outMin, totalMins, crossedMidnight } — totalMins รวมการข้ามเที่ยงคืนแล้ว
 */
export function parseWorkSpan(clockIn, clockOut) {
  const partsIn = String(clockIn).split(':');
  const partsOut = String(clockOut).split(':');
  const ih = Number(partsIn[0] || 0), im = Number(partsIn[1] || 0);
  const oh = Number(partsOut[0] || 0), om = Number(partsOut[1] || 0);
  const inMin = ih * 60 + im;
  const outMin = oh * 60 + om;
  let totalMins = outMin - inMin;
  const crossedMidnight = totalMins < 0; // ทำเกินวัน (ข้ามเที่ยงคืน)
  if (crossedMidnight) totalMins += 1440;
  return { inMin, outMin, totalMins, crossedMidnight };
}

const EMPTY = {
  workingHour: 0, otHour: 0, otEarning: 0,
  ot15Hour: 0, ot15Earn: 0, ot1Hour: 0, ot1Earn: 0, ot3Hour: 0, ot3Earn: 0,
  regularEarning: 0, shiftAllowance: 0, totalEarning: 0,
};

/**
 * คำนวณรายวันจากเวลาเข้า-ออก (วันทำงานปกติ/นักขัตฤกษ์/ข้ามเที่ยงคืน)
 * @param {object} p
 * @param {string} p.clockIn / p.clockOut      "HH:mm"
 * @param {boolean} p.isPublicHolidayToday     วันนี้เป็นนักขัตฤกษ์
 * @param {boolean} p.nextIsPublic             วันถัดไปเป็นนักขัตฤกษ์ (ใช้เมื่อข้ามเที่ยงคืน)
 * @param {boolean} p.nextIsUserHoliday        วันถัดไปเป็นวันหยุด user (ใช้เมื่อข้ามเที่ยงคืน และ nextIsPublic=false)
 * @param {number} p.stdH / p.baseHourly
 * @param {number} p.shiftAllowance / p.shiftStart / p.shiftEnd   (เวลาเป็น "HH:mm")
 */
export function calcWorkDay({
  clockIn, clockOut,
  isPublicHolidayToday = false, nextIsPublic = false, nextIsUserHoliday = false,
  stdH, baseHourly,
  shiftAllowance = 0, shiftStart = '', shiftEnd = '',
}) {
  const { inMin, outMin, totalMins, crossedMidnight } = parseWorkSpan(clockIn, clockOut);
  if (totalMins <= 0) return { ...EMPTY };

  const totalH = totalMins / 60;
  // หักเวลาพัก 1 ชม. ออกจากช่วงเวลาทำงานก่อนคิด normal/OT
  // เช่น std 8 → 9:00–18:00 (9 ชม.) = ปกติเต็ม ; 9:00–19:00 (10 ชม.) = OT 1 ชม.
  const netH = Math.max(0, totalH - 1);

  // มีกะ = เข้างาน >= เวลาเริ่มกะ และยังไม่เกินเวลาจบกะ
  const hasShift = Number(shiftAllowance) > 0
    && isWithinShift(inMin, parseHHMM(shiftStart), parseHHMM(shiftEnd));

  let workingHour = Math.min(netH, stdH);
  let otHour = 0, otEarning = 0;
  let ot15Hour = 0, ot15Earn = 0, ot1Hour = 0, ot1Earn = 0, ot3Hour = 0, ot3Earn = 0;

  if (isPublicHolidayToday) {
    // วันหยุดทางการ: ยังได้ค่าแรงปกติ + บวก OT (เริ่มคิดทันที) — 8 ชม.แรก 1x (ไม่หัก), เลย 8 ชม. 3x (หักเศษ)
    // ข้ามเที่ยงคืนไปตกวันปกติ → ยังคิดเรตวันหยุดต่อจนเลิกงาน (ไม่ตัดที่เที่ยงคืน)
    const ot1x = Math.min(netH, stdH);
    const rawOT = Math.max(0, netH - stdH);
    const ot3x = deductOtHours(rawOT);
    otHour = ot1x + ot3x;
    ot1Hour = ot1x; ot1Earn = ot1x * 1 * baseHourly;   // _1 = วันหยุด 8 ชม.แรก (เรต 1x)
    ot3Hour = ot3x; ot3Earn = ot3x * 3 * baseHourly;
    otEarning = ot1Earn + ot3Earn;
  } else {
    // วันปกติ — อัตราช่วงหลังเที่ยงคืนเมื่อทำข้ามคืน:
    //   วันถัดไปนักขัตฤกษ์ → ×3 ; วันหยุด(user) → ×3 ถ้าไม่มีกะ / ×1.5 ถ้ามีกะ ; วันปกติ → ×1.5
    let afterRate = 1.5;
    if (crossedMidnight) {
      if (nextIsPublic) afterRate = 3;
      else if (nextIsUserHoliday) afterRate = hasShift ? 1.5 : 3;
    }

    if (crossedMidnight && afterRate === 3) {
      // แยกช่วงก่อน/หลังเที่ยงคืน — แต่ละช่วงหักเศษของตัวเอง
      const beforeClock = 1440 - inMin;                 // นาที(clock)ก่อนเที่ยงคืน
      const beforeNet = Math.max(0, beforeClock - 60);  // หักพักเที่ยงจากช่วงก่อนเที่ยงคืน
      let afterNet = outMin;                            // นาที(clock)หลังเที่ยงคืน
      const lunchLeft = 60 - Math.min(60, beforeClock);
      if (lunchLeft > 0) afterNet = Math.max(0, afterNet - lunchLeft);
      // ชั่วโมงทำงานปกติ (std) มาก่อน แล้วที่เหลือเป็น OT
      let regLeft = stdH * 60;
      const regBefore = Math.min(regLeft, beforeNet);
      const otBeforeMin = beforeNet - regBefore;
      regLeft -= regBefore;
      const regAfter = Math.min(regLeft, afterNet);
      const otAfterMin = afterNet - regAfter;
      const otBeforeH = deductOtHours(otBeforeMin / 60);
      const otAfterH = deductOtHours(otAfterMin / 60);
      otHour = otBeforeH + otAfterH;
      ot15Hour = otBeforeH; ot15Earn = otBeforeH * 1.5 * baseHourly; // ก่อนเที่ยงคืน ×1.5
      ot3Hour = otAfterH; ot3Earn = otAfterH * 3 * baseHourly;       // หลังเที่ยงคืน ×3
      otEarning = ot15Earn + ot3Earn;
    } else {
      // OT ทั้งหมด ×1.5 (หักเศษครั้งเดียว)
      const netNormalOT = deductOtHours(Math.max(0, netH - stdH));
      otHour = netNormalOT;
      ot15Hour = netNormalOT; ot15Earn = netNormalOT * 1.5 * baseHourly;
      otEarning = ot15Earn;
    }
  }

  const shiftEarning = hasShift ? Number(shiftAllowance) : 0;
  const regularEarning = 0; // รายเดือน: ไม่คิดเงินรายวัน

  return {
    workingHour, otHour, otEarning,
    ot15Hour, ot15Earn, ot1Hour, ot1Earn, ot3Hour, ot3Earn,
    regularEarning, shiftAllowance: shiftEarning,
    totalEarning: regularEarning + otEarning + shiftEarning,
  };
}
