// ฟังก์ชันจัดรูปแบบ/วันที่ที่ใช้ร่วมกันทุกหน้า (เดิมก๊อปไว้ในหลายไฟล์)

export const fmt1 = (n) => Number(n || 0).toFixed(1);

export const fmtB = (n) =>
  '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** m เป็น 1–12 */
export const dateKey = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const todayKey = () => {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
};

/** ตัวเลือกปีในดรอปดาวน์: today±2 และรวมปีที่กำลังดูอยู่เสมอ */
export const yearOptions = (today, viewY) => {
  const base = today.getFullYear();
  const from = Math.min(base - 2, viewY);
  const to = Math.max(base + 2, viewY);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
};
