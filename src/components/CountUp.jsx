import { useCountUp } from './useMotion';

// แสดงตัวเลขที่นับขึ้นไปหาค่า value ; format แปลงเป็นข้อความ (เช่น fmtB)
export default function CountUp({ value, format = String, duration }) {
  return format(useCountUp(Number(value) || 0, duration));
}
