import React from 'react';

// แท็บแบบแคปซูลที่ใช้ร่วมกันทั้งแอป (สลับหน้า / แท็บย่อยสรุป)
// items: [{ id, Icon, label }] ; fill = ยืดเต็มความกว้างบนมือถือ ; collapseLabel = ซ่อนข้อความบนมือถือ (เหลือแต่ไอคอน)
export default function SegmentedControl({ items, value, onChange, fill = false, collapseLabel = false, className = '' }) {
  return (
    <div className={`flex items-center gap-1 bg-surface-alt border border-line rounded-[12px] p-1 ${fill ? 'w-full sm:w-auto sm:self-start' : ''} ${className}`}>
      {items.map(({ id, Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-label={collapseLabel ? label : undefined}
          aria-pressed={value === id}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] font-semibold cursor-pointer transition
            ${fill ? 'flex-1 sm:flex-initial sm:px-4 sm:text-[13px]' : ''}
            ${value === id
              ? 'bg-white text-primary shadow-[0_1px_3px_rgba(17,24,39,0.08)]'
              : 'text-muted hover:text-ink-2'}`}
        >
          <Icon size={14} aria-hidden="true" />
          <span className={collapseLabel ? 'hidden sm:inline' : ''}>{label}</span>
        </button>
      ))}
    </div>
  );
}
