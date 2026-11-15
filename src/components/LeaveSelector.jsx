import React, { useState, useEffect, useRef } from 'react';
import { X, Stethoscope, UmbrellaOff, Plane, Clock, Trash2, GraduationCap } from 'lucide-react';
import { getLang } from '../locales';

const LEAVE_TYPES = [
  { key: 'sick', icon: Stethoscope, color: '#F43F5E', bg: '#FFF1F3' },
  { key: 'personal', icon: UmbrellaOff, color: '#F472B6', bg: '#FCE7F3' },
  { key: 'vacation', icon: Plane, color: '#3B4FE4', bg: '#EEF0FD' },
];

export function LeaveSelector({ isOpen, dateStr, currentData, onSelect, onCancel, onDelete, lang = 'en' }) {
  const [mode, setMode] = useState('choice'); // 'choice' | 'leaveType'
  const dialogRef = useRef(null);
  const closeRef = useRef(onCancel);
  useEffect(() => { closeRef.current = onCancel; });

  // Reset mode when opening
  useEffect(() => {
    if (isOpen) {
      setMode('choice');
    }
  }, [isOpen]);

  // Escape ปิด + focus trap (วน Tab ภายใน dialog) + ย้าย focus เข้า dialog ตอนเปิด
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevFocus = document.activeElement;
    const focusables = () => dialogRef.current?.querySelectorAll('button:not([disabled])') || [];
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { closeRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current?.contains(active) || (e.shiftKey && active === first)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [isOpen]);

  const handleSelectWork = () => {
    // ไม่ปิดทันที — ให้ parent จัดการเอง
    onSelect(dateStr, { leave: null });
  };

  const handleSelectLeaveType = (type) => {
    onSelect(dateStr, { leave: { type } });
    // Close modal immediately after selecting leave type
    setMode('choice');
    onCancel();
  };

  const handleSelectTraining = () => {
    onSelect(dateStr, { leave: { type: 'training' } });
    setMode('choice');
    onCancel();
  };

  const handleClose = () => {
    setMode('choice');
    onCancel();
  };

  if (!isOpen) return null;

  const t = getLang(lang);
  const currentLeaveType = currentData?.leave?.type;
  const isTraining = currentLeaveType === 'training';
  // ลาจริง (ป่วย/กิจ/พักร้อน) ไม่รวมอบรม
  const isLeave = currentData?.leave !== null && currentData?.leave !== undefined && !isTraining;
  // วันทำงาน = ไม่ใช่ลา และไม่ใช่อบรม
  const isWork = !isLeave && !isTraining;

  // ป้ายชื่อ + คำอธิบายตามภาษา (key ตรงกับ LEAVE_TYPES)
  const leaveLabel = { sick: t.sick_leave, personal: t.personal_leave, vacation: t.vacation_leave };
  const leaveDesc = { sick: t.ls_sick_desc, personal: t.ls_personal_desc, vacation: t.ls_vacation_desc };
  const title = mode === 'choice' ? t.ls_select_status : t.ls_select_leave_type;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end xl:items-center justify-center bg-black/40 p-0 xl:p-4 animate-[fadeIn_0.2s_ease_both]"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-selector-title"
        className="bg-white w-full xl:max-w-md xl:rounded-3xl rounded-t-[24px] shadow-xl overflow-hidden animate-[slideUpSheet_0.3s_cubic-bezier(0.16,1,0.3,1)] xl:animate-[fadeUp_0.3s_ease_both]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="xl:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-line rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h2 id="leave-selector-title" className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={handleClose}
            aria-label={t.close}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-alt transition-colors bg-transparent border-none cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pb-10 xl:pb-6">
          {mode === 'choice' ? (
            <div className="space-y-3">
              {/* Work Option */}
              <button
                onClick={handleSelectWork}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 cursor-pointer
                  ${isWork
                    ? 'border-primary bg-primary-soft shadow-sm'
                    : 'border-line hover:border-line-strong hover:bg-surface-alt'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${isWork ? 'bg-primary text-white' : 'bg-[#F0F1F9] text-muted'}`}>
                  <Clock size={20} />
                </div>
                <div>
                  <div className="font-semibold text-ink">{t.ls_working}</div>
                  <div className="text-xs text-muted">{t.ls_working_desc}</div>
                </div>
              </button>

              {/* Training Option (อบรม) */}
              <button
                onClick={handleSelectTraining}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 cursor-pointer
                  ${isTraining
                    ? 'border-ink bg-[#F3F4F6] shadow-sm'
                    : 'border-line hover:border-line-strong hover:bg-surface-alt'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${isTraining ? 'bg-ink text-white' : 'bg-[#F0F1F9] text-muted'}`}>
                  <GraduationCap size={20} />
                </div>
                <div>
                  <div className="font-semibold text-ink">{t.ls_training}</div>
                  <div className="text-xs text-muted">{t.ls_training_desc}</div>
                </div>
              </button>

              {/* Leave Option */}
              <button
                onClick={() => setMode('leaveType')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 cursor-pointer
                  ${isLeave
                    ? 'border-[#8B5CF6] bg-[#F5F3FF] shadow-sm'
                    : 'border-line hover:border-line-strong hover:bg-surface-alt'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${isLeave ? 'bg-[#8B5CF6] text-white' : 'bg-[#F0F1F9] text-muted'}`}>
                  <UmbrellaOff size={20} />
                </div>
                <div>
                  <div className="font-semibold text-ink">{t.ls_leave}</div>
                  <div className="text-xs text-muted">
                    {isLeave && currentLeaveType
                      ? leaveLabel[currentLeaveType]
                      : t.ls_select_leave_type
                    }
                  </div>
                </div>
              </button>

              {/* Delete (existing data) — bottom-right of modal */}
              {(currentData?._id || currentData?.in || currentData?.leave) && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onDelete && onDelete()}
                    className="flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] font-bold text-[#F43F5E] bg-[#FFF1F3] hover:bg-[#FEE2E2] transition-colors border-none cursor-pointer"
                  >
                    <Trash2 size={18} />
                    <span>{t.delete_entry}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {LEAVE_TYPES.map((leave) => (
                <button
                  key={leave.key}
                  onClick={() => handleSelectLeaveType(leave.key)}
                  className="w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 cursor-pointer"
                  style={{
                    borderColor: currentLeaveType === leave.key ? leave.color : '#E8EAEF',
                    backgroundColor: currentLeaveType === leave.key ? leave.bg : 'transparent'
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg grid place-items-center shrink-0 text-white"
                    style={{ backgroundColor: leave.color }}
                  >
                    <leave.icon size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{leaveLabel[leave.key]}</div>
                    <div className="text-xs text-muted">{leaveDesc[leave.key]}</div>
                  </div>
                </button>
              ))}
              
              {/* Back Button */}
              <button
                onClick={() => setMode('choice')}
                className="w-full mt-4 p-3 rounded-lg border border-line text-muted font-semibold text-sm hover:bg-surface-alt transition-colors cursor-pointer bg-white"
              >
                {t.ls_back}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
