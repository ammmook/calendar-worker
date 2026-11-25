import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ImageDown, FileText, Sheet } from 'lucide-react';
import ExportProgress from './ExportProgress';
import {
  statementToPngBlob, statementToCsvBlob, printStatement, shareOrDownload, downloadBlob,
} from '../utils/exportReport';

const KIND_LABEL = { png: 'PNG', pdf: 'PDF', csv: 'Excel' };
const MIN_PROGRESS_MS = 700; // ให้เห็นความคืบหน้าอย่างน้อยเท่านี้ ไม่ให้การ์ดวาบแล้วหาย
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ปุ่ม "ส่งออก" — รูปภาพ (PNG) / PDF / Excel (CSV) ของเดือนที่ดูอยู่
// variant: 'dropdown' = เมนูลอยใต้ปุ่ม (จอใหญ่) | 'sheet' = ปุ่มกลมบนการ์ด + แผ่นเลื่อนขึ้นจากล่าง (มือถือ)
export default function ExportMenu({ getStatement, disabled, t, variant = 'dropdown', period = '' }) {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState(null); // งานส่งออกที่กำลังแสดงในการ์ดลอย
  const rootRef = useRef(null);
  const jobIdRef = useRef(0);
  const timerRef = useRef(null);
  const thumbRef = useRef(null);
  const isSheet = variant === 'sheet';

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!isSheet && rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    // แผ่นเต็มจอ: กันหน้าด้านหลังเลื่อนตาม
    const prevOverflow = document.body.style.overflow;
    if (isSheet) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isSheet]);

  const releaseThumb = () => {
    if (thumbRef.current) URL.revokeObjectURL(thumbRef.current);
    thumbRef.current = null;
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (thumbRef.current) URL.revokeObjectURL(thumbRef.current);
  }, []);

  const closeJob = () => {
    clearInterval(timerRef.current);
    releaseThumb();
    setJob(null);
  };

  const run = async (kind) => {
    const id = ++jobIdRef.current;
    const alive = () => id === jobIdRef.current;
    setOpen(false);
    clearInterval(timerRef.current);
    releaseThumb();
    setJob({ kind, status: 'working', progress: 6, title: KIND_LABEL[kind], thumb: null });
    // ความคืบหน้าจำลอง: ไล่เข้าหา 90% แล้วรอจนงานจริงเสร็จค่อยเต็ม 100%
    timerRef.current = setInterval(() => {
      setJob((j) => (j && j.status === 'working' ? { ...j, progress: j.progress + (90 - j.progress) * 0.12 } : j));
    }, 120);

    try {
      const st = getStatement();
      setJob((j) => (j && alive() ? { ...j, title: `${KIND_LABEL[kind]} - ${st.title} ${st.period}` } : j));

      const deliver = (async () => {
        if (kind === 'png') {
          const blob = await statementToPngBlob(st);
          if (!alive()) return;
          thumbRef.current = URL.createObjectURL(blob);
          setJob((j) => (j ? { ...j, thumb: thumbRef.current } : j));
          await shareOrDownload(blob, `${st.fileBase}.png`, `TimeFlow ${st.period}`);
        } else if (kind === 'csv') {
          downloadBlob(statementToCsvBlob(st), `${st.fileBase}.csv`);
        } else {
          await printStatement(st);
        }
      })();

      await Promise.all([deliver, sleep(MIN_PROGRESS_MS)]);
      if (!alive()) return;
      clearInterval(timerRef.current);
      setJob((j) => (j ? { ...j, status: 'done', progress: 100 } : j));
    } catch (err) {
      if (!alive()) return;
      clearInterval(timerRef.current);
      console.error('[TimeFlow] export failed', err);
      setJob((j) => (j ? { ...j, status: 'error' } : j));
    }
  };

  const items = [
    { kind: 'png', Icon: ImageDown, label: t.export_image, hint: t.export_image_hint },
    { kind: 'pdf', Icon: FileText, label: t.export_pdf, hint: t.export_pdf_hint },
    { kind: 'csv', Icon: Sheet, label: t.export_excel, hint: t.export_excel_hint },
  ];

  const itemButtons = items.map(({ kind, Icon, label, hint }) => (
    <button
      key={kind}
      type="button"
      role="menuitem"
      onClick={() => run(kind)}
      className={`w-full text-left grid grid-cols-[36px_1fr] items-center gap-3 px-2.5 rounded-xl cursor-pointer
        transition-colors hover:bg-primary-soft active:bg-primary-soft 
        ${isSheet ? 'min-h-[60px] py-2' : 'py-2.5'}`}
    >
      <span className="w-9 h-9 rounded-[10px] bg-surface-alt text-ink-2 grid place-items-center">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-ink leading-tight">{label}</span>
        <span className="block text-[11px] text-muted leading-snug mt-0.5">{hint}</span>
      </span>
    </button>
  ));

  const triggerCls = isSheet
    ? `w-10 h-10 rounded-full grid place-items-center bg-white/25 text-white cursor-pointer transition
       hover:bg-white/35 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed`
    : `flex items-center gap-1.5 h-10 px-3 rounded-xl bg-surface border border-line shadow-[0_1px_3px_rgba(17,24,39,0.06)]
       text-ink-2 text-[12px] font-semibold cursor-pointer transition hover:bg-primary-soft hover:text-primary
       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-ink-2`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || job?.status === 'working'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.export_btn}
        title={disabled ? t.export_empty : t.export_btn}
        className={triggerCls}
      >
        <Download size={isSheet ? 17 : 14} />
        {!isSheet && <span>{t.export_btn}</span>}
      </button>

      {open && !isSheet && (
        <div
          role="menu"
          className="absolute right-0 mt-2 z-30 w-[19rem] bg-surface border border-line rounded-2xl
            shadow-[0_12px_32px_rgba(17,24,39,0.14)] p-1.5 animate-[fadeIn_0.15s_ease_both]"
        >
          {itemButtons}
        </div>
      )}

      {open && isSheet && createPortal(
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.2s_ease_both]" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label={t.export_btn}
            className="absolute inset-x-0 bottom-0 bg-surface rounded-t-3xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]
              shadow-[0_-12px_32px_rgba(17,24,39,0.18)] animate-[slideUpSheet_0.3s_cubic-bezier(0.22,1,0.36,1)_both]"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-line-strong mb-3" />
            <div className="flex items-baseline justify-between px-1 mb-2">
              <span className="text-[15px] font-bold text-ink">{t.export_btn}</span>
              <span className="text-[12px] text-muted">{period}</span>
            </div>
            {itemButtons}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full mt-1 h-12 rounded-xl text-[13px] font-semibold text-muted cursor-pointer hover:bg-surface-alt transition-colors"
            >
              {t.export_close}
            </button>
          </div>
        </div>,
        document.body
      )}
      <ExportProgress job={job} t={t} onClose={closeJob} onRetry={() => run(job.kind)} />
    </div>
  );
}
