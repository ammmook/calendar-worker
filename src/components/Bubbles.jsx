import React from 'react';

// ฟองอากาศลอยจากล่างขึ้นบนภายในแถบ (ต้องอยู่ใน parent ที่ relative + overflow-hidden)
// ค่าทุกอย่างคำนวณจากลำดับ i (ไม่สุ่ม) เพื่อให้เรนเดอร์ซ้ำแล้วตำแหน่งไม่กระโดด
export default function Bubbles({ count = 14, rise = 30, size = [3, 6] }) {
  const span = size[1] - size[0] + 1;
  return (
    <span aria-hidden="true" className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }, (_, i) => {
        const d = size[0] + ((i * 5) % span);
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 37 + 11) % 96}%`,
              bottom: -d,
              width: d,
              height: d,
              '--dx': `${((i % 3) - 1) * 4}px`,
              '--rise': `-${rise}px`,
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.35))',
              boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.7)',
              animation: `bubbleRise ${(2.2 + ((i * 0.37) % 1.8)).toFixed(2)}s ease-in ${(-((i * 0.61) % 3)).toFixed(2)}s infinite`,
            }}
          />
        );
      })}
    </span>
  );
}
