# 📋 วิธีตั้งค่า TimeFlow Backend (Google Apps Script)

## ขั้นตอนที่ 1: สร้าง Google Sheet

1. ไปที่ [Google Sheets](https://sheets.google.com) แล้วสร้าง Spreadsheet ใหม่
2. ตั้งชื่อเช่น **"TimeFlow Database"**
3. **คัดลอก Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/【SPREADSHEET_ID_อยู่ตรงนี้】/edit
   ```

---

## ขั้นตอนที่ 2: สร้าง Google Apps Script

1. ไปที่ [Google Apps Script](https://script.google.com)
2. คลิก **"New project"**
3. ตั้งชื่อ Project เช่น **"TimeFlow Backend"**
4. **ลบ code ทั้งหมด** ใน `Code.gs` แล้ว **วาง code** จากไฟล์ `Code.gs` ในโฟลเดอร์ `google-apps-script/`
5. **แก้ไข `SPREADSHEET_ID`** ที่บรรทัดบนสุด:
   ```javascript
   const SPREADSHEET_ID = 'ใส่_ID_จากขั้นตอนที่_1';
   ```

---

## ขั้นตอนที่ 3: รัน initSheets()

1. ในเมนูด้านบน เลือกฟังก์ชัน **`initSheets`** จาก dropdown
2. คลิก **▶ Run**
3. อนุญาต permissions ที่ถูกร้องขอ
4. กลับไปดู Google Sheet → ควรมี Sheet: `user`, `salary_setting`, `work_entry`, `ot_setting` พร้อม headers

### ฐานข้อมูลเงินเดือน (`salary_setting`)

- Sheet **`salary_setting`**: คอลัมน์ `id`, `salary_type` (เช่น `monthly` / `daily`), `salary_monthly`, `salary_daily`
- Sheet **`user`**: เก็บ **`salary_id`** อ้างอิงแถวใน `salary_setting` — เมื่อแก้เงินเดือนจากแอป ระบบจะอัปเดตแถวตาม `id` นั้น
- แอปยังส่ง/รับ `payment_type`, `salary_monthly`, `daily_rate` เหมือนเดิม; backend รวมให้จาก `salary_setting`

### ถ้ามี Sheet แบบเก่า (user มี `salary_monthly` แต่ยังไม่มี `salary_id`)

1. เพิ่มคอลัมน์ **`salary_id`** ใน sheet `user` (และสร้าง sheet `salary_setting` + รัน `initSheets` ถ้ายังไม่มี)
2. รันฟังก์ชัน **`migrateLegacySalaryToSalarySetting`** ใน Apps Script editor (หรือเรียก `?action=migrateLegacySalary` หลัง deploy) เพื่อย้ายข้อมูลแต่ละแถวไป `salary_setting` และเติม `salary_id`

---

## ขั้นตอนที่ 4: Deploy เป็น Web App

1. คลิก **Deploy → New deployment**
2. คลิกไอคอน ⚙ เลือก **Web app**
3. ตั้งค่า:
   - **Description**: `TimeFlow API v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. คลิก **Deploy**
5. คัดลอก **Web app URL** ที่ได้

---

## ขั้นตอนที่ 5: เชื่อมต่อ Frontend

เพิ่ม URL ในไฟล์ `.env` ของ project:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxxxx/exec
```

---

## 📖 วิธีใช้งาน API

### GET Requests (ดึงข้อมูล)

เรียกผ่าน URL + query parameters:

```
GET {URL}?action=getUser&email=user@example.com
GET {URL}?action=getWorkEntries&email=user@example.com
GET {URL}?action=getWorkEntriesByMonth&email=user@example.com&month=3&year=2026
GET {URL}?action=getOtSetting&ot_setting_id=OTS_123
GET {URL}?action=initSheets
```

### POST Requests (สร้าง/แก้ไข/ลบ)

ส่ง JSON body:

```javascript
// สร้าง User
fetch(URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'createUser',
    data: {
      email: 'user@example.com',
      salary_monthly: 25000,
      ot_hourly: 150,
      working_hour: 8,
      sick_leave_day: 30,
      personal_leave_day: 6,
      annual_leave_day: 10
    }
  })
});

// บันทึก Work Entry
fetch(URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'createWorkEntry',
    data: {
      user_email: 'user@example.com',
      date: '2026-03-25',
      clock_in: '08:30',
      clock_out: '18:00',
      working_hour: 8,
      ot_hour: 1.5,
      ot_earning: 225
    }
  })
});

// ลบ Work Entry
fetch(URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'deleteWorkEntry',
    data: { work_entry_id: 'WE_123456_7890' }
  })
});
```

### Response Format

ทุก endpoint จะตอบกลับเป็น JSON:

```json
// ✅ สำเร็จ
{ "success": true, "data": { ... }, "message": "..." }

// ❌ ผิดพลาด
{ "success": false, "error": "error message here" }
```

---

## 🔄 Upsert (สร้างหรืออัปเดตอัตโนมัติ)

`Code.gs` มี helper functions สำหรับ upsert:

- **`upsertUser(data)`** — ถ้า email มีอยู่แล้ว = update, ไม่มี = create
- **`upsertWorkEntry(data)`** — ใช้ `user_email` + `date` เป็น key ถ้ามี entry อยู่แล้ว = update

> **หมายเหตุ**: ฟังก์ชัน upsert ใช้ได้ภายใน Apps Script เท่านั้น (เรียกจาก doPost ได้โดยเพิ่ม case ใน switch)

---

## ⚠️ สิ่งที่ต้องรู้

- **Rate Limit**: Google Apps Script มี quota ~20,000 requests/day (free tier)
- **CORS**: เนื่องจากเป็น Web App → ต้องใช้ `mode: 'no-cors'` หรือ redirect mode
- **Response time**: อาจช้ากว่าปกติ (~1-3 วินาที) เนื่องจากเป็น serverless
- **Re-deploy**: หลังแก้ไข code ต้อง deploy ใหม่ทุกครั้ง (Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy)
