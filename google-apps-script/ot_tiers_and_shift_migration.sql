-- ═══════════════════════════════════════════════════════════════════════════
--  Migration: ย้ายเบี้ยกะเข้าตาราง user + เพิ่มคอลัมน์ OT แยกอัตรา (1.5 / 2 / 3)
--  รันไฟล์นี้ใน Supabase SQL Editor
--  หมายเหตุ: คอลัมน์ชั่วโมง/เงินต้องเป็น numeric (ห้าม bigint)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) ย้ายตั้งค่าเบี้ยกะเข้าตาราง user (แทน ot_setting เดิม) ──
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS shift_allowance numeric DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS shift_start     text    DEFAULT '';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS shift_end       text    DEFAULT '';

-- ── 2) OT แยกตามอัตรา (1.5 / 2 / 3 เท่า) — ต่อวัน (work_entry) ──
ALTER TABLE work_entry ADD COLUMN IF NOT EXISTS ot_hour_15    numeric DEFAULT 0;
ALTER TABLE work_entry ADD COLUMN IF NOT EXISTS ot_earning_15 numeric DEFAULT 0;
ALTER TABLE work_entry ADD COLUMN IF NOT EXISTS ot_hour_2     numeric DEFAULT 0;
ALTER TABLE work_entry ADD COLUMN IF NOT EXISTS ot_earning_2  numeric DEFAULT 0;
ALTER TABLE work_entry ADD COLUMN IF NOT EXISTS ot_hour_3     numeric DEFAULT 0;
ALTER TABLE work_entry ADD COLUMN IF NOT EXISTS ot_earning_3  numeric DEFAULT 0;

-- ── 3) OT แยกตามอัตรา — ต่อเดือน (monthly_summary) ──
ALTER TABLE monthly_summary ADD COLUMN IF NOT EXISTS total_ot_hour_15    numeric DEFAULT 0;
ALTER TABLE monthly_summary ADD COLUMN IF NOT EXISTS total_ot_earning_15 numeric DEFAULT 0;
ALTER TABLE monthly_summary ADD COLUMN IF NOT EXISTS total_ot_hour_2     numeric DEFAULT 0;
ALTER TABLE monthly_summary ADD COLUMN IF NOT EXISTS total_ot_earning_2  numeric DEFAULT 0;
ALTER TABLE monthly_summary ADD COLUMN IF NOT EXISTS total_ot_hour_3     numeric DEFAULT 0;
ALTER TABLE monthly_summary ADD COLUMN IF NOT EXISTS total_ot_earning_3  numeric DEFAULT 0;

-- ── 4) OT แยกตามอัตรา — ต่อปี (yearly_summary) ──
ALTER TABLE yearly_summary ADD COLUMN IF NOT EXISTS total_ot_hour_15    numeric DEFAULT 0;
ALTER TABLE yearly_summary ADD COLUMN IF NOT EXISTS total_ot_earning_15 numeric DEFAULT 0;
ALTER TABLE yearly_summary ADD COLUMN IF NOT EXISTS total_ot_hour_2     numeric DEFAULT 0;
ALTER TABLE yearly_summary ADD COLUMN IF NOT EXISTS total_ot_earning_2  numeric DEFAULT 0;
ALTER TABLE yearly_summary ADD COLUMN IF NOT EXISTS total_ot_hour_3     numeric DEFAULT 0;
ALTER TABLE yearly_summary ADD COLUMN IF NOT EXISTS total_ot_earning_3  numeric DEFAULT 0;

-- ── 5) เก็บกวาดของเก่า (ถ้ายังเหลืออยู่ — idempotent) ──
ALTER TABLE "user" DROP COLUMN IF EXISTS working_hour;
ALTER TABLE "user" DROP COLUMN IF EXISTS ot_setting_id;
ALTER TABLE "user" DROP COLUMN IF EXISTS work_days_per_week;
DROP TABLE IF EXISTS ot_setting;
