import { useCallback, useEffect, useRef, useState } from 'react';

const prefersReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** ตัวเลขไล่ขึ้นจากค่าเดิม (หรือ 0 ตอนแรก) ไปค่าใหม่ — เปลี่ยนเดือนแล้วเห็นว่า "ยอดเปลี่ยนไปเท่าไร" */
export function useCountUp(target, duration = 900) {
  const reduced = prefersReduced();
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * (1 - Math.pow(1 - p, 3));
      fromRef.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return reduced ? target : val;
}

/** true เมื่อ element เลื่อนเข้าจอครั้งแรก — ใช้เริ่มแอนิเมชันตอนผู้ใช้เห็นจริง ๆ */
export function useInView(threshold = 0.25) {
  const [seen, setSeen] = useState(false);
  const ioRef = useRef(null);
  const ref = useCallback((node) => {
    ioRef.current?.disconnect();
    ioRef.current = null;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold });
    io.observe(node);
    ioRef.current = io;
  }, [threshold]);
  return [ref, seen];
}
