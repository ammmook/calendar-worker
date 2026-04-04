/* ═══════════════════════════════════════════════════════════════════════════════
   TimeFlow — API Service Layer
   ═══════════════════════════════════════════════════════════════════════════════
   เชื่อมต่อ Frontend กับ Google Apps Script Backend
   
   ⚠️ CORS FIX: ส่งทุกอย่างผ่าน GET (encode data ใน URL parameter)
   ═══════════════════════════════════════════════════════════════════════════════ */

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

if (!API_URL || API_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
  console.warn('[TimeFlow API] VITE_APPS_SCRIPT_URL is not set. Backend calls will fail.');
}

// ── ALL requests go through GET to avoid CORS issues ────────────────────────
async function apiCall(action, data = null) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  if (data) {
    url.searchParams.set('data', JSON.stringify(data));
  }

  console.log(`[TimeFlow API] → ${action}`, data || '');

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    // Google Apps Script อาจ return HTML error page แทน JSON
    const text = await res.text();
    
    let json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      console.error(`[TimeFlow API] ← ${action} response is not JSON:`, text.substring(0, 200));
      return { success: false, error: 'Invalid JSON response from server' };
    }

    console.log(`[TimeFlow API] ← ${action}`, json.success ? '✅' : '❌', json);
    return json;
  } catch (err) {
    console.error(`[TimeFlow API] ✕ ${action} network error:`, err);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER API
// ═══════════════════════════════════════════════════════════════════════════════

export const UserAPI = {
  get: (email) => apiCall('getUser', { email }),
  getAll: () => apiCall('getAllUsers'),
  create: (data) => apiCall('createUser', data),
  update: (data) => apiCall('updateUser', data),
  upsert: (data) => apiCall('upsertUser', data),
  delete: (email) => apiCall('deleteUser', { email }),
  /** ย้ายเงินเดือนจากคอลัมน์เก่าใน user → salary_setting (ใช้หลังเพิ่มคอลัมน์ salary_id แล้ว) */
  migrateLegacySalary: () => apiCall('migrateLegacySalary'),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  WORK ENTRY API
// ═══════════════════════════════════════════════════════════════════════════════

export const WorkEntryAPI = {
  getByUser: (email) => apiCall('getWorkEntries', { email }),

  getByMonth: (email, month, year) =>
    apiCall('getWorkEntriesByMonth', { email, month, year }),

  create: (data) => apiCall('createWorkEntry', data),
  update: (data) => apiCall('updateWorkEntry', data),
  upsert: (data) => apiCall('upsertWorkEntry', data),
  delete: (workEntryId) => apiCall('deleteWorkEntry', { work_entry_id: workEntryId }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  OT SETTING API
// ═══════════════════════════════════════════════════════════════════════════════

export const OtSettingAPI = {
  get: (otSettingId) => apiCall('getOtSetting', { ot_setting_id: otSettingId }),
  create: (data) => apiCall('createOtSetting', data),
  update: (data) => apiCall('updateOtSetting', data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HOLIDAY API
// ═══════════════════════════════════════════════════════════════════════════════

export const HolidayAPI = {
  get: (email) => apiCall('getHolidays', { email }),
  toggle: (email, date, isHoliday) => apiCall('toggleHoliday', { email, date, isHoliday }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS — แปลง Sheet data ↔ Frontend format
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize date from Google Sheets → "YYYY-MM-DD" string
 * Google Sheets อาจส่ง date มาเป็น:
 *   - "2026-03-25"              → ใช้ได้เลย
 *   - "2026-03-25T00:00:00.000Z" → ตัดเอาส่วน date
 *   - "Mon Mar 25 2026 ..."     → parse แล้วสร้างใหม่
 *   - Date serial number        → ไม่ค่อยเจอ
 */
function normalizeDate(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  
  // ถ้าเป็น YYYY-MM-DD อยู่แล้ว
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // ถ้าเป็น ISO string หรือ date string
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
  } catch (_) {}
  
  return str;
}

/**
 * Normalize time from Google Sheets → "HH:mm" string
 * Google Sheets เก็บเวลาเป็น Date object → ส่งมาเป็น:
 *   - "08:30"                        → ใช้ได้เลย
 *   - "1899-12-30T10:17:56.000Z"     → extract HH:mm จาก ISO string
 *   - Date object                    → parse แล้วสร้างใหม่
 */
function normalizeTime(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  
  // ถ้าเป็น HH:mm หรือ HH:mm:ss อยู่แล้ว
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str.substring(0, 5);
  
  // ถ้าเป็น ISO string เช่น "1899-12-30T10:17:56.000Z"
  const isoMatch = str.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }
  
  // ถ้าเป็น Date string อื่นๆ
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
  } catch (_) {}
  
  return str;
}

/**
 * แปลง array ของ work_entry จาก Sheet → entries object ที่ App.jsx ใช้
 * Input:  [{ date: '2026-03-25', clock_in: '08:30', clock_out: '18:00', leave_type: '', ... }]
 * Output: { "2026-03-25": { in: "08:30", out: "18:00", _id: "WE_xxx", leave: null } }
 */
export function sheetEntriesToFrontend(sheetEntries) {
  const result = {};
  if (!Array.isArray(sheetEntries)) {
    console.warn('[TimeFlow] sheetEntriesToFrontend: expected array, got:', typeof sheetEntries);
    return result;
  }

  console.log(`[TimeFlow] Converting ${sheetEntries.length} sheet entries to frontend format`);

  sheetEntries.forEach((entry) => {
    const dateStr = normalizeDate(entry.date);
    if (!dateStr) return;

    const obj = {
      in: normalizeTime(entry.clock_in),
      out: normalizeTime(entry.clock_out),
      _id: String(entry.work_entry_id || ''),
    };

    // Leave type mapping
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

/**
 * แปลง frontend entry → Sheet format สำหรับ upsert
 */
export function frontendEntryToSheet(dateStr, entry, userEmail, std, salary, otRate, otMode, otBlockHours, otDeductMins) {
  const [ih, im] = (entry.in || '').split(':').map(Number);
  const [oh, om] = (entry.out || '').split(':').map(Number);
  let workingHour = 0, otHour = 0, otEarning = 0;

  if (entry.in && entry.out && !isNaN(ih) && !isNaN(oh)) {
    let totalMins = oh * 60 + om - (ih * 60 + im);
    if (totalMins < 0) totalMins += 1440; // handle overnight shift
    if (totalMins > 0) {
      const totalH = totalMins / 60;
      const stdH = parseFloat(std || 8);
      workingHour = Math.min(totalH, stdH);
      const rawOT = Math.max(0, totalH - stdH);
      
      // Apply OT block rule
      let netOT = rawOT;
      if (otMode === 'block' && rawOT > 0) {
        if (rawOT <= (otBlockHours || 0)) {
          netOT = rawOT;
        } else {
          netOT = Math.max(0, rawOT - ((otDeductMins || 0) / 60));
        }
      }
      
      otHour = netOT;
      otEarning = netOT * (otRate || 0);
    }
  }

  const d = new Date(dateStr + 'T00:00:00');

  return {
    user_email: userEmail,
    date: dateStr,
    month_num: d.getMonth() + 1,
    year_num: d.getFullYear(),
    clock_in: entry.in || '',
    clock_out: entry.out || '',
    leave_type: entry.leave?.type || '',
    working_hour: workingHour,
    ot_hour: otHour,
    ot_earning: otEarning,
  };
}
