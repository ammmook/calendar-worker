import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, FileText, Sheet, ImageDown, AlertCircle } from 'lucide-react';
import Bubbles from './Bubbles';

const KIND_ICON = { png: ImageDown, pdf: FileText, csv: Sheet };
const AUTO_CLOSE_MS = 5000;

// การ์ดลอยมุมจอแสดงความคืบหน้าการส่งออก (แบบเดียวกับตอนดาวน์โหลดใน Canva)
// job = { kind, status: 'working' | 'done' | 'error', progress 0–100, title, thumb }
export default function ExportProgress({ job, t, onClose, onRetry }) {
  const status = job?.status;
  useEffect(() => {
    if (status !== 'done') return undefined;
    const id = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [status, onClose]);

  if (!job) return null;
  const Icon = KIND_ICON[job.kind] || FileText;
  const done = job.status === 'done';
  const failed = job.status === 'error';

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[60] left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6
        animate-[popIn_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
    >
      <div className="relative bg-white border border-line rounded-[26px] shadow-[0_18px_44px_rgba(17,24,39,0.20)] py-3.5 pl-5 pr-4 flex items-center gap-3.5">
        {/* รูปตัวอย่าง + ปุ่ม X กลมซ้อนมุม */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.export_close}
            className="absolute -top-2.5 -left-2.5 z-10 w-6 h-6 rounded-full bg-white border border-line-strong shadow-[0_2px_6px_rgba(17,24,39,0.18)]
              grid place-items-center text-ink cursor-pointer transition-transform hover:scale-110 active:scale-95"
          >
            <X size={13} strokeWidth={2.6} />
          </button>
          <div className="w-14 h-14 rounded-xl border border-line overflow-hidden bg-surface-alt grid place-items-center">
            {job.thumb ? (
              <img src={job.thumb} alt="" className="w-full h-full object-cover object-top animate-[fadeIn_0.3s_ease_both]" />
            ) : (
              <Icon size={22} className={failed ? 'text-danger' : 'text-primary'} />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-ink truncate" title={job.title}>{job.title}</div>

          {failed ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-danger">
                <AlertCircle size={14} /> {t.export_failed}
              </span>
              <button
                type="button"
                onClick={onRetry}
                className="h-8 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-bold cursor-pointer hover:bg-primary-mid transition-colors shrink-0"
              >
                {t.export_retry}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2 h-3 rounded-full bg-[#E8EAEF] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress)}>
                <div
                  className={`relative h-full rounded-full overflow-hidden transition-[width] duration-300 ease-out ${done ? 'bg-income' : 'water-fill'}`}
                  style={{ width: `${job.progress}%` }}
                >
                  {/* ฟองลอยขึ้น (หยุดเมื่อเสร็จ) */}
                  {!done && <Bubbles count={10} rise={20} size={[3, 5]} />}
                </div>
              </div>
              <div className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${done ? 'font-semibold text-[#047857]' : 'text-muted'}`}>
                {done && <Check size={14} strokeWidth={2.6} className="animate-[popIn_0.4s_cubic-bezier(0.22,1,0.36,1)_both]" />}
                {done ? t.export_ready : t.export_working}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
