-- ═══════════════════════════════════════════════════════════════════════════
--  Migration: เปลี่ยนชื่อคอลัมน์ OT tier จาก _2 → _1
--  (ช่วง "วันหยุด 8 ชม.แรก" เปลี่ยนเรตจาก 2 เท่า → 1 เท่า จึงเปลี่ยนชื่อให้ตรง)
--  รันไฟล์นี้ใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── work_entry ──
ALTER TABLE work_entry RENAME COLUMN ot_hour_2    TO ot_hour_1;
ALTER TABLE work_entry RENAME COLUMN ot_earning_2 TO ot_earning_1;

-- ── monthly_summary ──
ALTER TABLE monthly_summary RENAME COLUMN total_ot_hour_2    TO total_ot_hour_1;
ALTER TABLE monthly_summary RENAME COLUMN total_ot_earning_2 TO total_ot_earning_1;

-- ── yearly_summary ──
ALTER TABLE yearly_summary RENAME COLUMN total_ot_hour_2    TO total_ot_hour_1;
ALTER TABLE yearly_summary RENAME COLUMN total_ot_earning_2 TO total_ot_earning_1;
