-- ═══════════════════════════════════════════════════════════════
-- TimeFlow — เป้ารายได้แยกรายเดือน (monthly_goal) migration
-- Run this in the Supabase SQL editor (Database → SQL Editor).
-- ถ้ายังไม่รัน แอปจะเก็บเป้าในเครื่อง (localStorage) ชั่วคราวและไม่พัง
-- แล้วย้ายขึ้น DB ให้เองครั้งเดียวหลังรัน
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.monthly_goal (
  user_email text    not null,
  year_num   integer not null check (year_num between 2000 and 2100),
  month_num  integer not null check (month_num between 1 and 12),
  goal       numeric not null check (goal > 0),
  updated_at timestamptz not null default now(),
  primary key (user_email, year_num, month_num)
);

alter table public.monthly_goal enable row level security;

-- policy เดียว for all ตามแบบเดียวกับตาราง work_entry / monthly_summary
drop policy if exists "monthly_goal own rows" on public.monthly_goal;
create policy "monthly_goal own rows" on public.monthly_goal
  for all to authenticated
  using (user_email = (select auth.jwt() ->> 'email'))
  with check (user_email = (select auth.jwt() ->> 'email'));
