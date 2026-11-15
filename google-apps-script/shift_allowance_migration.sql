-- ═══════════════════════════════════════════════════════════════
-- TimeFlow — Shift Allowance migration
-- Run this in the Supabase SQL editor (Database → SQL Editor).
-- ═══════════════════════════════════════════════════════════════

-- 1) Shift allowance settings live on ot_setting (edited from the Profile page)
ALTER TABLE ot_setting
  ADD COLUMN IF NOT EXISTS shift_allowance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_start     text,
  ADD COLUMN IF NOT EXISTS shift_end       text;

-- 2) Per-day shift allowance earned, stored on each work_entry
ALTER TABLE work_entry
  ADD COLUMN IF NOT EXISTS shift_allowance numeric NOT NULL DEFAULT 0;

-- 3) Monthly rollup: how many shift days + total shift baht per month
ALTER TABLE monthly_summary
  ADD COLUMN IF NOT EXISTS shift_days            integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_shift_allowance numeric NOT NULL DEFAULT 0;

-- 4) Yearly rollup: how many shift days + total shift baht per year
ALTER TABLE yearly_summary
  ADD COLUMN IF NOT EXISTS total_shift_days      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_shift_allowance numeric NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════
-- 5) FIX: hours & earnings must allow decimals (e.g. 16.5h, 8.5h OT).
--    If these were created as bigint/integer, Supabase rejects "16.5"
--    with: invalid input syntax for type bigint: "16.5"
--    Convert them to numeric (safe no-op if already numeric).
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE work_entry
  ALTER COLUMN working_hour    TYPE numeric USING working_hour::numeric,
  ALTER COLUMN ot_hour         TYPE numeric USING ot_hour::numeric,
  ALTER COLUMN ot_earning      TYPE numeric USING ot_earning::numeric,
  ALTER COLUMN regular_earning TYPE numeric USING regular_earning::numeric,
  ALTER COLUMN total_earning   TYPE numeric USING total_earning::numeric;

ALTER TABLE monthly_summary
  ALTER COLUMN total_working_hour    TYPE numeric USING total_working_hour::numeric,
  ALTER COLUMN total_ot_hour         TYPE numeric USING total_ot_hour::numeric,
  ALTER COLUMN total_ot_earning      TYPE numeric USING total_ot_earning::numeric,
  ALTER COLUMN total_regular_earning TYPE numeric USING total_regular_earning::numeric,
  ALTER COLUMN total_earning         TYPE numeric USING total_earning::numeric;

ALTER TABLE yearly_summary
  ALTER COLUMN total_working_hour    TYPE numeric USING total_working_hour::numeric,
  ALTER COLUMN total_ot_hour         TYPE numeric USING total_ot_hour::numeric,
  ALTER COLUMN total_ot_earning      TYPE numeric USING total_ot_earning::numeric,
  ALTER COLUMN total_regular_earning TYPE numeric USING total_regular_earning::numeric,
  ALTER COLUMN total_earning         TYPE numeric USING total_earning::numeric;

-- ═══════════════════════════════════════════════════════════════
-- 6) FIX: settings that can hold decimals (rate, standard hours,
--    salary, block hours) must be numeric too — same class of error.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public."user"
  ALTER COLUMN working_hour TYPE numeric USING working_hour::numeric,
  ALTER COLUMN ot_hourly    TYPE numeric USING ot_hourly::numeric;

ALTER TABLE salary_setting
  ALTER COLUMN salary_monthly TYPE numeric USING salary_monthly::numeric,
  ALTER COLUMN salary_daily   TYPE numeric USING salary_daily::numeric;

ALTER TABLE ot_setting
  ALTER COLUMN ot_block_hours TYPE numeric USING ot_block_hours::numeric;
