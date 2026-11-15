-- ═══════════════════════════════════════════════════════════════════════════
--  Migration: ย้ายเงินเดือนมาเก็บตรงในตาราง user (คอลัมน์ salary)
--  แล้วเลิกใช้ตาราง salary_setting + คอลัมน์ user.salary_id
--  รันไฟล์นี้ใน Supabase SQL Editor
--  หมายเหตุ: คอลัมน์เงิน ต้องเป็น numeric (ห้าม bigint)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) เพิ่มคอลัมน์ salary ในตาราง user ──
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS salary numeric DEFAULT 0;

-- ── 2) ย้ายค่าเงินเดือนเดิมจาก salary_setting → user.salary (ถ้ายังมีตารางเดิม) ──
UPDATE "user" u
SET salary = s.salary_monthly
FROM salary_setting s
WHERE u.salary_id = s.id;

-- ── 3) เลิกใช้ salary_id และตาราง salary_setting ──
ALTER TABLE "user" DROP COLUMN IF EXISTS salary_id;
DROP TABLE IF EXISTS salary_setting;
