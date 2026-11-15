-- work_entry: หนึ่งวันต่อหนึ่งผู้ใช้ — กัน entry ซ้ำ และรองรับ upsert onConflict (user_email, date)
-- รันใน Supabase SQL Editor ก่อน deploy โค้ดใหม่

-- 1) ลบแถวซ้ำเดิม (เก็บแถวที่ work_entry_id มากสุด = ใหม่สุดตามรูปแบบ id ที่ใส่ timestamp)
delete from public.work_entry a
using public.work_entry b
where a.user_email = b.user_email
  and a.date = b.date
  and a.work_entry_id < b.work_entry_id;

-- 2) unique constraint
alter table public.work_entry
  add constraint work_entry_user_date_key unique (user_email, date);

-- หลังรันนี้ ควรเปิดแก้/เซฟเดือนที่เคยมีข้อมูลซ้ำอีกครั้ง เพื่อให้ summary คำนวณใหม่
