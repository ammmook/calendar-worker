import React, { useRef } from 'react';
import { Clock } from 'lucide-react';

const pad = (value) => String(value).padStart(2, '0');

const parseTimeValue = (value) => {
  const [rawHour = '', rawMinute = ''] = String(value || '').split(':');
  return {
    hour: rawHour.replace(/\D/g, '').slice(0, 2),
    minute: rawMinute.replace(/\D/g, '').slice(0, 2),
  };
};

const serializeTime = (hour, minute) => {
  if (!hour && !minute) return '';
  return `${hour}:${minute}`;
};

const isControlKey = (event) => (
  event.ctrlKey || event.metaKey || [
    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab',
  ].includes(event.key)
);

export default function TimePicker({
  value = '',
  onChange,
  disabled = false,
  className = '',
  label,                  // ชื่อกลุ่ม เช่น "เวลาเข้างาน" (อ่านให้ screen reader)
  hourLabel = 'Hour',
  minuteLabel = 'Minute',
}) {
  const { hour, minute } = parseTimeValue(value);
  const minuteInputRef = useRef(null);

  const updateParts = (nextHour, nextMinute) => {
    onChange?.(serializeTime(nextHour, nextMinute));
  };

  const handleSegmentChange = (segment, rawValue) => {
    const nextValue = rawValue.replace(/\D/g, '').slice(0, 2);
    const max = segment === 'hour' ? 23 : 59;
    if (nextValue.length === 2 && Number(nextValue) > max) return;

    const nextHour = segment === 'hour' ? nextValue : hour;
    const nextMinute = segment === 'minute' ? nextValue : minute;
    updateParts(nextHour, nextMinute);

    if (segment === 'hour' && nextValue.length === 2) {
      requestAnimationFrame(() => {
        minuteInputRef.current?.focus();
        minuteInputRef.current?.select();
      });
    }
  };

  const handleSegmentBlur = (segment) => {
    const currentValue = segment === 'hour' ? hour : minute;
    if (currentValue.length !== 1) return;

    const paddedValue = pad(currentValue);
    updateParts(
      segment === 'hour' ? paddedValue : hour,
      segment === 'minute' ? paddedValue : minute,
    );
  };

  const handleKeyDown = (event) => {
    if (isControlKey(event)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  };

  const handleFocus = (event) => {
    event.target.select();
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`${className} focus-within:border-primary focus-within:bg-surface flex items-center gap-0.5 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text'}`}
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={hour}
        disabled={disabled}
        aria-label={label ? `${label} ${hourLabel}` : hourLabel}
        className="min-w-0 flex-1 bg-transparent text-center text-inherit outline-none"
        onChange={(event) => handleSegmentChange('hour', event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={() => handleSegmentBlur('hour')}
      />
      <span className="shrink-0 text-muted" aria-hidden="true">:</span>
      <input
        ref={minuteInputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={minute}
        disabled={disabled}
        aria-label={label ? `${label} ${minuteLabel}` : minuteLabel}
        className="min-w-0 flex-1 bg-transparent text-center text-inherit outline-none"
        onChange={(event) => handleSegmentChange('minute', event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={() => handleSegmentBlur('minute')}
      />
      <Clock size={15} className="ml-1 shrink-0 text-muted" aria-hidden="true" />
    </div>
  );
}
