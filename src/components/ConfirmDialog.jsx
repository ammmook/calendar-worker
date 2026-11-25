import React, { useEffect, useRef } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';

// กล่องยืนยันมาตรฐานของแอป — มือถือ = bottom sheet, desktop (xl) = การ์ดกลางจอ
// tone: 'danger' (ปุ่มแดง/ไอคอนถังขยะ) | 'warning' (ปุ่มสีหลัก/ไอคอนเตือน)
const TONES = {
  danger: {
    Icon: Trash2,
    iconWrap: 'bg-danger-soft text-danger',
    confirm: 'bg-danger hover:bg-danger-dark shadow-[0_4px_14px_rgba(239,68,68,0.25)]',
  },
  warning: {
    Icon: AlertCircle,
    iconWrap: 'bg-amber-50 text-amber-500',
    confirm: 'bg-primary hover:bg-primary-dark shadow-[0_4px_14px_rgba(59,79,228,0.25)]',
  },
};

export default function ConfirmDialog({ open, tone = 'warning', title, text, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    cancelRef.current?.focus(); // โฟกัสปุ่มยกเลิกก่อน กันกด Enter ลบโดยไม่ตั้งใจ
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); return; }
      if (e.key !== 'Tab') return;
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus) prev.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;
  const { Icon, iconWrap, confirm } = TONES[tone] || TONES.warning;

  return (
    <div
      data-confirm-dialog
      className="fixed inset-0 z-[250] bg-ink/40 flex items-end xl:items-center justify-center xl:p-4 overscroll-contain animate-[fadeIn_0.2s_ease_both]"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
        className="bg-white w-full xl:max-w-sm rounded-t-[24px] xl:rounded-3xl shadow-xl flex flex-col overflow-hidden
          animate-[slideUpSheet_0.3s_cubic-bezier(0.16,1,0.3,1)] xl:animate-[zoomIn_0.2s_ease_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 xl:hidden" aria-hidden="true">
          <div className="w-12 h-1.5 bg-line rounded-full" />
        </div>
        <div className="flex flex-col items-center p-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] xl:pb-6 gap-3">
          <div className={`w-14 h-14 rounded-full grid place-items-center ${iconWrap}`}>
            <Icon size={26} aria-hidden="true" />
          </div>
          <h3 id="confirm-title" className="text-[17px] font-bold text-ink text-center leading-tight text-balance">{title}</h3>
          <p id="confirm-text" className="text-[14px] text-muted text-center px-2 leading-relaxed">{text}</p>
          <div className="flex w-full gap-3 mt-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-[12px] bg-surface-alt text-muted text-[15px] font-bold border border-line transition cursor-pointer hover:bg-line focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-3 rounded-[12px] text-white text-[15px] font-bold border-none transition cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/25 ${confirm}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
