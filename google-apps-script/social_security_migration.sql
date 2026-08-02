-- ═══════════════════════════════════════════════════════════════
-- TimeFlow — Social Security (ประกันสังคม) migration
-- Run this in the Supabase SQL editor (Database → SQL Editor).
-- ═══════════════════════════════════════════════════════════════

-- จำนวนเงินประกันสังคมที่หักจากเงินเดือนต่อเดือน (เก็บที่ตาราง user)
-- ต้องใส่เครื่องหมาย " " รอบชื่อ user เพราะเป็น reserved word ใน Postgres
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS social_security numeric NOT NULL DEFAULT 0;
