import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { createPortal } from 'react-dom';

const HOURS = Array.from({ length: 24 }, (_, value) => value);
const MINUTES = Array.from({ length: 60 }, (_, value) => value);

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
    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab', 'Escape',
  ].includes(event.key)
);

function TimeOption({ value, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`flex h-8 w-full items-center justify-center rounded-[6px] px-1 text-[13px] font-medium transition-colors
        ${selected
          ? 'bg-[#EEF0FD] text-[#3B4FE4]'
          : 'text-[#6B7280] hover:bg-[#F8F9FB] hover:text-[#111827]'}`}
      onClick={() => onSelect(value)}
    >
      <span className="flex w-4 justify-center">
        {selected && <Check size={14} strokeWidth={2.5} />}
      </span>
      <span className="ml-1">{pad(value)}</span>
    </button>
  );
}

export default function TimePicker({
  value = '',
  onChange,
  disabled = false,
  className = '',
}) {
  const { hour, minute } = parseTimeValue(value);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState(null);

  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const hourInputRef = useRef(null);
  const minuteInputRef = useRef(null);
  const hourOptionRefs = useRef({});
  const minuteOptionRefs = useRef({});

  const updateParts = (nextHour, nextMinute) => {
    onChange?.(serializeTime(nextHour, nextMinute));
  };

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect || typeof window === 'undefined') return;

      const panelWidth = Math.min(280, Math.max(rect.width, 232), window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - panelWidth - 8),
      );
      const panelHeight = 240;
      const opensAbove = rect.bottom + panelHeight > window.innerHeight && rect.top > panelHeight;
      const top = opensAbove ? rect.top - panelHeight - 6 : rect.bottom + 6;

      setPanelPosition({ top, left, width: panelWidth });
    };
    const initialPositionTimeout = setTimeout(updatePosition, 0);
    const handleOutsidePointerDown = (event) => {
      const target = event.target;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const handleViewportChange = () => updatePosition();

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      clearTimeout(initialPositionTimeout);
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const timeoutId = setTimeout(() => {
      const selectedHour = hour.length === 2 ? Number(hour) : null;
      const selectedMinute = minute.length === 2 ? Number(minute) : null;
      if (selectedHour !== null) {
        hourOptionRefs.current[selectedHour]?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      if (selectedMinute !== null) {
        minuteOptionRefs.current[selectedMinute]?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [open, hour, minute]);

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

    const paddedValue = currentValue.padStart(2, '0');
    updateParts(
      segment === 'hour' ? paddedValue : hour,
      segment === 'minute' ? paddedValue : minute,
    );
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (isControlKey(event)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  };

  const handleSelectHour = (nextHour) => updateParts(pad(nextHour), minute);
  const handleSelectMinute = (nextMinute) => updateParts(hour, pad(nextMinute));

  const picker = (
    <div
      ref={panelRef}
      className="fixed z-[1000] rounded-[8px] border border-[#E8EAEF] bg-white p-2 shadow-[0_10px_30px_rgba(17,24,39,0.16)]"
      style={panelPosition || { visibility: 'hidden' }}
      role="dialog"
      aria-label="Select time"
    >
      <div className="flex h-56 gap-2">
        <div className="min-w-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-0.5">
            {HOURS.map((option) => (
              <div
                key={option}
                ref={(element) => { hourOptionRefs.current[option] = element; }}
              >
                <TimeOption
                  value={option}
                  selected={hour.length === 2 && Number(hour) === option}
                  onSelect={handleSelectHour}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="w-px shrink-0 bg-[#E8EAEF]" />
        <div className="min-w-0 flex-1 overflow-y-auto pl-1">
          <div className="flex flex-col gap-0.5">
            {MINUTES.map((option) => (
              <div
                key={option}
                ref={(element) => { minuteOptionRefs.current[option] = element; }}
              >
                <TimeOption
                  value={option}
                  selected={minute.length === 2 && Number(minute) === option}
                  onSelect={handleSelectMinute}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={rootRef}
        className={`${className} flex items-center gap-0.5 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        onClick={() => { if (!disabled) setOpen(true); }}
        onFocus={() => { if (!disabled) setOpen(true); }}
      >
        <input
          ref={hourInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={hour}
          disabled={disabled}
          aria-label="Hour"
          className="min-w-0 flex-1 bg-transparent text-center text-inherit outline-none"
          onChange={(event) => handleSegmentChange('hour', event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(event) => { event.target.select(); if (!disabled) setOpen(true); }}
          onBlur={() => handleSegmentBlur('hour')}
        />
        <span className="shrink-0 text-[#9CA3AF]" aria-hidden="true">:</span>
        <input
          ref={minuteInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={minute}
          disabled={disabled}
          aria-label="Minute"
          className="min-w-0 flex-1 bg-transparent text-center text-inherit outline-none"
          onChange={(event) => handleSegmentChange('minute', event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(event) => { event.target.select(); if (!disabled) setOpen(true); }}
          onBlur={() => handleSegmentBlur('minute')}
        />
        <Clock size={15} className="ml-1 shrink-0 text-[#9CA3AF]" aria-hidden="true" />
      </div>
      {open && typeof document !== 'undefined' && createPortal(picker, document.body)}
    </>
  );
}
