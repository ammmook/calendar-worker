/* ═══════════════════════════════════════════════════════════════════════════════
   TimeFlow — Google Apps Script Backend
   ═══════════════════════════════════════════════════════════════════════════════
   ใช้ Google Sheets เป็น Database
   ─ Sheet "user"            : ข้อมูลผู้ใช้ (อ้างอิง salary ผ่าน salary_id)
   ─ Sheet "salary_setting"  : ประเภทเงินเดือน + ยอด (id, salary_type, salary_monthly, salary_daily)
   ─ Sheet "work_entry"      : บันทึกการทำงาน
   ─ Sheet "ot_setting"      : ตั้งค่า OT
   ═══════════════════════════════════════════════════════════════════════════════ */

// ── CONFIG ────────────────────────────────────────────────────────────────────
// *** เปลี่ยน SPREADSHEET_ID เป็น ID ของ Google Sheet ที่คุณสร้าง ***
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ── INIT: สร้าง Headers ใน Sheets ──────────────────────────────────────────────
function initSheets() {
  const ss = getSpreadsheet();

  const schemas = {
    user: [
      'email', 'salary_id', 'ot_hourly', 'working_hour',
      'ot_setting_id', 'sick_leave_day', 'personal_leave_day', 'annual_leave_day',
      'work_days_per_week'
    ],
    salary_setting: [
      'id', 'salary_type', 'salary_monthly', 'salary_daily'
    ],
    work_entry: [
      'work_entry_id', 'date', 'month_num', 'year_num',
      'clock_in', 'clock_out', 'leave_type', 'working_hour',
      'ot_hour', 'ot_earning', 'user_email'
    ],
    ot_setting: [
      'ot_setting_id', 'ot_mode', 'ot_block_hours', 'ot_deduct_mins'
    ],
  };

  Object.entries(schemas).forEach(([sheetName, headers]) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    // เขียน header ถ้า row 1 ยังว่าง
    const firstCell = sheet.getRange(1, 1).getValue();
    if (!firstCell) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#E8EAEF');
      sheet.setFrozenRows(1);
    }
  });

  return { success: true, message: 'Sheets initialized with headers' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEB APP ENTRY POINTS
// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ CORS FIX: ทุก action ถูก route ผ่าน doGet เพราะ POST → 302 redirect
//    ทำให้ browser เปลี่ยนเป็น GET → body หาย → CORS error
//    Frontend จึงส่งทุกอย่างผ่าน GET โดย encode data ใน URL parameter

function doGet(e) {
  const action = (e.parameter.action || '').trim();
  
  // Parse data จาก URL parameter (JSON string)
  let data = {};
  try {
    if (e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    }
  } catch (_) {
    data = {};
  }
  
  // Merge: ถ้ามี parameter แยก (เช่น ?email=xxx) ให้ merge เข้า data
  if (!data.email && e.parameter.email) data.email = e.parameter.email;
  if (!data.ot_setting_id && e.parameter.ot_setting_id) data.ot_setting_id = e.parameter.ot_setting_id;
  if (!data.month && e.parameter.month) data.month = e.parameter.month;
  if (!data.year && e.parameter.year) data.year = e.parameter.year;
  
  let result;

  try {
    switch (action) {
      // ── User READ ──
      case 'getUser':
        result = getUser(data.email);
        break;
      case 'getAllUsers':
        result = getAllUsers();
        break;

      // ── User WRITE ──
      case 'createUser':
        result = createUser(data);
        break;
      case 'updateUser':
        result = updateUser(data);
        break;
      case 'upsertUser':
        result = upsertUser(data);
        break;
      case 'deleteUser':
        result = deleteUser(data.email);
        break;

      // ── Work Entry READ ──
      case 'getWorkEntries':
        result = getWorkEntries(data.email);
        break;
      case 'getWorkEntriesByMonth':
        result = getWorkEntriesByMonth(
          data.email,
          Number(data.month),
          Number(data.year)
        );
        break;

      // ── Work Entry WRITE ──
      case 'createWorkEntry':
        result = createWorkEntry(data);
        break;
      case 'updateWorkEntry':
        result = updateWorkEntry(data);
        break;
      case 'upsertWorkEntry':
        result = upsertWorkEntry(data);
        break;
      case 'deleteWorkEntry':
        result = deleteWorkEntry(data.work_entry_id);
        break;

      // ── OT Setting ──
      case 'getOtSetting':
        result = getOtSetting(data.ot_setting_id);
        break;
      case 'createOtSetting':
        result = createOtSetting(data);
        break;
      case 'updateOtSetting':
        result = updateOtSetting(data);
        break;

      // ── Holidays ──
      case 'getHolidays':
        result = getHolidays(data);
        break;
      case 'toggleHoliday':
        result = toggleHoliday(data);
        break;

      // ── Init ──
      case 'initSheets':
        result = initSheets();
        break;
      case 'migrateLegacySalary':
        result = migrateLegacySalaryToSalarySetting();
        break;

      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// doPost ยังคงเก็บไว้เป็น fallback แต่ Frontend ใช้ doGet เท่านั้น
function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (_) {
    body = e.parameter || {};
  }

  const action = (body.action || e.parameter.action || '').trim();
  const data = body.data || body;
  
  // Redirect ไปใช้ doGet logic เดียวกัน
  const fakeEvent = { parameter: { action: action, data: JSON.stringify(data) } };
  return doGet(fakeEvent);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * แปลง Sheet data เป็น Array of Objects
 * ⚠️ Google Sheets เก็บ Date/Time เป็น Date object
 *    ต้อง serialize ก่อนส่ง JSON กลับ
 */
function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  // Columns ที่เป็นเวลา → format เป็น HH:mm
  const timeColumns = ['clock_in', 'clock_out'];
  // Columns ที่เป็นวันที่ → format เป็น YYYY-MM-DD
  const dateColumns = ['date'];
  
  const rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    headers.forEach(function(h, j) {
      var val = data[i][j];
      
      // ถ้าเป็น Date object → serialize
      if (val instanceof Date) {
        if (timeColumns.indexOf(h) !== -1) {
          // Time column → "HH:mm"
          var hh = String(val.getHours()).length < 2 ? '0' + val.getHours() : String(val.getHours());
          var mm = String(val.getMinutes()).length < 2 ? '0' + val.getMinutes() : String(val.getMinutes());
          val = hh + ':' + mm;
        } else if (dateColumns.indexOf(h) !== -1) {
          // Date column → "YYYY-MM-DD"
          var yyyy = val.getFullYear();
          var mo = String(val.getMonth() + 1).length < 2 ? '0' + (val.getMonth() + 1) : String(val.getMonth() + 1);
          var dd = String(val.getDate()).length < 2 ? '0' + val.getDate() : String(val.getDate());
          val = yyyy + '-' + mo + '-' + dd;
        } else {
          // Other Date columns → ISO string
          val = val.toISOString();
        }
      }
      
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * หา row number (1-indexed) จาก key column และ value
 * คืนค่า -1 ถ้าไม่เจอ
 */
function findRowByKey(sheetName, keyColumn, keyValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return -1;

  const headers = data[0];
  const colIdx = headers.indexOf(keyColumn);
  if (colIdx === -1) return -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(keyValue)) {
      return i + 1; // Sheet rows are 1-indexed
    }
  }
  return -1;
}

/**
 * สร้าง unique ID ด้วย timestamp + random
 */
function generateId(prefix) {
  const ts = new Date().getTime();
  const rand = Math.floor(Math.random() * 10000);
  return (prefix || 'id') + '_' + ts + '_' + rand;
}

/**
 * ดึง header columns ของ sheet
 */
function getHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SALARY SETTING (แยกจาก user — user เก็บแค่ salary_id)
//  salary_type = 'monthly' | 'daily' (ตรงกับ payment_type ฝั่ง frontend)
// ═══════════════════════════════════════════════════════════════════════════════

function createSalarySettingRow(sal) {
  const sheet = getSheet('salary_setting');
  const headers = getHeaders('salary_setting');
  if (headers.length === 0 || headers.indexOf('id') === -1) {
    initSheets();
  }
  const h2 = getHeaders('salary_setting');
  const row = h2.map(function (col) {
    if (col === 'id') return sal.id;
    if (col === 'salary_type') return sal.salary_type || 'monthly';
    if (col === 'salary_monthly') return Number(sal.salary_monthly) || 0;
    if (col === 'salary_daily') return Number(sal.salary_daily) || 0;
    return '';
  });
  sheet.appendRow(row);
}

function updateSalarySettingRow(salaryId, patch) {
  const rowNum = findRowByKey('salary_setting', 'id', salaryId);
  if (rowNum === -1) return false;
  const sheet = getSheet('salary_setting');
  const headers = getHeaders('salary_setting');
  const currentRow = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const obj = {};
  headers.forEach(function (h, i) {
    obj[h] = currentRow[i];
  });
  if (patch.salary_type !== undefined && patch.salary_type !== null) obj.salary_type = patch.salary_type;
  if (patch.salary_monthly !== undefined && patch.salary_monthly !== null) obj.salary_monthly = Number(patch.salary_monthly);
  if (patch.salary_daily !== undefined && patch.salary_daily !== null) obj.salary_daily = Number(patch.salary_daily);
  const newRow = headers.map(function (h) {
    return obj[h];
  });
  sheet.getRange(rowNum, 1, 1, headers.length).setValues([newRow]);
  return true;
}

/** รวมฟิลด์เงินเดือนเข้า object user สำหรับส่งให้ frontend (payment_type / salary_monthly / daily_rate) */
function expandUserWithSalary(user) {
  if (!user) return user;
  var sid = user.salary_id;
  if (sid === undefined || sid === null || String(sid).trim() === '') return user;

  var rows = sheetToObjects('salary_setting');
  var sal = rows.find(function (r) {
    return String(r.id) === String(sid);
  });
  if (sal) {
    user.payment_type = sal.salary_type;
    user.salary_monthly = sal.salary_monthly;
    user.daily_rate = sal.salary_daily;
  }
  return user;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER CRUD
// ═══════════════════════════════════════════════════════════════════════════════

function getUser(email) {
  if (!email) return { success: false, error: 'email is required' };

  const users = sheetToObjects('user');
  const user = users.find(u => String(u.email) === String(email));

  if (!user) return { success: false, error: 'User not found' };
  expandUserWithSalary(user);
  return { success: true, data: user };
}

function getAllUsers() {
  const users = sheetToObjects('user');
  users.forEach(function (u) {
    expandUserWithSalary(u);
  });
  return { success: true, data: users };
}

function createUser(data) {
  if (!data || !data.email) {
    return { success: false, error: 'email is required' };
  }

  // ตรวจสอบ duplicate
  const existing = findRowByKey('user', 'email', data.email);
  if (existing !== -1) {
    return { success: false, error: 'User with this email already exists' };
  }

  const sheet = getSheet('user');
  const headers = getHeaders('user');
  const hasSidCol = headers.indexOf('salary_id') !== -1;

  var salaryId = '';
  if (hasSidCol) {
    getSheet('salary_setting');
    if (getHeaders('salary_setting').length === 0) initSheets();
    salaryId = generateId('SAL');
    createSalarySettingRow({
      id: salaryId,
      salary_type: data.payment_type || 'monthly',
      salary_monthly: data.salary_monthly !== undefined && data.salary_monthly !== null ? Number(data.salary_monthly) : 0,
      salary_daily: data.daily_rate !== undefined && data.daily_rate !== null ? Number(data.daily_rate) : 0
    });
  }

  const row = headers.map(function (h) {
    if (h === 'salary_id') return salaryId;
    // โหมดใหม่: ไม่เก็บเงินเดือนซ้ำใน user
    if (hasSidCol && (h === 'salary_monthly' || h === 'payment_type' || h === 'daily_rate')) return '';

    if (data[h] !== undefined && data[h] !== null) return data[h];
    // Default values
    if (h === 'salary_monthly') return 0;
    if (h === 'ot_hourly') return 0;
    if (h === 'working_hour') return 8;
    if (h === 'sick_leave_day') return 30;
    if (h === 'personal_leave_day') return 6;
    if (h === 'annual_leave_day') return 10;
    if (h === 'payment_type') return 'monthly';
    if (h === 'daily_rate') return 0;
    if (h === 'work_days_per_week') return 5;
    return '';
  });

  sheet.appendRow(row);

  var out = Object.assign({}, data);
  if (salaryId) out.salary_id = salaryId;
  expandUserWithSalary(out);
  return { success: true, data: out, message: 'User created' };
}

function updateUser(data) {
  if (!data || !data.email) {
    return { success: false, error: 'email is required' };
  }

  const rowNum = findRowByKey('user', 'email', data.email);
  if (rowNum === -1) {
    return { success: false, error: 'User not found' };
  }

  const sheet = getSheet('user');
  const headers = getHeaders('user');
  const currentRow = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];

  const idxSid = headers.indexOf('salary_id');
  var salaryId = idxSid !== -1 ? String(currentRow[idxSid] || '').trim() : '';

  var patchSalary = {};
  if (data.salary_monthly !== undefined && data.salary_monthly !== null) {
    patchSalary.salary_monthly = data.salary_monthly;
  }
  if (data.daily_rate !== undefined && data.daily_rate !== null) {
    patchSalary.salary_daily = data.daily_rate;
  }
  if (data.payment_type !== undefined && data.payment_type !== null) {
    patchSalary.salary_type = data.payment_type;
  }
  var hasSalaryPatch = Object.keys(patchSalary).length > 0;

  if (hasSalaryPatch) {
    if (idxSid !== -1) {
      getSheet('salary_setting');
      if (getHeaders('salary_setting').length === 0) initSheets();

      if (!salaryId) {
        salaryId = generateId('SAL');
        createSalarySettingRow({
          id: salaryId,
          salary_type: data.payment_type !== undefined && data.payment_type !== null ? data.payment_type : 'monthly',
          salary_monthly: data.salary_monthly !== undefined && data.salary_monthly !== null ? Number(data.salary_monthly) : 0,
          salary_daily: data.daily_rate !== undefined && data.daily_rate !== null ? Number(data.daily_rate) : 0
        });
      } else {
        var ok = updateSalarySettingRow(salaryId, patchSalary);
        if (!ok) {
          createSalarySettingRow({
            id: salaryId,
            salary_type: data.payment_type || 'monthly',
            salary_monthly: data.salary_monthly !== undefined ? Number(data.salary_monthly) : 0,
            salary_daily: data.daily_rate !== undefined ? Number(data.daily_rate) : 0
          });
        }
      }
    }
  }

  const updatedRow = headers.map(function (h, i) {
    if (h === 'salary_id') {
      if (hasSalaryPatch && idxSid !== -1 && salaryId) return salaryId;
      return (data.salary_id !== undefined && data.salary_id !== null) ? data.salary_id : currentRow[i];
    }
    if (idxSid !== -1 && salaryId && (h === 'salary_monthly' || h === 'payment_type' || h === 'daily_rate')) {
      return '';
    }
    return (data[h] !== undefined && data[h] !== null) ? data[h] : currentRow[i];
  });

  sheet.getRange(rowNum, 1, 1, headers.length).setValues([updatedRow]);
  return { success: true, message: 'User updated' };
}

function deleteUser(email) {
  if (!email) return { success: false, error: 'email is required' };

  const rowNum = findRowByKey('user', 'email', email);
  if (rowNum === -1) {
    return { success: false, error: 'User not found' };
  }

  const sheet = getSheet('user');
  sheet.deleteRow(rowNum);
  return { success: true, message: 'User deleted' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WORK ENTRY CRUD
// ═══════════════════════════════════════════════════════════════════════════════

function getWorkEntries(email) {
  if (!email) return { success: false, error: 'email is required' };

  const entries = sheetToObjects('work_entry');
  const filtered = entries.filter(e => String(e.user_email) === String(email));
  return { success: true, data: filtered };
}

function getWorkEntriesByMonth(email, month, year) {
  if (!email) return { success: false, error: 'email is required' };

  const entries = sheetToObjects('work_entry');
  const filtered = entries.filter(e =>
    String(e.user_email) === String(email) &&
    Number(e.month_num) === month &&
    Number(e.year_num) === year
  );
  return { success: true, data: filtered };
}

function createWorkEntry(data) {
  if (!data || !data.user_email) {
    return { success: false, error: 'user_email is required' };
  }

  const sheet = getSheet('work_entry');
  const headers = getHeaders('work_entry');

  // Auto-generate ID ถ้ายังไม่มี
  if (!data.work_entry_id) {
    data.work_entry_id = generateId('WE');
  }

  // Auto-fill month_num / year_num จาก date ถ้ามี
  if (data.date && (!data.month_num || !data.year_num)) {
    const d = new Date(data.date);
    data.month_num = data.month_num || (d.getMonth() + 1);
    data.year_num = data.year_num || d.getFullYear();
  }

  const row = headers.map(h => {
    if (data[h] !== undefined && data[h] !== null) return data[h];
    return '';
  });

  sheet.appendRow(row);
  return { success: true, data: { work_entry_id: data.work_entry_id }, message: 'Work entry created' };
}

function updateWorkEntry(data) {
  if (!data || !data.work_entry_id) {
    return { success: false, error: 'work_entry_id is required' };
  }

  const rowNum = findRowByKey('work_entry', 'work_entry_id', data.work_entry_id);
  if (rowNum === -1) {
    return { success: false, error: 'Work entry not found' };
  }

  const sheet = getSheet('work_entry');
  const headers = getHeaders('work_entry');

  const currentRow = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const updatedRow = headers.map((h, i) => {
    return (data[h] !== undefined && data[h] !== null) ? data[h] : currentRow[i];
  });

  sheet.getRange(rowNum, 1, 1, headers.length).setValues([updatedRow]);
  return { success: true, message: 'Work entry updated' };
}

function deleteWorkEntry(workEntryId) {
  if (!workEntryId) return { success: false, error: 'work_entry_id is required' };

  const rowNum = findRowByKey('work_entry', 'work_entry_id', workEntryId);
  if (rowNum === -1) {
    return { success: false, error: 'Work entry not found' };
  }

  const sheet = getSheet('work_entry');
  sheet.deleteRow(rowNum);
  return { success: true, message: 'Work entry deleted' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OT SETTING CRUD
// ═══════════════════════════════════════════════════════════════════════════════

function getOtSetting(otSettingId) {
  if (!otSettingId) return { success: false, error: 'ot_setting_id is required' };

  const settings = sheetToObjects('ot_setting');
  const setting = settings.find(s => String(s.ot_setting_id) === String(otSettingId));

  if (!setting) return { success: false, error: 'OT Setting not found' };
  return { success: true, data: setting };
}

function createOtSetting(data) {
  if (!data) return { success: false, error: 'data is required' };

  const sheet = getSheet('ot_setting');
  const headers = getHeaders('ot_setting');

  // Auto-generate ID
  if (!data.ot_setting_id) {
    data.ot_setting_id = generateId('OTS');
  }

  const row = headers.map(h => {
    if (data[h] !== undefined && data[h] !== null) return data[h];
    // Defaults
    if (h === 'ot_mode') return 'hourly';
    if (h === 'ot_block_hours') return 2;
    if (h === 'ot_deduct_mins') return 30;
    return '';
  });

  sheet.appendRow(row);
  return { success: true, data: { ot_setting_id: data.ot_setting_id }, message: 'OT Setting created' };
}

function updateOtSetting(data) {
  if (!data || !data.ot_setting_id) {
    return { success: false, error: 'ot_setting_id is required' };
  }

  const rowNum = findRowByKey('ot_setting', 'ot_setting_id', data.ot_setting_id);
  if (rowNum === -1) {
    return { success: false, error: 'OT Setting not found' };
  }

  const sheet = getSheet('ot_setting');
  const headers = getHeaders('ot_setting');

  const currentRow = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const updatedRow = headers.map((h, i) => {
    return (data[h] !== undefined && data[h] !== null) ? data[h] : currentRow[i];
  });

  sheet.getRange(rowNum, 1, 1, headers.length).setValues([updatedRow]);
  return { success: true, message: 'OT Setting updated' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UPSERT HELPERS (สะดวกสำหรับ Frontend)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upsert Work Entry — ถ้ามี entry สำหรับ user+date อยู่แล้ว จะ update
 *                      ถ้าไม่มี จะ create ใหม่
 * ส่ง data.user_email + data.date เป็น composite key
 */
function upsertWorkEntry(data) {
  if (!data || !data.user_email || !data.date) {
    return { success: false, error: 'user_email and date are required' };
  }

  // หา existing entry ด้วย user_email + date
  const entries = sheetToObjects('work_entry');
  const existing = entries.find(e =>
    String(e.user_email) === String(data.user_email) &&
    String(e.date) === String(data.date)
  );

  if (existing) {
    data.work_entry_id = existing.work_entry_id;
    return updateWorkEntry(data);
  } else {
    return createWorkEntry(data);
  }
}

/**
 * Upsert User — ถ้ามี user อยู่แล้ว จะ update, ถ้าไม่มี จะ create
 */
function upsertUser(data) {
  if (!data || !data.email) {
    return { success: false, error: 'email is required' };
  }

  const rowNum = findRowByKey('user', 'email', data.email);
  if (rowNum !== -1) {
    return updateUser(data);
  } else {
    return createUser(data);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HOLIDAYS
// ═══════════════════════════════════════════════════════════════════════════════

function getHolidays(data) {
  try {
    var email = data.email;
    if (!email) return { success: false, error: 'email is required' };

    var sheet = getSheet('holidays');
    
    // Create Header if empty
    var firstCell = sheet.getRange(1, 1).getValue();
    if (!firstCell) {
      sheet.getRange(1, 1, 1, 3).setValues([["email", "date", "update_at"]]);
      sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#EEF0FD");
      return { success: true, data: [] };
    }

    var records = sheet.getDataRange().getValues();
    var userHolidays = [];
    
    if (records.length > 1) {
      for (var i = 1; i < records.length; i++) {
        if (records[i][0] === email && records[i][1]) {
          var val = records[i][1];
          if (val instanceof Date) {
            var yyyy = val.getFullYear();
            var mo = String(val.getMonth() + 1).padStart(2, '0');
            var dd = String(val.getDate()).padStart(2, '0');
            val = yyyy + '-' + mo + '-' + dd;
          } else {
            val = String(val).split('T')[0];
          }
          userHolidays.push(val);
        }
      }
    }

    return { success: true, data: userHolidays };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function toggleHoliday(data) {
  try {
    var email = data.email;
    var dateStr = data.date;
    var isHoliday = data.isHoliday;
    
    if (!email || !dateStr) return { success: false, error: 'email and date are required' };

    var sheet = getSheet('holidays');
    
    var firstCell = sheet.getRange(1, 1).getValue();
    if (!firstCell) {
      sheet.getRange(1, 1, 1, 3).setValues([["email", "date", "update_at"]]);
      sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#EEF0FD");
    }

    var records = sheet.getDataRange().getValues();
    var foundRowIndex = -1;

    if (records.length > 1) {
      for (var i = 1; i < records.length; i++) {
        var val = records[i][1];
        if (val instanceof Date) {
          var yyyy = val.getFullYear();
          var mo = String(val.getMonth() + 1).padStart(2, '0');
          var dd = String(val.getDate()).padStart(2, '0');
          val = yyyy + '-' + mo + '-' + dd;
        } else {
          val = String(val).split('T')[0];
        }

        if (records[i][0] === email && val === dateStr) {
          foundRowIndex = i + 1;
          break;
        }
      }
    }

    if (isHoliday) {
      if (foundRowIndex === -1) {
        var now = new Date();
        // Insert as format "YYYY-MM-DD" so Sheets doesn't act weird with dates if requested. 
        // Force string representation to avoid timezone shifts.
        sheet.appendRow([email, "'" + dateStr, now]);
      }
    } else {
      if (foundRowIndex !== -1) {
        sheet.deleteRow(foundRowIndex);
      }
    }

    return { success: true, message: isHoliday ? "Holiday added" : "Holiday removed" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ย้ายข้อมูลเงินเดือนจากคอลัมน์เก่า (salary_monthly / payment_type / daily_rate) ไป salary_setting
 * รันใน Apps Script editor: เลือก migrateLegacySalaryToSalarySetting แล้ว Run
 * หรือเรียก ?action=migrateLegacySalary (หลัง deploy)
 *
 * เงื่อนไข: ต้องมี sheet salary_setting + คอลัมน์ salary_id ใน user แล้ว
 */
function migrateLegacySalaryToSalarySetting() {
  var headers = getHeaders('user');
  var idxEmail = headers.indexOf('email');
  var idxSid = headers.indexOf('salary_id');
  if (idxEmail === -1) return { success: false, error: 'user sheet: missing email column' };
  if (idxSid === -1) {
    return { success: false, error: 'Add column salary_id to user sheet, then run initSheets or create salary_setting sheet' };
  }

  getSheet('salary_setting');
  if (getHeaders('salary_setting').length === 0) initSheets();

  var sheet = getSheet('user');
  var data = sheet.getDataRange().getValues();
  var migrated = 0;

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var sid = String(row[idxSid] || '').trim();
    if (sid) continue;

    var email = row[idxEmail];
    if (!email) continue;

    var userObj = {};
    headers.forEach(function (h, j) {
      userObj[h] = row[j];
    });

    var pt = userObj.payment_type || 'monthly';
    var sm = userObj.salary_monthly !== undefined && userObj.salary_monthly !== '' ? Number(userObj.salary_monthly) : 0;
    var dr = userObj.daily_rate !== undefined && userObj.daily_rate !== '' ? Number(userObj.daily_rate) : 0;

    var newId = generateId('SAL');
    createSalarySettingRow({ id: newId, salary_type: pt, salary_monthly: sm, salary_daily: dr });

    var newRow = row.slice();
    newRow[idxSid] = newId;
    var idxSm = headers.indexOf('salary_monthly');
    var idxPt = headers.indexOf('payment_type');
    var idxDr = headers.indexOf('daily_rate');
    if (idxSm !== -1) newRow[idxSm] = '';
    if (idxPt !== -1) newRow[idxPt] = '';
    if (idxDr !== -1) newRow[idxDr] = '';

    sheet.getRange(r + 1, 1, 1, headers.length).setValues([newRow]);
    migrated++;
  }

  return { success: true, migrated: migrated, message: 'Migrated ' + migrated + ' user row(s) to salary_setting' };
}
