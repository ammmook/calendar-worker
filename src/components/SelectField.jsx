import React from 'react';
import { ChevronDown } from 'lucide-react';

// select มาตรฐานของแอป (ลูกศรเป็นไอคอน, focus ring ชัด) — ส่ง <option> เป็น children
export default function SelectField({ value, onChange, label, children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        aria-label={label}
        onChange={onChange}
        className="appearance-none bg-surface border-[1.5px] border-line-strong rounded-[10px] text-ink text-[13px] font-medium pl-3 pr-8 py-[7px] cursor-pointer outline-none shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition hover:border-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        {children}
      </select>
      <ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}
