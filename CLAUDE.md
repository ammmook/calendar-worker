# CLAUDE.md

ไฟล์นี้เป็นบริบทที่ Claude Code อ่านอัตโนมัติทุกครั้งที่เปิดโปรเจกต์นี้
เก็บเฉพาะสิ่งที่ "จริงและถาวร" — ถ้าอะไรเปลี่ยน ให้แก้ไฟล์นี้ด้วย

---

## ภาพรวมโปรเจกต์ (TimeFlow)

เว็บแอปบันทึกเวลาทำงาน + คำนวณเงินเดือน/OT/เบี้ยกะ รองรับ 2 ภาษา (ไทย/อังกฤษ)

- **Stack:** React 19 + Vite 8 + Tailwind CSS 4
- **Backend:** ต่อ Supabase ตรงจากฝั่ง client (ไม่มี server กลาง)
  - `src/services/supabaseClient.js` สร้าง client จาก env (`persistSession`/`autoRefreshToken`/`detectSessionInUrl`/`flowType:'pkce'` เปิดไว้สำหรับ Supabase Auth)
  - `src/services/api.js` คือ data + business-logic layer ทั้งหมด
- **Auth:** ใช้ **Supabase Auth (Google provider)** — ไม่ใช่ `@react-oauth/google` แล้ว
  - `AuthContext.jsx` ใช้ `supabase.auth.getSession()` + `onAuthStateChange` ; `signInWithGoogle()` = `signInWithOAuth({provider:'google', redirectTo: window.location.origin})` ; `signOut()` = `supabase.auth.signOut()` ; map user จาก `user_metadata`
  - `LoginPage.jsx` เรียก `signInWithGoogle()` ; `main.jsx` ไม่มี `GoogleOAuthProvider` แล้ว
  - **ยังไม่ได้ใช้แล้ว:** dependency `@react-oauth/google` + env `VITE_GOOGLE_CLIENT_ID` (Client ID ย้ายไปตั้งค่าฝั่ง Supabase Dashboard แทน)
- โฟลเดอร์ `google-apps-script/` เป็น backend **เก่า (เลิกใช้แล้ว)** — เก็บไว้อ้างอิง/เก็บ SQL migration เท่านั้น

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # dev server ที่ port 5175
npm run build    # production build (ใช้ตรวจว่าคอมไพล์ผ่าน)
npm test         # vitest — unit test สูตรคิดเงิน (src/utils/payCalc.test.js)
npm run lint     # eslint (มี error/warning เดิมค้างอยู่ ให้ดูเฉพาะที่เราเพิ่ม)
npm run preview  # preview build
```

> ยืนยันงานเสร็จด้วย `npm run build` + `npm test` เสมอ — แก้สูตรใน `payCalc.js` ต้องอัปเดต test ด้วย

## โครงสร้างไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|------|---------|
**Navigation:** มี **2 หน้า** เท่านั้น — `view`: `calendar` (Work Calendar) / `dashboard` ; หน้า dashboard มี **2 แท็บย่อย** `dashTab`: `monthly` (รายเดือน) / `yearly` (รายปี) ; เน้น **mobile-first**

| ไฟล์ | หน้าที่ |
|------|---------|
| `src/App.jsx` | shell + state/handler กลาง (auth, load, save/delete, previewCalc, LeaveSelector, toasts, haptic feedback) + topbar/sidebar + routing (`view` 2 ค่า + `dashTab` 2 ค่า) + `UserMenu`/`MenuItem` (ท้ายไฟล์) |
| `src/components/WorkCalendar.jsx` | หน้า **Work Calendar** (`view='calendar'`) = ปฏิทิน + panel/modal แก้ไขวัน + ปุ่ม Today + `DayCell` (รับ props จาก App) |
| `src/components/MonthlySummary.jsx` | แท็บ **รายเดือน** (`dashTab='monthly'`) — มี **3 แท็บย่อยในตัว** (`tab` state): **สรุปรายได้** (การ์ด 5 ใบ + OT แยกอัตราแบบแถว) / **กราฟ** (โดนัทรายได้+OT) / **รายการ** (Work Log ครบทุกวัน) ; เริ่มที่ 'summary' |
| `src/components/YearlyDashboard.jsx` | แท็บ **รายปี** (`dashTab='yearly'`) — มี **3 แท็บย่อย** เหมือนรายเดือน: **สรุปรายได้** (KPI + OT แถว + สรุปการลา) / **กราฟ** (โดนัท + กราฟแท่งแนวโน้มล่างสุด) / **รายการ** (Monthly Breakdown) |
| `src/components/charts.jsx` | `DonutChart` + `LegendRow` ใช้ร่วมกันทั้งหน้ารายเดือน/รายปี |
| `src/components/SkeletonLoader.jsx` | skeleton แยกตามหน้า: `SkeletonCalendarView` / `SkeletonMonthly` / `SkeletonYearly` / `SkeletonAuthLoading` |
| `src/components/AuthContext.jsx` | Supabase Auth (Google) — `useAuth()` คืน `{user, loading, error, signInWithGoogle, signOut}` |
| `src/components/LoginPage.jsx` | หน้า login (ปุ่ม Continue with Google → `signInWithGoogle()`) |
| `src/components/ProfilePage.jsx` | ตั้งค่า เงินเดือน (รายเดือน) / โควตาลา / เบี้ยกะ / ประกันสังคม (OT rate เป็นช่องอ่านอย่างเดียว คำนวณอัตโนมัติ) |
| `src/components/LeaveSelector.jsx` | modal เลือกสถานะ (ทำงาน/ลา) |
| `src/services/api.js` | ทุก query Supabase + คำนวณเงิน (`upsertWorkEntry`) + recalc summary |
| `src/locales.js` | ข้อความ 2 ภาษา (`TH`/`EN`) เรียกผ่าน `getLang(lang)` |

## ตาราง Supabase

`user`, `work_entry`, `monthly_summary`, `yearly_summary`, `holidays`, `public_holidays`

> เดิมมี `salary_setting` และ `ot_setting` — **ยกเลิกทั้งคู่แล้ว** ข้อมูลย้ายมาเก็บตรงในตาราง `user`

**คอลัมน์ระบุเจ้าของ (ใช้ทั้งใน api.js และ RLS policy):**
- `user`, `holidays` → คอลัมน์ **`email`**
- `work_entry`, `monthly_summary`, `yearly_summary` → คอลัมน์ **`user_email`**
- `public_holidays` → ข้อมูลกลาง ไม่มีเจ้าของ (อ่านอย่างเดียวจากเว็บ)

**RLS:** ✅ **เปิดแล้วทุกตาราง** (Supabase Auth แนบ JWT ให้ทุกคำขอ)
- **user, work_entry, monthly_summary, yearly_summary, holidays:** policy เดียว `for all to authenticated` แมตช์ `<คอลัมน์เจ้าของ> = (select auth.jwt() ->> 'email')` → user จัดการได้เฉพาะข้อมูลตัวเอง (ครอบคลุม select/insert/update/delete ; recalc summary ที่รันฝั่ง client ก็เขียนได้เพราะ user_email = email ตัวเอง)
- **public_holidays:** มีแค่ policy อ่าน `for select to authenticated using(true)` — เว็บเขียนไม่ได้ ต้องแก้ผ่าน SQL Editor / service role (ข้าม RLS)
- ชื่อ policy: `"<table> own rows"` (ตาราง user ใช้ `"user own row"`) ; ตาราง `user` ต้อง quote `public."user"` เพราะเป็น reserved word
- ถ้า insert/update พังด้วย `violates row-level security policy` = ค่า email/user_email ที่เขียนไม่ตรงกับ email ใน JWT

- `holidays` = วันหยุดที่ผู้ใช้กดเองรายคน (toggle) ; `public_holidays` = วันหยุดทางการ (global ทุกคน) มี `date`, `name_th`, `name_en` แสดงไอคอนปฏิทินสีแดง + ชื่อ (สลับภาษา) ที่มุมขวาช่องปฏิทิน + ตัวเลขวันที่/พื้นหลังเซลล์เป็นสีแดง

- **ตาราง `user`** เก็บทุกอย่างตรง ๆ (ไม่มี foreign key ไปตารางอื่นแล้ว):
  - `salary` (numeric) = เงินเดือนรายเดือน ; `ot_hourly` = base OT/ชม. ที่คำนวณอัตโนมัติ (`salary ÷ 30 ÷ 8`)
  - โควตาลา: `sick_leave_day`, `personal_leave_day`, `annual_leave_day`
  - `social_security` = ยอดหักประกันสังคม/เดือน
  - เบี้ยกะ: `shift_allowance`, `shift_start`, `shift_end`
  - รองรับ **เฉพาะรายเดือน** — ฝั่ง api normalize ให้ `payment_type='monthly'`, `daily_rate=0` เสมอ (ไม่มีคอลัมน์ `salary_id`, `ot_setting_id`, `working_hour`, `work_days_per_week` แล้ว)
- **`work_entry`** เก็บ OT แยกตามอัตรา: `ot_hour_15`/`ot_earning_15` (1.5x = วันปกติ), `ot_hour_1`/`ot_earning_1` (1x = วันหยุด 8 ชม.แรก), `ot_hour_3`/`ot_earning_3` (3x) — นอกเหนือจาก `ot_hour`/`ot_earning` (รวม)
- **`monthly_summary` / `yearly_summary`** เก็บผลรวมของ tier ข้างบนด้วย: `total_ot_hour_15`/`total_ot_earning_15` … (2/3 เช่นกัน)

## กติกาการคำนวณ (อยู่ใน `calcWorkDay` ของ `src/utils/payCalc.js` ที่เดียว — ทั้ง `upsertWorkEntry` ใน `api.js` และ `previewCalc` ใน `App.jsx` เรียกตัวเดียวกัน ; `api.js` ยังรับผิดชอบดึงข้อมูลวันหยุดจาก DB)

**ค่าพื้นฐาน**
- `std` = **8 ชม.คงที่** (ไม่มี input ให้แก้แล้ว)
- **base OT/ชม.** = `salary ÷ 30 ÷ 8` (เช่น 22,000 → 91.67) ; ถ้าไม่มีเงินเดือน fallback เป็น `ot_hourly` ที่เก็บไว้
- **หักพักเที่ยง 1 ชม.:** จากช่วงเวลารวมก่อนคิดทุกอย่าง → `netH = (ชั่วโมงรวม − 1)` (เช่น 9:00–18:00 = 9 ชม. → netH 8 = ปกติเต็ม, ไม่มี OT)

**วันปกติ**
- ชั่วโมงทำงานปกติ = `min(netH, 8)` ; ส่วนเกิน = `rawOT = netH − 8`
- เงิน OT = `netOT × 1.5 × base` โดยหักชั่วโมงตาม `rawOT` ที่ทำจริง:
  - `1–2 ชม.` คิดเต็ม ; `> 2 ชม.` หัก **30 นาที** ; `≥ 9 ชม.` หัก **1 ชม.** (block mode เดิม**เลิกใช้แล้ว**)

**วันนักขัตฤกษ์ (`public_holidays`)** — ทำงานวันนี้ **ยังได้ค่าแรงปกติ** (นับเป็นวันทำงาน `working_hour = min(netH,8)`) **+ บวก OT ทั้งวัน** (เริ่มคิดทันทีหลังเข้างาน):
  - 8 ชม.แรก = **1 เท่า** (`base × 1`, ไม่หัก) ; เลย 8 ชม. = **3 เท่า** (`base × 3`)
  - หักเฉพาะ**ส่วนโอที่เลย 8 ชม.** (`rawOT = netH − 8`) เหมือนวันปกติ: `> 2 ชม.` หัก **30 นาที** ; `≥ 9 ชม.` หัก **1 ชม.** (เช่น 9:00–21:00 → ทำโอ 3 ชม. → 2.5 ชม.)

**ข้ามเที่ยงคืน (ทำเกินวัน)** — เช็ค "วันถัดไป" (`date + 1`) ว่าเป็นนักขัตฤกษ์/วันหยุด(user) หรือไม่
- **วันปกติ → ตกนักขัตฤกษ์:** ช่วง**หลังเที่ยงคืน = ×3** ; ช่วงก่อนเที่ยงคืน = ×1.5
- **วันปกติ → ตกวันหยุด(user `holidays`):** ช่วงหลังเที่ยงคืน = **×3 ถ้าไม่มีกะ** / **×1.5 ถ้ามีกะ** (มีกะ = วันนั้นได้เบี้ยกะ = เข้างานตรง `shift_start` พอดี) ; ช่วงก่อนเที่ยงคืน = ×1.5
- **วันปกติ → ตกวันปกติ:** ×1.5 ทั้งหมด (ไม่แยกช่วง)
- **การหักเศษตอนแยกช่วง ×3:** ช่วงก่อน/หลังเที่ยงคืน **นับชั่วโมงแยกกัน ต่างคนต่างหัก** (แต่ละช่วงใช้กฎ `>2 หัก 30น. ; ≥9 หัก 1ชม.` ของตัวเอง) → ลง `ot_*_15` (ก่อน) + `ot_*_3` (หลัง)
- **วันนักขัตฤกษ์ → ตกวันปกติ:** **ยังคิดเรตวันหยุดต่อจนเลิกงาน** (ทั้งวันเลย 8 ชม. = ×3 อยู่แล้ว, ไม่ตัดที่เที่ยงคืน)

**OT แยก tier** — เก็บชั่วโมง/เงินแยกลง `work_entry` แล้วรวมขึ้น monthly/yearly summary ; `ot_hour`/`ot_earning` = ยอดรวม
  - `ot_*_15` = OT วันปกติ (1.5x) ; `ot_*_3` = 3x (วันหยุดเลย 8 ชม.)
  - `ot_*_1` = ช่วง**วันหยุด 8 ชม.แรก** (เรต **1x**)

**เบี้ยกะ** — ได้ `shift_allowance` เมื่อ `clock_in` **อยู่ในช่วงกะ** = `>= shift_start` และ **ยังไม่เกิน `shift_end`** (เข้าก่อนเวลาเริ่มกะ = ไม่ได้) ; รองรับกะข้ามคืน (เช่น 22:00–06:00 → ช่วง [เริ่ม, เที่ยงคืน] ∪ [เที่ยงคืน, จบ]) ; ถ้าไม่ตั้ง `shift_end` = เช็คแค่ `>= shift_start` ; ใช้ตรรกะร่วม `isWithinShift()` ทั้ง `api.js` + `previewCalc` ; ใช้ได้ทั้งวันปกติและวันหยุด ; บวกเข้า `total_earning` + รวมใน summary (`shift_days`, `total_shift_allowance`)

**อบรม (`leave_type = 'training'`)** — สถานะใน LeaveSelector (ทำงาน→อบรม→ลา) : ได้เงินปกติเต็มวัน (`working_hour = 8`), **ไม่มี OT / ไม่มีเบี้ยกะ / ไม่นับเป็นวันลา** ; ไอคอน `GraduationCap` สีดำ `#111827`

**ประกันสังคม (`social_security`)** — ยอดคงที่หักจากรายได้รวมของเดือน (เก็บใน `user`) — หักใน `recalcMonthlySummary` เมื่อเดือนนั้นมีข้อมูล + หักในการ์ด Total Earnings

- **snapshot เงินเดือน:** `monthly_summary` เก็บ `salary_snapshot` / `social_security_snapshot` — เดือนที่ผ่านมาแล้วใช้ค่า snapshot (แก้เงินเดือนทีหลังไม่ย้อนกระทบ) ; เดือนปัจจุบัน/อนาคตใช้ค่าปัจจุบันของ user แล้วเก็บ snapshot (migration: `monthly_summary_snapshot_migration.sql`)
- `work_entry` มี unique `(user_email, date)` และ `upsertWorkEntry` ใช้ `onConflict` (migration: `work_entry_unique_migration.sql`)
- `recalcMonthlySummary` / `recalcYearlySummary` ถูกเรียกทุกครั้งหลัง upsert/delete — สรุปจากข้อมูลใน DB ทั้งหมด ไม่ใช่แค่ที่โหลดมาแสดง
- **entry เดิมเป็นค่าเก่าจนกว่าจะเปิดแก้แล้วเซฟใหม่** (recalc ตอนนั้น) — เปลี่ยนสูตรแล้วของเก่าไม่ย้อนอัตโนมัติ

## ข้อควรระวัง (เจอมาแล้ว)

- คอลัมน์ชั่วโมง/เงินใน DB ต้องเป็น `numeric` ไม่ใช่ `bigint` — ไม่งั้น error `invalid input syntax for type bigint: "16.5"`
- แก้ schema Supabase ด้วยการรันไฟล์ `.sql` ใน `google-apps-script/` ผ่าน Supabase SQL Editor
- เพิ่มข้อความใหม่ต้องใส่ทั้ง `TH` และ `EN` ใน `locales.js` (มี key ซ้ำเดิมค้างอยู่ อย่าเพิ่มซ้ำ)
- สีมาตรฐาน: ปกติ `#3B4FE4` (คราม), OT `#c29302` (เหลืองอำพัน), เบี้ยกะ `#E8730C` (ส้มอ่อน), รายได้ `#10B981` (เขียว)
- **Auth/RLS:** ทุก query ต้องล็อกอินก่อน (JWT แนบ email) — ถ้าเปิด RLS แล้ว insert/update พังด้วย `violates row-level security policy` แปลว่าค่า `email`/`user_email` ที่เขียนไม่ตรงกับ email ใน JWT ; ตั้งค่า provider/redirect URL ที่ **Supabase Dashboard** (ไม่ใช่ในโค้ด)
- **Haptic feedback:** กด save/update/delete สำเร็จ = `VIBE_SUCCESS` + `.shake-strong` (สั่นที่ toast) ; toggle วันหยุด = `VIBE_HOLIDAY` + `.shake-soft` (สั่นที่ช่องวัน) — CSS shake อยู่ใน `index.css` เป็น fallback ให้ iOS/Safari ที่ไม่มี `navigator.vibrate`
- อย่า commit/push เว้นแต่ผู้ใช้สั่ง; `.env` มี secret ห้าม commit

## แนวทางที่อยากให้ทำ

- ทำตามคำสั่งที่ระบุเท่านั้น ไม่ทำเกินขอบเขต
- ถ้าคำสั่งกำกวมหรือกระทบผลลัพธ์การคำนวณ ให้ถามก่อนลงมือ
- แก้ให้ตรงสไตล์โค้ดเดิม (naming, Tailwind class, โครงสร้าง component)
