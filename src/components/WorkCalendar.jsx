import React, { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight, X, CalendarCheck, CalendarDays } from 'lucide-react';
import DayDetailForm from './DayDetailForm';
import DayCell from './DayCell';
import { dateKey, todayKey as todayKeyFn, yearOptions } from '../utils/format';
import { isDesktopViewport } from '../utils/viewport';

// ─────────────────────────────────────────────────────────────────────────────
// หน้า "ปฏิทินการทำงาน" — ปฏิทิน + panel/modal แก้ไขวัน (สกัดจาก App.jsx)
export default function WorkCalendar({
  viewY, viewM, lang, t, today,
  prevMonth, nextMonth, goToday,
  setViewM, setViewY, showToast,
  entries, setEntries, earningsSummary, holidays, publicHolidays,
  selectedKey, setSelectedKey,
  handleDayClick, toggleHoliday,
  dIn, dOut, setDIn, setDOut, dNote, setDNote,
  saveSelectedEntry, deleteSelectedEntry,
  isSavingEntry, isDeletingEntry,
  showLeaveSelector, showDeleteConfirm,
  selEntry, selLabel, isTodaySelected, isSelectedHoliday,
  previewCalc, detHReg, netDetOT, detE, detOTRateEarn, detShift,
  detOT15h, detOT15e, detOT1h, detOT1e, detOT3h, detOT3e,
  labelCls, inputCls,
}) {
  const daysInM = new Date(viewY, viewM + 1, 0).getDate();
  const firstDow = new Date(viewY, viewM, 1).getDay();
  const emptyCells = Array.from({ length: firstDow });
  const dayCells = Array.from({ length: daysInM }, (_, i) => i + 1);

  // props ที่ DayDetailForm ใช้ร่วมกัน (desktop panel + modal มือถือ)
  const formProps = {
    lang, t,
    selectedKey, entries, setEntries, showToast,
    dIn, dOut, setDIn, setDOut, dNote, setDNote,
    isSelectedHoliday, isSavingEntry, isDeletingEntry,
    saveSelectedEntry, deleteSelectedEntry,
    previewCalc,
    calc: {
      detHReg, netDetOT, detE, detOTRateEarn, detShift,
      detOT15h, detOT15e, detOT1h, detOT1e, detOT3h, detOT3e,
    },
    labelCls, inputCls,
  };

  // กดนอก modal มือถือ: ถ้ามีเวลาที่แก้ค้างยังไม่บันทึก ให้ถามก่อนปิด
  const isDirty = !!selectedKey && (dIn !== (selEntry.in || '') || dOut !== (selEntry.out || '') || dNote.trim() !== (selEntry.note || ''));
  const closeModal = async () => {
    if (isDirty) {
      const res = await Swal.fire({
        title: t.discard_title,
        text: t.discard_text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3B4FE4',
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: t.discard_yes,
        cancelButtonText: t.keep_editing,
        customClass: {
          container: 'font-sans',
          popup: 'rounded-2xl',
          confirmButton: 'rounded-[10px] font-bold px-6 py-2.5',
          cancelButton: 'rounded-[10px] font-bold px-6 py-2.5',
        },
      });
      if (!res.isConfirmed) return;
    }
    setSelectedKey(null);
  };

  const todayK = todayKeyFn();

  // modal มือถือ (ซ่อนด้วย CSS บน xl) — Escape ปิด และย้าย focus เข้าไปที่ปุ่มปิดเมื่อเปิด
  const modalOpen = !!selectedKey && !showLeaveSelector && !showDeleteConfirm;
  const closeBtnRef = useRef(null);
  const dialogRef = useRef(null);
  const closeModalRef = useRef(null);
  useEffect(() => {
    if (!modalOpen) return undefined;
    closeBtnRef.current?.focus();
    const onKey = (e) => {
      if (isDesktopViewport()) return; // desktop ไม่มี modal
      if (e.key === 'Escape') { closeModalRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      // focus trap: วน Tab อยู่ภายใน dialog ไม่หลุดไปปฏิทินด้านหลัง
      const root = dialogRef.current;
      if (!root) return;
      const items = root.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active) || (e.shiftKey && active === first)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  useEffect(() => { closeModalRef.current = closeModal; });

  const goTodayAndSelect = () => {
    goToday();
    setSelectedKey(todayKeyFn());
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_284px] gap-6 w-full">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 animate-[fadeUp_0.4s_ease_both] order-1 xl:col-span-2">
        <div>
          <h1 className="text-[26px] font-bold text-ink tracking-tight leading-tight">{t.work_calendar}</h1>
        </div>

        {/* Mobile filters + Today */}
        <div className="flex sm:hidden items-center gap-2 flex-wrap">
          <div className="relative">
            <select value={viewM} onChange={(e) => setViewM(Number(e.target.value))} aria-label={t.month_label}
              className="appearance-none bg-white border-[1.5px] border-line-strong rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-primary">
              {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">▾</span>
          </div>
          <div className="relative">
            <select value={viewY} aria-label={t.year_label} onChange={(e) => {
                setViewY(Number(e.target.value));
                showToast(t.loading_data);
            }}
              className="appearance-none bg-white border-[1.5px] border-line-strong rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-primary">
              {yearOptions(today, viewY).map((y) => (
                <option key={y} value={y}>{lang === 'th' ? y + 543 : y}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">▾</span>
          </div>
        </div>
      </div>

      {/* ── CALENDAR ── */}
      <div className="bg-white border border-line rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden animate-[fadeUp_0.4s_0.16s_ease_both] order-2 xl:order-3">

        {/* Calendar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <span className="text-[17px] font-bold text-ink">{t.months[viewM]} {lang === 'th' ? viewY + 543 : viewY}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={goTodayAndSelect}
              className="flex items-center gap-1.5 h-10 sm:h-[30px] px-3 rounded-lg bg-surface-alt border border-line text-muted text-[12px] font-semibold cursor-pointer transition-all hover:bg-primary-soft hover:border-primary hover:text-primary">
              <CalendarCheck size={13} />
              {t.today}
            </button>
            <button type="button" onClick={prevMonth} aria-label={t.prev_month}
              className="w-10 h-10 sm:w-[30px] sm:h-[30px] rounded-lg bg-surface-alt border border-line text-muted grid place-items-center cursor-pointer transition-all hover:bg-primary-soft hover:border-primary hover:text-primary">
              <ChevronLeft size={15} />
            </button>
            <button type="button" onClick={nextMonth} aria-label={t.next_month}
              className="w-10 h-10 sm:w-[30px] sm:h-[30px] rounded-lg bg-surface-alt border border-line text-muted grid place-items-center cursor-pointer transition-all hover:bg-primary-soft hover:border-primary hover:text-primary">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Calendar body */}
        <div className="p-4">
          {/* Weekday row */}
          <div className="grid grid-cols-7 mb-1.5">
            {t.days_short.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold text-muted uppercase tracking-[0.06em] py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells grid */}
          <div className="grid grid-cols-7 gap-[3px]">
            {emptyCells.map((_, i) => <div key={`e-${i}`} />)}
            {dayCells.map((d) => {
              const k = dateKey(viewY, viewM + 1, d);
              const dow = (firstDow + d - 1) % 7;
              return (
                <DayCell
                  key={d}
                  d={d}
                  k={k}
                  entry={entries[k]}
                  isToday={k === todayK}
                  isSel={k === selectedKey}
                  isHol={holidays.has(k)}
                  isWE={dow === 0 || dow === 6}
                  dow={dow}
                  publicHol={publicHolidays?.[k] || null}
                  dailyEarning={earningsSummary.daily[k]}
                  handleDayClick={handleDayClick}
                  toggleHoliday={toggleHoliday}
                  viewM={viewM}
                  lang={lang}
                  t={t}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right panel: day detail ── */}
      <div className="relative order-3 xl:order-4 min-w-0 xl:h-full">
        <div className="flex flex-col gap-4 min-w-0 overflow-hidden animate-[fadeUp_0.4s_0.20s_ease_both] w-full">

          {/* ยังไม่ได้เลือกวัน (desktop) — แสดงคำแนะนำ แทนที่จะปล่อยคอลัมน์ว่างจนเลย์เอาต์กระโดด */}
          {!selectedKey && (
            <div className="hidden xl:flex flex-col items-center justify-center gap-2 text-center bg-surface-alt border border-dashed border-line-strong rounded-2xl px-5 py-10">
              <CalendarDays size={22} className="text-faint" aria-hidden="true" />
              <p className="text-[13px] font-semibold text-ink-2">{t.select_day}</p>
              <p className="text-[12px] text-muted leading-relaxed">{t.select_day_hint}</p>
            </div>
          )}

          {/* Day detail card (desktop) */}
          {selectedKey && (
            <div className="hidden xl:flex flex-col bg-white border border-line rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-line">
              <span className="text-sm font-bold text-ink">{selLabel}</span>
              {isTodaySelected && (
                <span className="text-[10px] font-bold bg-today text-white px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                  {t.today}
                </span>
              )}
            </div>

            <div className="p-4 w-full overflow-hidden">
              <DayDetailForm
                variant="panel"
                {...formProps}
              />
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 flex-wrap px-1 animate-[fadeUp_0.4s_0.24s_ease_both] order-4 xl:col-span-2">
        {[
          { color: 'bg-primary-soft border border-primary-mid', label: t.regular_day_legend },
          { color: 'bg-ot-soft border border-ot-line', label: t.ot_day_legend },
          { color: 'bg-[rgba(153,142,217,0.15)] border border-[rgba(153,142,217,0.4)]', label: t.holiday_legend },
          { color: 'bg-[#FEECEC] border border-danger', label: t.public_holiday_legend },
          { color: 'bg-today-soft border-2 border-today', label: t.today },
          { color: 'bg-white border-2 border-primary', label: t.selected_legend },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[12px] text-muted font-medium">
            <div className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Mobile Modal for Date Details */}
      {modalOpen && (
        <div
          className="xl:hidden fixed inset-0 z-[200] bg-ink/40 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease_both]"
          onClick={closeModal}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-modal-title"
            className="bg-white rounded-[20px] w-full max-w-[340px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden max-h-[90vh] scale-100 animate-[zoomIn_0.2s_ease_both]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <span id="day-modal-title" className="text-[15px] font-bold text-ink">{selLabel}</span>
                {isTodaySelected && (
                  <span className="text-[10px] font-bold bg-today text-white px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                    {t.today}
                  </span>
                )}
              </div>
              <button ref={closeBtnRef} type="button" aria-label={t.close} onClick={() => setSelectedKey(null)} className="w-10 h-10 grid place-items-center rounded-lg text-muted hover:bg-[#F3F4F8] hover:text-ink cursor-pointer transition-colors bg-transparent border-none">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <DayDetailForm
                variant="modal"
                {...formProps}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
