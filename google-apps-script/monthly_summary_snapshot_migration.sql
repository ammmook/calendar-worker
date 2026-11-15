-- monthly_summary: เก็บ snapshot เงินเดือน/ประกันสังคมที่ใช้คิดของเดือนนั้น
-- เพื่อให้เดือนที่ผ่านมาแล้วไม่เปลี่ยนยอดเมื่อผู้ใช้แก้เงินเดือนทีหลัง
-- รันใน Supabase SQL Editor ก่อน deploy โค้ดใหม่

alter table public.monthly_summary
  add column if not exists salary_snapshot numeric,
  add column if not exists social_security_snapshot numeric;

-- แถวเก่าจะเป็น null → การบันทึก/แก้ entry ครั้งถัดไปของเดือนนั้นจะใช้ค่าเงินเดือนปัจจุบันแล้วเก็บ snapshot
-- (ถ้าต้องการล็อกยอดเดือนเก่าให้ตรงกับที่แสดงอยู่ตอนนี้ ให้เติมจากค่าที่ derive ได้เอง เช่น
--  update public.monthly_summary set salary_snapshot = total_regular_earning where total_regular_earning > 0;
--  ซึ่งตรงกับเงินเดือนที่ใช้คิดไปแล้วในเดือนนั้นพอดี)
