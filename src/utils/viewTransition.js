import { flushSync } from 'react-dom';

// เปลี่ยน state ภายใน View Transition ของเบราว์เซอร์ (ครอสเฟดนุ่ม ๆ) — ถ้าไม่รองรับ/ผู้ใช้ลดการเคลื่อนไหว ก็อัปเดตทันที
export function withViewTransition(update) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document === 'undefined' || !document.startViewTransition || reduce) { update(); return; }
  document.startViewTransition(() => { flushSync(update); });
}
