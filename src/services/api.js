/* ═══════════════════════════════════════════════════════════════════════════════
   TimeFlow — API Service Layer (Supabase)
   ═══════════════════════════════════════════════════════════════════════════════
   เชื่อมต่อ Frontend กับ Supabase โดยตรง
   ─ Table "user"            : ข้อมูลผู้ใช้ (อ้างอิง salary ผ่าน salary_id)
   ─ Table "salary_setting"  : ประเภทเงินเดือน + ยอด (id, salary_type, salary_monthly, salary_daily)
   ─ Table "work_entry"      : บันทึกการทำงาน
   ─ Table "ot_setting"      : ตั้งค่า OT
   ─ Table "monthly_summary" : สรุปรายเดือน
   ─ Table "yearly_summary"  : สรุปรายปี
   ─ Table "holidays"        : วันหยุด

   ⚠️ ชื่อตารางและชื่อแอทริบิวยังคงเหมือนเดิมทุกอย่าง (เดิมเป็น Google Sheets)
   Business logic (คำนวณเงิน / สรุปรายเดือน-รายปี) ย้ายมาทำฝั่ง client
   ═══════════════════════════════════════════════════════════════════════════════ */

import { supabase } from './supabaseClient';

// ── HELPERS ─────────────────────────────────────────────────────────────────

/** สร้าง unique ID ด้วย timestamp + random (คงรูปแบบเดิมจากฝั่ง Apps Script) */
function generateId(prefix) {
  const ts = new Date().getTime();
  const rand = Math.floor(Math.random() * 10000);
  return (prefix || 'id') + '_' + ts + '_' + rand;
}

/** log แบบเดียวกับของเดิม */
function logCall(action, data) {
  console.log(`[TimeFlow API] → ${action}`, data || '');
}

/** แปลง "HH:mm" → จำนวนนาทีตั้งแต่เที่ยงคืน (คืน null ถ้าไม่ถูกต้อง) */
function parseHHMM(str) {
  const p = String(str || '').split(':');
  if (p.length < 2) return null;
  const h = Number(p[0]);
  const m = Number(p[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SALARY SETTING (แยกจาก user — user เก็บแค่ salary_id)
//  salary_type = 'monthly' | 'daily' (ตรงกับ payment_type ฝั่ง frontend)
// ═══════════════════════════════════════════════════════════════════════════════

async function createSalarySettingRow(sal) {
  const row = {
    id: sal.id,
    salary_type: sal.salary_type || 'monthly',
    salary_monthly: Number(sal.salary_monthly) || 0,
    salary_daily: Number(sal.salary_daily) || 0,
  };
  const { error } = await supabase.from('salary_setting').insert(row);
  if (error) throw new Error(error.message);
}

async function updateSalarySettingRow(salaryId, patch) {
  const upd = {};
  if (patch.salary_type !== undefined && patch.salary_type !== null) upd.salary_type = patch.salary_type;
  if (patch.salary_monthly !== undefined && patch.salary_monthly !== null) upd.salary_monthly = Number(patch.salary_monthly);
  if (patch.salary_daily !== undefined && patch.salary_daily !== null) upd.salary_daily = Number(patch.salary_daily);
  if (Object.keys(upd).length === 0) return true;

  const { data, error } = await supabase
    .from('salary_setting')
    .update(upd)
    .eq('id', salaryId)
    .select('id');
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

/** รวมฟิลด์เงินเดือนเข้า object user สำหรับส่งให้ frontend (payment_type / salary_monthly / daily_rate) */
async function expandUserWithSalary(user) {
  if (!user) return user;
  const sid = user.salary_id;
  if (sid === undefined || sid === null || String(sid).trim() === '') return user;

  const { data: sal, error } = await supabase
    .from('salary_setting')
    .select('*')
    .eq('id', sid)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (sal) {
    user.payment_type = sal.salary_type;
    user.salary_monthly = sal.salary_monthly;
    user.daily_rate = sal.salary_daily;
  }
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

async function getAllUsers() {
  const { data: users, error } = await supabase.from('user').select('*');
  if (error) return { success: false, error: error.message };
  for (const u of users) {
    await expandUserWithSalary(u);
  }
  return { success: true, data: users };
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

  // สร้าง salary_setting แล้ว link ผ่าน salary_id (ไม่เก็บเงินเดือนซ้ำใน user)
  const salaryId = generateId('SAL');
  await createSalarySettingRow({
    id: salaryId,
    salary_type: data.payment_type || 'monthly',
    salary_monthly: data.salary_monthly !== undefined && data.salary_monthly !== null ? Number(data.salary_monthly) : 0,
    salary_daily: data.daily_rate !== undefined && data.daily_rate !== null ? Number(data.daily_rate) : 0,
  });

  const row = {
    email: data.email,
    salary_id: salaryId,
    ot_hourly: data.ot_hourly !== undefined && data.ot_hourly !== null ? data.ot_hourly : 0,
    working_hour: data.working_hour !== undefined && data.working_hour !== null ? data.working_hour : 8,
    ot_setting_id: data.ot_setting_id ? data.ot_setting_id : null,
    sick_leave_day: data.sick_leave_day !== undefined && data.sick_leave_day !== null ? data.sick_leave_day : 30,
    personal_leave_day: data.personal_leave_day !== undefined && data.personal_leave_day !== null ? data.personal_leave_day : 6,
    annual_leave_day: data.annual_leave_day !== undefined && data.annual_leave_day !== null ? data.annual_leave_day : 10,
    work_days_per_week: data.work_days_per_week !== undefined && data.work_days_per_week !== null ? data.work_days_per_week : 5,
  };

  const { error } = await supabase.from('user').insert(row);
  if (error) return { success: false, error: error.message };

  const out = Object.assign({}, data, { salary_id: salaryId });
  await expandUserWithSalary(out);
  return { success: true, data: out, message: 'User created' };
}

async function updateUser(data) {
  if (!data || !data.email) {
    return { success: false, error: 'email is required' };
  }

  const { data: current, error: curErr } = await supabase
    .from('user')
    .select('*')
    .eq('email', data.email)
    .maybeSingle();
  if (curErr) return { success: false, error: curErr.message };
  if (!current) return { success: false, error: 'User not found' };

  let salaryId = String(current.salary_id || '').trim();

  // ── patch salary_setting ──
  const patchSalary = {};
  if (data.salary_monthly !== undefined && data.salary_monthly !== null) patchSalary.salary_monthly = data.salary_monthly;
  if (data.daily_rate !== undefined && data.daily_rate !== null) patchSalary.salary_daily = data.daily_rate;
  if (data.payment_type !== undefined && data.payment_type !== null) patchSalary.salary_type = data.payment_type;
  const hasSalaryPatch = Object.keys(patchSalary).length > 0;

  if (hasSalaryPatch) {
    if (!salaryId) {
      salaryId = generateId('SAL');
      await createSalarySettingRow({
        id: salaryId,
        salary_type: data.payment_type !== undefined && data.payment_type !== null ? data.payment_type : 'monthly',
        salary_monthly: data.salary_monthly !== undefined && data.salary_monthly !== null ? Number(data.salary_monthly) : 0,
        salary_daily: data.daily_rate !== undefined && data.daily_rate !== null ? Number(data.daily_rate) : 0,
      });
    } else {
      const ok = await updateSalarySettingRow(salaryId, patchSalary);
      if (!ok) {
        await createSalarySettingRow({
          id: salaryId,
          salary_type: data.payment_type || 'monthly',
          salary_monthly: data.salary_monthly !== undefined ? Number(data.salary_monthly) : 0,
          salary_daily: data.daily_rate !== undefined ? Number(data.daily_rate) : 0,
        });
      }
    }
  }

  // ── patch user (ไม่เก็บ salary_monthly / payment_type / daily_rate ใน user) ──
  const SALARY_FIELDS = ['salary_monthly', 'payment_type', 'daily_rate'];
  const upd = {};
  Object.keys(data).forEach((h) => {
    if (h === 'email') return;
    if (SALARY_FIELDS.indexOf(h) !== -1) return;
    if (data[h] !== undefined && data[h] !== null) upd[h] = data[h];
  });
  if (hasSalaryPatch && salaryId) upd.salary_id = salaryId;

  if (Object.keys(upd).length > 0) {
    const { error } = await supabase.from('user').update(upd).eq('email', data.email);
    if (error) return { success: false, error: error.message };
  }

  return { success: true, message: 'User updated' };
}

async function upsertUser(data) {
  if (!data || !data.email) return { success: false, error: 'email is required' };
  const { data: existing, error } = await supabase
    .from('user')
    .select('email')
    .eq('email', data.email)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return existing ? updateUser(data) : createUser(data);
}

async function deleteUser(email) {
  if (!email) return { success: false, error: 'email is required' };
  const { error } = await supabase.from('user').delete().eq('email', email);
  if (error) return { success: false, error: error.message };
  return { success: true, message: 'User deleted' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WORK ENTRY API
// ═══════════════════════════════════════════════════════════════════════════════

async function getWorkEntries(email) {
  if (!email) return { success: false, error: 'email is required' };
  const { data, error } = await supabase
    .from('work_entry')
    .select('*')
    .eq('user_email', email);
  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

async function getWorkEntriesByMonth(email, month, year) {
  if (!email) return { success: false, error: 'email is required' };
  const { data, error } = await supabase
    .from('work_entry')
    .select('*')
    .eq('user_email', email)
    .eq('month_num', month)
    .eq('year_num', year);
  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

async function createWorkEntry(data) {
  if (!data || !data.user_email) {
    return { success: false, error: 'user_email is required' };
  }

  if (!data.work_entry_id) data.work_entry_id = generateId('WE');

  // Auto-fill month_num / year_num จาก date ถ้ามี
  if (data.date && (!data.month_num || !data.year_num)) {
    const d = new Date(data.date);
    data.month_num = data.month_num || (d.getMonth() + 1);
    data.year_num = data.year_num || d.getFullYear();
  }

  const row = pickWorkEntryColumns(data);
  const { error } = await supabase.from('work_entry').insert(row);
  if (error) return { success: false, error: error.message };
  return { success: true, data: { work_entry_id: data.work_entry_id }, message: 'Work entry created' };
}

async function updateWorkEntry(data) {
  if (!data || !data.work_entry_id) {
    return { success: false, error: 'work_entry_id is required' };
  }
  const row = pickWorkEntryColumns(data);
  delete row.work_entry_id;
  const { data: updated, error } = await supabase
    .from('work_entry')
    .update(row)
    .eq('work_entry_id', data.work_entry_id)
    .select('work_entry_id');
  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0) return { success: false, error: 'Work entry not found' };
  return { success: true, message: 'Work entry updated' };
}

/** เลือกเฉพาะคอลัมน์ของตาราง work_entry (คงชื่อแอทริบิวเดิม) */
function pickWorkEntryColumns(data) {
  const COLS = [
    'work_entry_id', 'date', 'month_num', 'year_num',
    'clock_in', 'clock_out', 'leave_type', 'working_hour',
    'ot_hour', 'ot_earning', 'user_email',
    'regular_earning', 'shift_allowance', 'total_earning',
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

  let monthNum = null, yearNum = null;

  // 1. คำนวณเงินโดยดึงข้อมูลจาก DB เท่านั้น
  const { data: user, error: userErr } = await supabase
    .from('user')
    .select('*')
    .eq('email', data.user_email)
    .maybeSingle();
  if (userErr) return { success: false, error: userErr.message };

  if (user) {
    await expandUserWithSalary(user);

    // ── ดึงการตั้งค่า OT จากตาราง ot_setting (ผูกผ่าน user.ot_setting_id) ──
    //    ค่า ot_mode / ot_block_hours / ot_deduct_mins ไม่ได้อยู่ในตาราง user
    let otMode = 'hourly';
    let blockH = 0;
    let deductM = 0;
    let shiftAllowance = 0;
    let shiftStart = '';
    if (user.ot_setting_id) {
      const { data: otSetting, error: otErr } = await supabase
        .from('ot_setting')
        .select('*')
        .eq('ot_setting_id', user.ot_setting_id)
        .maybeSingle();
      if (otErr) return { success: false, error: otErr.message };
      if (otSetting) {
        otMode = otSetting.ot_mode || 'hourly';
        blockH = Number(otSetting.ot_block_hours) || 0;
        deductM = Number(otSetting.ot_deduct_mins) || 0;
        shiftAllowance = Number(otSetting.shift_allowance) || 0;
        shiftStart = otSetting.shift_start || '';
      }
    }

    let workingHour = 0;
    let otHour = 0;
    let shiftEarning = 0;

    if (data.clock_in && data.clock_out) {
      const partsIn = String(data.clock_in).split(':');
      const partsOut = String(data.clock_out).split(':');
      const ih = Number(partsIn[0] || 0), im = Number(partsIn[1] || 0);
      const oh = Number(partsOut[0] || 0), om = Number(partsOut[1] || 0);

      let totalMins = (oh * 60 + om) - (ih * 60 + im);
      if (totalMins < 0) totalMins += 1440; // ข้ามวัน

      if (totalMins > 0) {
        const totalH = totalMins / 60;
        const stdH = Number(user.working_hour) || 8;
        workingHour = Math.min(totalH, stdH);

        let rawOT = Math.max(0, totalH - stdH);
        let netOT = rawOT;

        // ── Block mode: ทำ OT ไม่เกิน ot_block_hours จ่ายเต็ม, เกินให้หัก ot_deduct_mins ──
        if (otMode === 'block' && rawOT > 0) {
          if (rawOT <= blockH) {
            netOT = rawOT;                                 // อยู่ในบล็อก → จ่ายเต็มตามชั่วโมงจริง
          } else {
            netOT = Math.max(0, rawOT - (deductM / 60));   // เกินบล็อก → หักนาทีที่กำหนด
          }
        }

        // ── OT ตั้งแต่ 9 ชม. ขึ้นไป หักออก 1 ชม. อัตโนมัติ (เช่น OT 9 ชม. → 8 ชม.) ──
        if (netOT >= 9) {
          netOT = Math.max(0, netOT - 1);
        }

        otHour = netOT;
      }

      // ── Shift allowance: ได้เบี้ยกะเฉพาะเมื่อเวลาเข้างาน "ตรงกับ" เวลาเริ่มกะพอดี ──
      //    เข้าก่อนเวลาเริ่มกะ หรือไม่ตรงเวลาเริ่มกะ = งานปกติ ไม่ได้เบี้ยกะ
      //    (เวลาที่เกินยังคิดเป็น OT ตามปกติจากส่วน working_hour ด้านบน)
      const inMin = ih * 60 + im;
      const shiftStartMin = parseHHMM(shiftStart);
      if (shiftAllowance > 0 && shiftStartMin != null && inMin === shiftStartMin) {
        shiftEarning = shiftAllowance;
      }
    }

    data.working_hour = workingHour;
    data.ot_hour = otHour;

    const paymentType = user.payment_type || 'monthly';
    const dailyRate = Number(user.daily_rate) || 0;
    const otRate = Number(user.ot_hourly) || 0;
    const stdH = Number(user.working_hour) || 8;

    let regularEarning = 0;
    if (paymentType === 'daily') {
      regularEarning = dailyRate * (stdH > 0 ? workingHour / stdH : 0);
    } else {
      // Monthly Salary: ไม่คิดเงินรายวัน
      regularEarning = 0;
    }

    const otEarning = otHour * otRate;
    const totalEarning = regularEarning + otEarning + shiftEarning;

    data.ot_earning = otEarning;
    data.regular_earning = regularEarning;
    data.shift_allowance = shiftEarning;
    data.total_earning = totalEarning;

    const d = new Date(data.date);
    monthNum = d.getMonth() + 1;
    yearNum = d.getFullYear();
  }

  // 2. หา existing entry ด้วย user_email + date
  const { data: existing, error: exErr } = await supabase
    .from('work_entry')
    .select('work_entry_id')
    .eq('user_email', data.user_email)
    .eq('date', data.date)
    .maybeSingle();
  if (exErr) return { success: false, error: exErr.message };

  let result;
  if (existing) {
    data.work_entry_id = existing.work_entry_id;
    result = await updateWorkEntry(data);
  } else {
    result = await createWorkEntry(data);
  }

  // อัปเดตตารางสรุปรายเดือนและรายปีหลังบันทึก work_entry แล้ว
  if (monthNum && yearNum) {
    await recalcMonthlySummary(data.user_email, monthNum, yearNum);
    await recalcYearlySummary(data.user_email, yearNum);
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
  });

  // Fetch user info for payment_type check
  const { data: user } = await supabase
    .from('user')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle();
  if (user) await expandUserWithSalary(user);
  const paymentType = user ? (user.payment_type || 'monthly') : 'monthly';
  const salaryMonthly = user ? (Number(user.salary_monthly) || 0) : 0;

  // ถ้าเป็นรายเดือน ให้ใส่เงินเดือนเป็นฐานรายได้หลัก (ถ้ามีข้อมูลการลงเวลาในเดือนนั้น)
  if (paymentType === 'monthly') {
    total_regular_earning = (filtered && filtered.length > 0) ? salaryMonthly : 0;
    total_earning = total_regular_earning + total_ot_earning + total_shift_allowance;
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
  };

  const { data: existing } = await supabase
    .from('monthly_summary')
    .select('summary_id')
    .eq('user_email', userEmail)
    .eq('month_num', monthNum)
    .eq('year_num', yearNum)
    .maybeSingle();

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
      });
    } else {
      monthly.push({
        month_num: m, year_num: year,
        days_worked: 0, ot_days: 0, shift_days: 0,
        total_working_hour: 0, total_ot_hour: 0,
        total_ot_earning: 0, total_regular_earning: 0,
        total_shift_allowance: 0, total_earning: 0,
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
  } : {
    year_num: year,
    total_days_worked: 0, total_ot_days: 0, total_shift_days: 0,
    total_working_hour: 0, total_ot_hour: 0,
    total_ot_earning: 0, total_regular_earning: 0,
    total_shift_allowance: 0, total_earning: 0,
  };

  return { success: true, data: { monthly, yearly: yearlyTotals, daily } };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OT SETTING API
// ═══════════════════════════════════════════════════════════════════════════════

async function getOtSetting(otSettingId) {
  if (!otSettingId) return { success: false, error: 'ot_setting_id is required' };
  const { data, error } = await supabase
    .from('ot_setting')
    .select('*')
    .eq('ot_setting_id', otSettingId)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'OT Setting not found' };
  return { success: true, data };
}

async function createOtSetting(data) {
  if (!data) return { success: false, error: 'data is required' };
  if (!data.ot_setting_id) data.ot_setting_id = generateId('OTS');

  const row = {
    ot_setting_id: data.ot_setting_id,
    ot_mode: data.ot_mode !== undefined && data.ot_mode !== null ? data.ot_mode : 'hourly',
    ot_block_hours: data.ot_block_hours !== undefined && data.ot_block_hours !== null ? data.ot_block_hours : 2,
    ot_deduct_mins: data.ot_deduct_mins !== undefined && data.ot_deduct_mins !== null ? data.ot_deduct_mins : 30,
    shift_allowance: data.shift_allowance !== undefined && data.shift_allowance !== null ? data.shift_allowance : 0,
    shift_start: data.shift_start !== undefined && data.shift_start !== null ? data.shift_start : '',
    shift_end: data.shift_end !== undefined && data.shift_end !== null ? data.shift_end : '',
  };
  const { error } = await supabase.from('ot_setting').insert(row);
  if (error) return { success: false, error: error.message };
  return { success: true, data: { ot_setting_id: data.ot_setting_id }, message: 'OT Setting created' };
}

async function updateOtSetting(data) {
  if (!data || !data.ot_setting_id) {
    return { success: false, error: 'ot_setting_id is required' };
  }
  const upd = {};
  ['ot_mode', 'ot_block_hours', 'ot_deduct_mins', 'shift_allowance', 'shift_start', 'shift_end'].forEach((h) => {
    if (data[h] !== undefined && data[h] !== null) upd[h] = data[h];
  });
  const { data: updated, error } = await supabase
    .from('ot_setting')
    .update(upd)
    .eq('ot_setting_id', data.ot_setting_id)
    .select('ot_setting_id');
  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0) return { success: false, error: 'OT Setting not found' };
  return { success: true, message: 'OT Setting updated' };
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
      console.log(`[TimeFlow API] ← ${action}`, res && res.success ? '✅' : '❌', res);
      return res;
    } catch (err) {
      console.error(`[TimeFlow API] ✕ ${action} error:`, err);
      return { success: false, error: err.message };
    }
  };
}

export const UserAPI = {
  get: wrap('getUser', getUser),
  getAll: wrap('getAllUsers', getAllUsers),
  create: wrap('createUser', createUser),
  update: wrap('updateUser', updateUser),
  upsert: wrap('upsertUser', upsertUser),
  delete: wrap('deleteUser', deleteUser),
};

export const WorkEntryAPI = {
  getByUser: wrap('getWorkEntries', getWorkEntries),
  getByMonth: wrap('getWorkEntriesByMonth', getWorkEntriesByMonth),
  getEarningsSummary: wrap('getEarningsSummary', getEarningsSummary),
  create: wrap('createWorkEntry', createWorkEntry),
  update: wrap('updateWorkEntry', updateWorkEntry),
  upsert: wrap('upsertWorkEntry', upsertWorkEntry),
  delete: wrap('deleteWorkEntry', (workEntryId) => deleteWorkEntry(workEntryId)),
};

export const OtSettingAPI = {
  get: wrap('getOtSetting', getOtSetting),
  create: wrap('createOtSetting', createOtSetting),
  update: wrap('updateOtSetting', updateOtSetting),
};

export const HolidayAPI = {
  get: wrap('getHolidays', getHolidays),
  toggle: wrap('toggleHoliday', toggleHoliday),
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
  } catch (_) { }
  return str;
}

/** Normalize time → "HH:mm" string */
function normalizeTime(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str.substring(0, 5);
  const isoMatch = str.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
  } catch (_) { }
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

  console.log(`[TimeFlow] Converting ${sheetEntries.length} entries to frontend format`);

  sheetEntries.forEach((entry) => {
    const dateStr = normalizeDate(entry.date);
    if (!dateStr) return;

    const obj = {
      in: normalizeTime(entry.clock_in),
      out: normalizeTime(entry.clock_out),
      _id: String(entry.work_entry_id || ''),
    };

    if (entry.leave_type && String(entry.leave_type).trim() !== '') {
      obj.leave = { type: String(entry.leave_type) };
    } else {
      obj.leave = null;
    }

    result[dateStr] = obj;
  });

  console.log(`[TimeFlow] Converted entries:`, Object.keys(result).length, 'dates');
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
  };
}
