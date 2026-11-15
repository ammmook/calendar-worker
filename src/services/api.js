/* ═══════════════════════════════════════════════════════════════════════════════
   TimeFlow — API Service Layer (Supabase)
   ═══════════════════════════════════════════════════════════════════════════════
   เชื่อมต่อ Frontend กับ Supabase โดยตรง
   ─ Table "user"            : ข้อมูลผู้ใช้ (เงินเดือนเก็บในคอลัมน์ salary + เบี้ยกะ)
   ─ Table "work_entry"      : บันทึกการทำงาน (เก็บ OT แยกอัตรา 1.5/2/3)
   ─ Table "monthly_summary" : สรุปรายเดือน
   ─ Table "yearly_summary"  : สรุปรายปี
   ─ Table "holidays"        : วันหยุด

   ⚠️ ชื่อตารางและชื่อแอทริบิวยังคงเหมือนเดิมทุกอย่าง (เดิมเป็น Google Sheets)
   Business logic (คำนวณเงิน / สรุปรายเดือน-รายปี) ย้ายมาทำฝั่ง client
   ═══════════════════════════════════════════════════════════════════════════════ */

import { supabase } from './supabaseClient';
import { calcWorkDay, parseWorkSpan, addDaysStr } from '../utils/payCalc';
import { isValidTimeValue } from '../components/timeUtils';

// ── HELPERS ─────────────────────────────────────────────────────────────────

/** แยก "YYYY-MM-DD" → { year, month(1-12) } ด้วยการ split สตริง (ไม่ผ่าน Date → ไม่โดน timezone เลื่อนวัน) */
function parseYMD(dateStr) {
  const [y, m] = String(dateStr).split('-').map(Number);
  return { year: y, month: m };
}

/** สร้าง unique ID ด้วย timestamp + random (คงรูปแบบเดิมจากฝั่ง Apps Script) */
function generateId(prefix) {
  const ts = new Date().getTime();
  const rand = Math.floor(Math.random() * 10000);
  return (prefix || 'id') + '_' + ts + '_' + rand;
}

/** log แบบเดียวกับของเดิม */
function logCall(action, data) {
  if (import.meta.env.DEV) console.log(`[TimeFlow API] → ${action}`, data || '');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SALARY (เก็บตรงในตาราง user คอลัมน์ `salary` — รายเดือนอย่างเดียว)
// ═══════════════════════════════════════════════════════════════════════════════

/** เติมฟิลด์ที่ frontend ใช้ (salary_monthly) จากคอลัมน์ user.salary */
function expandUserWithSalary(user) {
  if (!user) return user;
  user.salary_monthly = Number(user.salary) || 0;
  return user;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER API
// ═══════════════════════════════════════════════════════════════════════════════

async function getUser(email) {
  if (!email) return { success: false, error: 'email is required' };
  const { data: user, error } = await supabase
    .from('user')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!user) return { success: false, error: 'User not found' };
  await expandUserWithSalary(user);
  return { success: true, data: user };
}


async function createUser(data) {
  if (!data || !data.email) {
    return { success: false, error: 'email is required' };
  }

  // ตรวจสอบ duplicate
  const { data: existing, error: exErr } = await supabase
    .from('user')
    .select('email')
    .eq('email', data.email)
    .maybeSingle();
  if (exErr) return { success: false, error: exErr.message };
  if (existing) return { success: false, error: 'User with this email already exists' };

  const salaryVal = data.salary_monthly !== undefined && data.salary_monthly !== null
    ? Number(data.salary_monthly)
    : (data.salary !== undefined && data.salary !== null ? Number(data.salary) : 0);

  const row = {
    email: data.email,
    salary: salaryVal,   // เงินเดือน (รายเดือน) เก็บตรงในตาราง user
    ot_hourly: data.ot_hourly !== undefined && data.ot_hourly !== null ? data.ot_hourly : 0,
    sick_leave_day: data.sick_leave_day !== undefined && data.sick_leave_day !== null ? data.sick_leave_day : 30,
    personal_leave_day: data.personal_leave_day !== undefined && data.personal_leave_day !== null ? data.personal_leave_day : 6,
    annual_leave_day: data.annual_leave_day !== undefined && data.annual_leave_day !== null ? data.annual_leave_day : 10,
    social_security: data.social_security !== undefined && data.social_security !== null ? data.social_security : 0,
    // เบี้ยกะ (ย้ายจาก ot_setting เดิมมาเก็บใน user)
    shift_allowance: data.shift_allowance !== undefined && data.shift_allowance !== null ? data.shift_allowance : 0,
    shift_start: data.shift_start !== undefined && data.shift_start !== null ? data.shift_start : '',
    shift_end: data.shift_end !== undefined && data.shift_end !== null ? data.shift_end : '',
  };

  const { error } = await supabase.from('user').insert(row);
  if (error) return { success: false, error: error.message };

  const out = Object.assign({}, data, { salary: salaryVal });
  expandUserWithSalary(out);
  return { success: true, data: out, message: 'User created' };
}

async function updateUser(data) {
  if (!data || !data.email) {
    return { success: false, error: 'email is required' };
  }

  const { data: current, error: curErr } = await supabase
    .from('user')
    .select('email')
    .eq('email', data.email)
    .maybeSingle();
  if (curErr) return { success: false, error: curErr.message };
  if (!current) return { success: false, error: 'User not found' };

  // ── patch user (เงินเดือนเก็บในคอลัมน์ salary ; payment_type/daily_rate ไม่มีคอลัมน์แล้ว) ──
  const SKIP_FIELDS = ['salary_monthly', 'salary', 'payment_type', 'daily_rate']; // ฟิลด์เก่า ไม่มีคอลัมน์แล้ว กันไว้เผื่อ client เก่าส่งมา
  const upd = {};
  Object.keys(data).forEach((h) => {
    if (h === 'email') return;
    if (SKIP_FIELDS.indexOf(h) !== -1) return;
    if (data[h] !== undefined && data[h] !== null) upd[h] = data[h];
  });
  // เงินเดือน → คอลัมน์ salary
  if (data.salary_monthly !== undefined && data.salary_monthly !== null) upd.salary = Number(data.salary_monthly);
  else if (data.salary !== undefined && data.salary !== null) upd.salary = Number(data.salary);

  if (Object.keys(upd).length > 0) {
    const { error } = await supabase.from('user').update(upd).eq('email', data.email);
    if (error) return { success: false, error: error.message };
  }

  return { success: true, message: 'User updated' };
}



// ═══════════════════════════════════════════════════════════════════════════════
//  WORK ENTRY API
// ═══════════════════════════════════════════════════════════════════════════════





/** เลือกเฉพาะคอลัมน์ของตาราง work_entry (คงชื่อแอทริบิวเดิม) */
function pickWorkEntryColumns(data) {
  const COLS = [
    'work_entry_id', 'date', 'month_num', 'year_num',
    'clock_in', 'clock_out', 'leave_type', 'working_hour',
    'ot_hour', 'ot_earning', 'user_email',
    'ot_hour_15', 'ot_earning_15', 'ot_hour_1', 'ot_earning_1', 'ot_hour_3', 'ot_earning_3',
    'regular_earning', 'shift_allowance', 'total_earning', 'note',
  ];
  const row = {};
  COLS.forEach((c) => {
    if (data[c] !== undefined && data[c] !== null) row[c] = data[c];
  });
  return row;
}

async function deleteWorkEntry(workEntryId) {
  if (!workEntryId) return { success: false, error: 'work_entry_id is required' };

  // หา entry ก่อนลบ เพื่อเอา user_email, month_num, year_num สำหรับ recalc
  const { data: existing, error: findErr } = await supabase
    .from('work_entry')
    .select('user_email, month_num, year_num')
    .eq('work_entry_id', workEntryId)
    .maybeSingle();
  if (findErr) return { success: false, error: findErr.message };
  if (!existing) return { success: false, error: 'Work entry not found' };

  const userEmail = existing.user_email;
  const monthNum = Number(existing.month_num);
  const yearNum = Number(existing.year_num);

  const { error } = await supabase.from('work_entry').delete().eq('work_entry_id', workEntryId);
  if (error) return { success: false, error: error.message };

  // คำนวณสรุปรายเดือนและรายปีใหม่หลังลบ
  if (userEmail && monthNum && yearNum) {
    await recalcMonthlySummary(userEmail, monthNum, yearNum);
    await recalcYearlySummary(userEmail, yearNum);
  }

  return { success: true, message: 'Work entry deleted' };
}

/**
 * Upsert Work Entry — ถ้ามี entry สำหรับ user+date อยู่แล้ว จะ update ถ้าไม่มี จะ create
 * คำนวณเงินจาก DB แล้วบันทึกลง work_entry + อัปเดตสรุปรายเดือน/รายปี
 */
async function upsertWorkEntry(data) {
  if (!data || !data.user_email || !data.date) {
    return { success: false, error: 'user_email and date are required' };
  }

  // ตรวจรูปแบบข้อมูลที่ชั้น API (ไม่พึ่ง UI อย่างเดียว) — กัน NaN ลง DB
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) {
    return { success: false, error: 'date must be YYYY-MM-DD' };
  }
  if (data.clock_in && !isValidTimeValue(data.clock_in)) {
    return { success: false, error: 'clock_in must be HH:mm' };
  }
  if (data.clock_out && !isValidTimeValue(data.clock_out)) {
    return { success: false, error: 'clock_out must be HH:mm' };
  }

  const { month: monthNum, year: yearNum } = parseYMD(data.date);

  // 1. คำนวณเงินโดยดึงข้อมูลจาก DB เท่านั้น — query ที่ไม่ขึ้นต่อกันยิงพร้อมกัน (ลด round-trip)
  const needsHolidayInfo = data.clock_in && data.clock_out && String(data.leave_type || '') !== 'training';
  const nextDateStr = addDaysStr(data.date, 1);
  const [
    { data: user, error: userErr },
    { data: phRows },
    { data: uhRows },
  ] = await Promise.all([
    supabase.from('user').select('*').eq('email', data.user_email).maybeSingle(),
    needsHolidayInfo
      ? supabase.from('public_holidays').select('date').in('date', [data.date, nextDateStr])
      : Promise.resolve({ data: [] }),
    needsHolidayInfo
      ? supabase.from('holidays').select('date').eq('email', data.user_email).eq('date', nextDateStr)
      : Promise.resolve({ data: [] }),
  ]);
  if (userErr) return { success: false, error: userErr.message };
  // ไม่มี user → ห้ามบันทึก (ไม่งั้นได้ entry ที่เงิน 0 และไม่มี summary)
  if (!user) return { success: false, error: 'User not found' };

  {
    expandUserWithSalary(user);

    // ── การตั้งค่าเบี้ยกะ (เก็บในตาราง user) ──
    const shiftAllowance = Number(user.shift_allowance) || 0;
    const shiftStart = user.shift_start || '';
    const shiftEnd = user.shift_end || '';

    const otRate = Number(user.ot_hourly) || 0;
    const stdH = 8; // ชั่วโมงมาตรฐานคงที่ (ไม่มีคอลัมน์ working_hour แล้ว)
    // base ต่อชั่วโมง = เงินเดือน ÷ 30 วัน ÷ 8 (เช่น 22,000 ÷ 30 ÷ 8 = 91.67)
    // แล้วคูณ 1.5 (วันธรรมดา) / 2 (นักขัตฤกษ์ ≤ std) / 3 (นักขัตฤกษ์ > std)
    // ถ้าไม่มีเงินเดือน fallback ไปใช้ค่า OT Rate ที่กรอกเอง
    const salaryMonthly = Number(user.salary_monthly) || 0;
    const baseHourly = salaryMonthly > 0 ? salaryMonthly / 30 / stdH : otRate;

    let workingHour = 0;
    let otHour = 0;
    let shiftEarning = 0;
    let otEarningOverride = null; // ถ้าตั้งค่า จะใช้แทน otHour * otRate (กรณี OT 2x/3x)
    // OT แยกตามอัตรา: 1.5 = วันปกติ, 1 = วันหยุด 8 ชม.แรก, 3 = วันหยุดเลย 8 ชม. / ข้ามคืน
    let ot15Hour = 0, ot15Earn = 0, ot1Hour = 0, ot1Earn = 0, ot3Hour = 0, ot3Earn = 0;

    const isTraining = String(data.leave_type || '') === 'training';

    if (isTraining) {
      // อบรม (นอกสถานที่/ดูงาน): ได้เงินปกติเต็มวัน — ไม่มี OT, ไม่มีเบี้ยกะ, ไม่เสียวันลา
      workingHour = stdH;
    } else if (data.clock_in && data.clock_out) {
      const span = parseWorkSpan(data.clock_in, data.clock_out);

      if (span.totalMins > 0) {
        // ── ตรวจว่าวันนี้เป็นวันหยุดทางการ (public holiday) หรือไม่ ──
        const phSet = new Set((phRows || []).map((r) => normalizeHolidayDate(r.date)));
        const isPublicHolidayToday = phSet.has(data.date);

        // ── ถ้าทำข้ามคืน (ทำเกินวัน) → ตรวจว่า "วันถัดไป" เป็นนักขัตฤกษ์/วันหยุดหรือไม่ ──
        let nextIsPublic = false, nextIsUserHoliday = false;
        if (span.crossedMidnight) {
          nextIsPublic = phSet.has(nextDateStr);
          if (!nextIsPublic) {
            nextIsUserHoliday = (uhRows || []).some((r) => normalizeHolidayDate(r.date) === nextDateStr);
          }
        }

        // กติกาคิดเงินอยู่ใน utils/payCalc.js (ใช้ร่วมกับ preview ฝั่งหน้าจอ)
        const r = calcWorkDay({
          clockIn: data.clock_in, clockOut: data.clock_out,
          isPublicHolidayToday, nextIsPublic, nextIsUserHoliday,
          stdH, baseHourly,
          shiftAllowance, shiftStart, shiftEnd,
        });
        workingHour = r.workingHour;
        otHour = r.otHour;
        shiftEarning = r.shiftAllowance;
        otEarningOverride = r.otEarning;
        ot15Hour = r.ot15Hour; ot15Earn = r.ot15Earn;
        ot1Hour = r.ot1Hour; ot1Earn = r.ot1Earn;
        ot3Hour = r.ot3Hour; ot3Earn = r.ot3Earn;
      }
    }

    data.working_hour = workingHour;
    data.ot_hour = otHour;

    const regularEarning = 0; // รายเดือน: ไม่คิดเงินรายวัน (เงินเดือนบวกที่ monthly_summary)

    const otEarning = otEarningOverride != null ? otEarningOverride : otHour * baseHourly * 1.5;
    const totalEarning = regularEarning + otEarning + shiftEarning;

    data.ot_earning = otEarning;
    data.ot_hour_15 = ot15Hour;
    data.ot_earning_15 = ot15Earn;
    data.ot_hour_1 = ot1Hour;
    data.ot_earning_1 = ot1Earn;
    data.ot_hour_3 = ot3Hour;
    data.ot_earning_3 = ot3Earn;
    data.regular_earning = regularEarning;
    data.shift_allowance = shiftEarning;
    data.total_earning = totalEarning;
  }

  // 2. upsert ด้วย unique (user_email, date) — atomic ไม่เกิด entry ซ้ำเมื่อกดเซฟรัว/สองแท็บ
  //    ต้องรัน google-apps-script/work_entry_unique_migration.sql ก่อน
  data.month_num = monthNum;
  data.year_num = yearNum;
  if (!data.work_entry_id) data.work_entry_id = generateId('WE');
  const row = pickWorkEntryColumns(data);
  const { data: saved, error: upErr } = await supabase
    .from('work_entry')
    .upsert(row, { onConflict: 'user_email,date' })
    .select('work_entry_id')
    .maybeSingle();
  if (upErr) return { success: false, error: upErr.message };

  const result = {
    success: true,
    data: { work_entry_id: saved?.work_entry_id || data.work_entry_id },
    message: 'Work entry saved',
  };

  // อัปเดตสรุปรายเดือน/รายปี — entry ถูกบันทึกแล้ว ถ้า recalc ล้มต้องไม่รายงานว่าเซฟล้มเหลว
  try {
    await recalcMonthlySummary(data.user_email, monthNum, yearNum);
    await recalcYearlySummary(data.user_email, yearNum);
  } catch (err) {
    console.error('[TimeFlow API] recalc summary failed:', err);
    result.summaryStale = true;
    result.warning = err.message;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUMMARY RECALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/** คำนวณสรุปรายเดือนจาก work_entry แล้วบันทึกลง monthly_summary */
async function recalcMonthlySummary(userEmail, monthNum, yearNum) {
  const { data: filtered, error } = await supabase
    .from('work_entry')
    .select('*')
    .eq('user_email', userEmail)
    .eq('month_num', monthNum)
    .eq('year_num', yearNum);
  if (error) throw new Error(error.message);

  let days_worked = 0, ot_days = 0, shift_days = 0;
  let total_working_hour = 0, total_ot_hour = 0;
  let total_regular_earning = 0, total_ot_earning = 0, total_earning = 0;
  let total_shift_allowance = 0;
  let total_ot_hour_15 = 0, total_ot_earning_15 = 0;
  let total_ot_hour_1 = 0, total_ot_earning_1 = 0;
  let total_ot_hour_3 = 0, total_ot_earning_3 = 0;

  (filtered || []).forEach((e) => {
    const wh = Number(e.working_hour) || 0;
    const oh = Number(e.ot_hour) || 0;
    const sa = Number(e.shift_allowance) || 0;
    if (wh > 0 || oh > 0) days_worked++;
    if (oh > 0) ot_days++;
    if (sa > 0) shift_days++;            // นับจำนวนวันที่ได้เบี้ยกะ
    total_working_hour += wh;
    total_ot_hour += oh;
    total_regular_earning += Number(e.regular_earning) || 0;
    total_ot_earning += Number(e.ot_earning) || 0;
    total_shift_allowance += sa;
    total_earning += Number(e.total_earning) || 0;
    total_ot_hour_15 += Number(e.ot_hour_15) || 0;
    total_ot_earning_15 += Number(e.ot_earning_15) || 0;
    total_ot_hour_1 += Number(e.ot_hour_1) || 0;
    total_ot_earning_1 += Number(e.ot_earning_1) || 0;
    total_ot_hour_3 += Number(e.ot_hour_3) || 0;
    total_ot_earning_3 += Number(e.ot_earning_3) || 0;
  });

  // user ปัจจุบัน + summary เดิมของเดือนนี้ (ดึงพร้อมกัน)
  const [{ data: user }, { data: existing }] = await Promise.all([
    supabase.from('user').select('*').eq('email', userEmail).maybeSingle(),
    supabase.from('monthly_summary').select('*')
      .eq('user_email', userEmail).eq('month_num', monthNum).eq('year_num', yearNum)
      .maybeSingle(),
  ]);
  if (user) expandUserWithSalary(user);

  // เงินเดือน/ประกันสังคมที่ใช้คิด:
  //  - เดือนที่ผ่านมาแล้ว และเคยบันทึก snapshot ไว้ → ใช้ค่าที่ snapshot (แก้เงินเดือนทีหลังไม่ย้อนกระทบ)
  //  - เดือนปัจจุบัน/อนาคต หรือยังไม่มี snapshot → ใช้ค่าปัจจุบันของ user แล้วบันทึกเป็น snapshot
  const now = new Date();
  const isPastMonth = yearNum * 12 + monthNum < now.getFullYear() * 12 + (now.getMonth() + 1);
  const hasSnapshot = existing && existing.salary_snapshot != null;
  const useSnapshot = isPastMonth && hasSnapshot;
  const salaryMonthly = useSnapshot
    ? Number(existing.salary_snapshot) || 0
    : (user ? Number(user.salary_monthly) || 0 : 0);
  const socialSecurity = useSnapshot
    ? Number(existing.social_security_snapshot) || 0
    : (user ? Number(user.social_security) || 0 : 0);

  // รายเดือน: ใส่เงินเดือนเป็นฐานรายได้หลัก เมื่อมีข้อมูลการลงเวลาในเดือนนั้น
  const hasEntries = (filtered || []).length > 0;
  total_regular_earning = hasEntries ? salaryMonthly : 0;
  total_earning = total_regular_earning + total_ot_earning + total_shift_allowance;

  // หักประกันสังคม (ต่อเดือน) เมื่อมีการทำงานในเดือนนั้น
  if (hasEntries && socialSecurity > 0) {
    total_earning = Math.max(0, total_earning - socialSecurity);
  }

  const summaryData = {
    user_email: userEmail,
    month_num: monthNum,
    year_num: yearNum,
    days_worked,
    ot_days,
    shift_days,
    total_working_hour,
    total_ot_hour,
    total_regular_earning,
    total_ot_earning,
    total_shift_allowance,
    total_earning,
    total_ot_hour_15,
    total_ot_earning_15,
    total_ot_hour_1,
    total_ot_earning_1,
    total_ot_hour_3,
    total_ot_earning_3,
    // snapshot ของค่าที่ใช้คิดเดือนนี้ (ต้องรัน monthly_summary_snapshot_migration.sql)
    salary_snapshot: salaryMonthly,
    social_security_snapshot: socialSecurity,
  };

  if (existing) {
    const { error: upErr } = await supabase
      .from('monthly_summary')
      .update(summaryData)
      .eq('summary_id', existing.summary_id);
    if (upErr) throw new Error(upErr.message);
  } else {
    summaryData.summary_id = generateId('MS');
    const { error: insErr } = await supabase.from('monthly_summary').insert(summaryData);
    if (insErr) throw new Error(insErr.message);
  }
}

/** คำนวณสรุปรายปีจาก monthly_summary แล้วบันทึกลง yearly_summary */
async function recalcYearlySummary(userEmail, yearNum) {
  const { data: filtered, error } = await supabase
    .from('monthly_summary')
    .select('*')
    .eq('user_email', userEmail)
    .eq('year_num', yearNum);
  if (error) throw new Error(error.message);

  let total_days_worked = 0, total_ot_days = 0, total_shift_days = 0;
  let total_working_hour = 0, total_ot_hour = 0;
  let total_regular_earning = 0, total_ot_earning = 0, total_earning = 0;
  let total_shift_allowance = 0;
  let total_ot_hour_15 = 0, total_ot_earning_15 = 0;
  let total_ot_hour_1 = 0, total_ot_earning_1 = 0;
  let total_ot_hour_3 = 0, total_ot_earning_3 = 0;

  (filtered || []).forEach((m) => {
    total_days_worked += Number(m.days_worked) || 0;
    total_ot_days += Number(m.ot_days) || 0;
    total_shift_days += Number(m.shift_days) || 0;
    total_working_hour += Number(m.total_working_hour) || 0;
    total_ot_hour += Number(m.total_ot_hour) || 0;
    total_regular_earning += Number(m.total_regular_earning) || 0;
    total_ot_earning += Number(m.total_ot_earning) || 0;
    total_shift_allowance += Number(m.total_shift_allowance) || 0;
    total_earning += Number(m.total_earning) || 0;
    total_ot_hour_15 += Number(m.total_ot_hour_15) || 0;
    total_ot_earning_15 += Number(m.total_ot_earning_15) || 0;
    total_ot_hour_1 += Number(m.total_ot_hour_1) || 0;
    total_ot_earning_1 += Number(m.total_ot_earning_1) || 0;
    total_ot_hour_3 += Number(m.total_ot_hour_3) || 0;
    total_ot_earning_3 += Number(m.total_ot_earning_3) || 0;
  });

  const summaryData = {
    user_email: userEmail,
    year_num: yearNum,
    total_days_worked,
    total_ot_days,
    total_shift_days,
    total_working_hour,
    total_ot_hour,
    total_regular_earning,
    total_ot_earning,
    total_shift_allowance,
    total_earning,
    total_ot_hour_15,
    total_ot_earning_15,
    total_ot_hour_1,
    total_ot_earning_1,
    total_ot_hour_3,
    total_ot_earning_3,
  };

  const { data: existing } = await supabase
    .from('yearly_summary')
    .select('summary_id')
    .eq('user_email', userEmail)
    .eq('year_num', yearNum)
    .maybeSingle();

  if (existing) {
    const { error: upErr } = await supabase
      .from('yearly_summary')
      .update(summaryData)
      .eq('summary_id', existing.summary_id);
    if (upErr) throw new Error(upErr.message);
  } else {
    summaryData.summary_id = generateId('YS');
    const { error: insErr } = await supabase.from('yearly_summary').insert(summaryData);
    if (insErr) throw new Error(insErr.message);
  }
}

/** ดึงสรุปข้อมูลเงินจาก work_entry (รายวัน), monthly_summary (รายเดือน), yearly_summary (รายปี) */
async function getEarningsSummary(email, year) {
  if (!email) return { success: false, error: 'email is required' };
  if (!year) return { success: false, error: 'year is required' };

  // ── Daily: ดึงจาก work_entry ──
  const { data: entries, error: eErr } = await supabase
    .from('work_entry')
    .select('*')
    .eq('user_email', email)
    .eq('year_num', year);
  if (eErr) return { success: false, error: eErr.message };

  const daily = {};
  (entries || []).forEach((e) => {
    daily[String(e.date)] = {
      working_hour: Number(e.working_hour) || 0,
      ot_hour: Number(e.ot_hour) || 0,
      ot_earning: Number(e.ot_earning) || 0,
      ot_hour_15: Number(e.ot_hour_15) || 0,
      ot_earning_15: Number(e.ot_earning_15) || 0,
      ot_hour_1: Number(e.ot_hour_1) || 0,
      ot_earning_1: Number(e.ot_earning_1) || 0,
      ot_hour_3: Number(e.ot_hour_3) || 0,
      ot_earning_3: Number(e.ot_earning_3) || 0,
      regular_earning: Number(e.regular_earning) || 0,
      shift_allowance: Number(e.shift_allowance) || 0,
      total_earning: Number(e.total_earning) || 0,
    };
  });

  // ── Monthly: ดึงจาก monthly_summary ──
  const { data: monthlyFiltered, error: mErr } = await supabase
    .from('monthly_summary')
    .select('*')
    .eq('user_email', email)
    .eq('year_num', year);
  if (mErr) return { success: false, error: mErr.message };

  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const found = (monthlyFiltered || []).find((r) => Number(r.month_num) === m);
    if (found) {
      monthly.push({
        month_num: m,
        year_num: year,
        days_worked: Number(found.days_worked) || 0,
        ot_days: Number(found.ot_days) || 0,
        shift_days: Number(found.shift_days) || 0,
        total_working_hour: Number(found.total_working_hour) || 0,
        total_ot_hour: Number(found.total_ot_hour) || 0,
        total_ot_earning: Number(found.total_ot_earning) || 0,
        total_regular_earning: Number(found.total_regular_earning) || 0,
        total_shift_allowance: Number(found.total_shift_allowance) || 0,
        total_earning: Number(found.total_earning) || 0,
        total_ot_hour_15: Number(found.total_ot_hour_15) || 0,
        total_ot_earning_15: Number(found.total_ot_earning_15) || 0,
        total_ot_hour_1: Number(found.total_ot_hour_1) || 0,
        total_ot_earning_1: Number(found.total_ot_earning_1) || 0,
        total_ot_hour_3: Number(found.total_ot_hour_3) || 0,
        total_ot_earning_3: Number(found.total_ot_earning_3) || 0,
      });
    } else {
      monthly.push({
        month_num: m, year_num: year,
        days_worked: 0, ot_days: 0, shift_days: 0,
        total_working_hour: 0, total_ot_hour: 0,
        total_ot_earning: 0, total_regular_earning: 0,
        total_shift_allowance: 0, total_earning: 0,
        total_ot_hour_15: 0, total_ot_earning_15: 0,
        total_ot_hour_1: 0, total_ot_earning_1: 0,
        total_ot_hour_3: 0, total_ot_earning_3: 0,
      });
    }
  }

  // ── Yearly: ดึงจาก yearly_summary ──
  const { data: yearlyFound, error: yErr } = await supabase
    .from('yearly_summary')
    .select('*')
    .eq('user_email', email)
    .eq('year_num', year)
    .maybeSingle();
  if (yErr) return { success: false, error: yErr.message };

  const yearlyTotals = yearlyFound ? {
    year_num: year,
    total_days_worked: Number(yearlyFound.total_days_worked) || 0,
    total_ot_days: Number(yearlyFound.total_ot_days) || 0,
    total_shift_days: Number(yearlyFound.total_shift_days) || 0,
    total_working_hour: Number(yearlyFound.total_working_hour) || 0,
    total_ot_hour: Number(yearlyFound.total_ot_hour) || 0,
    total_ot_earning: Number(yearlyFound.total_ot_earning) || 0,
    total_regular_earning: Number(yearlyFound.total_regular_earning) || 0,
    total_shift_allowance: Number(yearlyFound.total_shift_allowance) || 0,
    total_earning: Number(yearlyFound.total_earning) || 0,
    total_ot_hour_15: Number(yearlyFound.total_ot_hour_15) || 0,
    total_ot_earning_15: Number(yearlyFound.total_ot_earning_15) || 0,
    total_ot_hour_1: Number(yearlyFound.total_ot_hour_1) || 0,
    total_ot_earning_1: Number(yearlyFound.total_ot_earning_1) || 0,
    total_ot_hour_3: Number(yearlyFound.total_ot_hour_3) || 0,
    total_ot_earning_3: Number(yearlyFound.total_ot_earning_3) || 0,
  } : {
    year_num: year,
    total_days_worked: 0, total_ot_days: 0, total_shift_days: 0,
    total_working_hour: 0, total_ot_hour: 0,
    total_ot_earning: 0, total_regular_earning: 0,
    total_shift_allowance: 0, total_earning: 0,
    total_ot_hour_15: 0, total_ot_earning_15: 0,
    total_ot_hour_1: 0, total_ot_earning_1: 0,
    total_ot_hour_3: 0, total_ot_earning_3: 0,
  };

  // entries = work_entry ของปีนี้ (ดึงมาแล้วข้างบน) — ให้หน้าจอใช้ต่อ ไม่ต้องยิง query ซ้ำ/ไม่ต้องโหลดทั้งประวัติ
  return { success: true, data: { monthly, yearly: yearlyTotals, daily, entries: entries || [] } };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HOLIDAYS API
// ═══════════════════════════════════════════════════════════════════════════════

/** normalize ค่า date จาก DB → "YYYY-MM-DD" */
function normalizeHolidayDate(val) {
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mo = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mo}-${dd}`;
  }
  return String(val).split('T')[0];
}

async function getHolidays(email) {
  if (!email) return { success: false, error: 'email is required' };
  const { data, error } = await supabase
    .from('holidays')
    .select('date')
    .eq('email', email);
  if (error) return { success: false, error: error.message };
  const userHolidays = (data || [])
    .filter((r) => r.date)
    .map((r) => normalizeHolidayDate(r.date));
  return { success: true, data: userHolidays };
}

/** วันหยุดทางการ (global) — คืน [{ date, name_th, name_en }] */
async function getPublicHolidays() {
  const { data, error } = await supabase
    .from('public_holidays')
    .select('*');
  if (error) return { success: false, error: error.message };
  const out = (data || [])
    .filter((r) => r.date)
    .map((r) => ({
      date: normalizeHolidayDate(r.date),
      name_th: r.name_th || '',
      name_en: r.name_en || '',
    }));
  return { success: true, data: out };
}

async function toggleHoliday(email, dateStr, isHoliday) {
  if (!email || !dateStr) return { success: false, error: 'email and date are required' };

  const { data: existing, error: exErr } = await supabase
    .from('holidays')
    .select('*')
    .eq('email', email)
    .eq('date', dateStr)
    .maybeSingle();
  if (exErr) return { success: false, error: exErr.message };

  if (isHoliday) {
    if (!existing) {
      const { error } = await supabase.from('holidays').insert({
        email,
        date: dateStr,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true, message: 'Holiday added' };
  } else {
    if (existing) {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('email', email)
        .eq('date', dateStr);
      if (error) return { success: false, error: error.message };
    }
    return { success: true, message: 'Holiday removed' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC API (คงชื่อ / signature เดิมทุกอย่าง — components เดิมใช้ได้ไม่ต้องแก้)
// ═══════════════════════════════════════════════════════════════════════════════

/** wrapper: log + จับ error ให้เป็นรูปแบบ { success:false, error } เหมือนเดิม */
function wrap(action, fn) {
  return async (...args) => {
    logCall(action, args.length ? args : '');
    try {
      const res = await fn(...args);
      if (import.meta.env.DEV) console.log(`[TimeFlow API] ← ${action}`, res && res.success ? '✅' : '❌', res);
      return res;
    } catch (err) {
      console.error(`[TimeFlow API] ✕ ${action} error:`, err);
      return { success: false, error: err.message };
    }
  };
}

export const UserAPI = {
  get: wrap('getUser', getUser),
  create: wrap('createUser', createUser),
  update: wrap('updateUser', updateUser),
};

export const WorkEntryAPI = {
  getEarningsSummary: wrap('getEarningsSummary', getEarningsSummary),
  upsert: wrap('upsertWorkEntry', upsertWorkEntry),
  delete: wrap('deleteWorkEntry', (workEntryId) => deleteWorkEntry(workEntryId)),
};

export const HolidayAPI = {
  get: wrap('getHolidays', getHolidays),
  toggle: wrap('toggleHoliday', toggleHoliday),
};

export const PublicHolidayAPI = {
  get: wrap('getPublicHolidays', getPublicHolidays),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS — แปลง DB data ↔ Frontend format (คงเดิม ไม่เปลี่ยน)
// ═══════════════════════════════════════════════════════════════════════════════

/** Normalize date → "YYYY-MM-DD" string */
function normalizeDate(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
  } catch { /* parse ไม่ได้ → ใช้ fallback ด้านล่าง */ }
  return str;
}

/** Normalize time → "HH:mm" string */
function normalizeTime(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  const isoMatch = str.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
  } catch { /* parse ไม่ได้ → ใช้ fallback ด้านล่าง */ }
  return str;
}

/**
 * แปลง array ของ work_entry จาก DB → entries object ที่ App.jsx ใช้
 * Output: { "2026-03-25": { in: "08:30", out: "18:00", _id: "WE_xxx", leave: null } }
 */
export function sheetEntriesToFrontend(sheetEntries) {
  const result = {};
  if (!Array.isArray(sheetEntries)) {
    console.warn('[TimeFlow] sheetEntriesToFrontend: expected array, got:', typeof sheetEntries);
    return result;
  }

  if (import.meta.env.DEV) console.log(`[TimeFlow] Converting ${sheetEntries.length} entries to frontend format`);

  sheetEntries.forEach((entry) => {
    const dateStr = normalizeDate(entry.date);
    if (!dateStr) return;

    const obj = {
      in: normalizeTime(entry.clock_in),
      out: normalizeTime(entry.clock_out),
      _id: String(entry.work_entry_id || ''),
      note: entry.note || '',
    };

    if (entry.leave_type && String(entry.leave_type).trim() !== '') {
      obj.leave = { type: String(entry.leave_type) };
    } else {
      obj.leave = null;
    }

    result[dateStr] = obj;
  });

  if (import.meta.env.DEV) console.log(`[TimeFlow] Converted entries:`, Object.keys(result).length, 'dates');
  return result;
}

/** แปลง frontend entry → DB format สำหรับ upsert (คำนวณเงินฝั่ง service) */
export function frontendEntryToSheet(dateStr, entry, userEmail) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    user_email: userEmail,
    date: dateStr,
    month_num: d.getMonth() + 1,
    year_num: d.getFullYear(),
    clock_in: entry.in || '',
    clock_out: entry.out || '',
    leave_type: entry.leave?.type || '',
    // ไม่ส่ง note เมื่อผู้เรียกไม่ได้ระบุ (เช่น บันทึกวันลา) → ไม่เขียนทับ note เดิมใน DB
    ...(entry.note !== undefined ? { note: entry.note || '' } : {}),
  };
}
