// จอ desktop = breakpoint `xl` ของ Tailwind (1280px) — ใช้ matchMedia ให้ตรงกับ CSS เสมอ
// (หลีกเลี่ยง window.innerWidth ที่ไม่ตรงกับ media query ตอนมี scrollbar/หมุนจอ)
export const DESKTOP_QUERY = '(min-width: 1280px)';

export const isDesktopViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;
