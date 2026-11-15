-- เพิ่มคอลัมน์ note ให้ work_entry (โน้ตประจำวัน) — รันใน Supabase SQL Editor
alter table public.work_entry add column if not exists note text;
