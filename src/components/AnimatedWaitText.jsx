import React from 'react';

// จุดไข่ปลาวิ่ง ". .. ..." ใช้บนปุ่มระหว่างบันทึก/ลบ
export default function AnimatedWaitText() {
  const [dots, setDots] = React.useState('');
  React.useEffect(() => {
    const seq = ['.  ', '.. ', '...', '.. '];
    let i = 0;
    const timer = setInterval(() => { i = (i + 1) % seq.length; setDots(seq[i]); }, 300);
    return () => clearInterval(timer);
  }, []);
  return <span className="inline-block text-left whitespace-pre" aria-hidden="true">{dots}</span>;
}
