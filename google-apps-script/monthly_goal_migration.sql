-- ═══════════════════════════════════════════════════════════════
-- TimeFlow — Monthly income goal (เป้ารายได้ต่อเดือน) migration
-- Run this in the Supabase SQL editor (Database → SQL Editor).
-- ต้องรัน "ก่อน" deploy โค้ดเวอร์ชันที่บันทึกเป้าลง DB
-- (ถ้ายังไม่รัน แอปจะใช้ localStorage เป็นที่เก็บชั่วคราวและไม่พัง)
-- ═══════════════════════════════════════════════════════════════

-- เป้ารายได้สุทธิต่อเดือน (บาท) เก็บที่ตาราง user ; 0 = ยังไม่ตั้งเป้า
-- ต้องใส่เครื่องหมาย " " รอบชื่อ user เพราะเป็น reserved word ใน Postgres
-- RLS: policy "user own row" (for all) ครอบคลุมคอลัมน์ใหม่อยู่แล้ว ไม่ต้องแก้
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS monthly_goal numeric NOT NULL DEFAULT 0 CHECK (monthly_goal >= 0);
