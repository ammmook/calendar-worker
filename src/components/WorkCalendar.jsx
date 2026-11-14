import React, { useRef } from 'react';
import Swal from 'sweetalert2';
import {
  ChevronLeft, ChevronRight, X, CalendarDays,
  GraduationCap, Moon, Palmtree, Sun,
  CalendarCheck,
} from 'lucide-react';
import DayDetailForm from './DayDetailForm';
import { LEAVE_META } from './leaveMeta';

// ─── Helpers (mirror App.jsx) ─────────────────────────────────────────────────
const dateKey = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayKeyFn = () => {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
};
const fmt1 = (n) => n.toFixed(1);
const fmtB = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────────────────────
// หน้า "ปฏิทินการทำงาน" — ปฏิทิน + panel/modal แก้ไขวัน (สกัดจาก App.jsx)
export default function WorkCalendar({
  viewY, viewM, lang, t, today,
  prevMonth, nextMonth, goToday,
  setViewM, setViewY, showToast,
  entries, setEntries, earningsSummary, holidays, publicHolidays, paymentType,
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
    paymentType, previewCalc,
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

  const goTodayAndSelect = () => {
    goToday();
    setSelectedKey(todayKeyFn());
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_284px] gap-6 w-full">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 animate-[fadeUp_0.4s_ease_both] order-1 xl:col-span-2">
        <div>
          <h1 className="text-[26px] font-bold text-[#111827] tracking-tight leading-tight">{t.work_calendar}</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">
            {t.months[viewM]} {lang === 'th' ? viewY + 543 : viewY}
          </p>
        </div>

        {/* Mobile filters + Today */}
        <div className="flex sm:hidden items-center gap-2 flex-wrap">
          <div className="relative">
            <select value={viewM} onChange={(e) => setViewM(Number(e.target.value))}
              className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-[#3B4FE4]">
              {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
          </div>
          <div className="relative">
            <select value={viewY} onChange={(e) => {
                setViewY(Number(e.target.value));
                showToast(lang === 'th' ? 'กำลังโหลดข้อมูล...' : 'Loading data...');
            }}
              className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[13px] font-medium pl-3 pr-6 py-[7px] cursor-pointer outline-none hover:border-[#3B4FE4]">
              {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{lang === 'th' ? y + 543 : y}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
          </div>
        </div>
      </div>

      {/* ── CALENDAR ── */}
      <div className="bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden animate-[fadeUp_0.4s_0.16s_ease_both] order-2 xl:order-3">

        {/* Calendar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
          <span className="text-[17px] font-bold text-[#111827]">{t.months[viewM]} {lang === 'th' ? viewY + 543 : viewY}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={goTodayAndSelect}
              className="flex items-center gap-1.5 h-[30px] px-3 rounded-lg bg-[#F8F9FB] border border-[#E8EAEF] text-[#6B7280] text-[12px] font-semibold cursor-pointer transition-all hover:bg-[#EEF0FD] hover:border-[#3B4FE4] hover:text-[#3B4FE4]">
              <CalendarCheck size={13} />
              {t.today}
            </button>
            <button onClick={prevMonth}
              className="w-[30px] h-[30px] rounded-lg bg-[#F8F9FB] border border-[#E8EAEF] text-[#6B7280] grid place-items-center cursor-pointer transition-all hover:bg-[#EEF0FD] hover:border-[#3B4FE4] hover:text-[#3B4FE4]">
              <ChevronLeft size={15} />
            </button>
            <button onClick={nextMonth}
              className="w-[30px] h-[30px] rounded-lg bg-[#F8F9FB] border border-[#E8EAEF] text-[#6B7280] grid place-items-center cursor-pointer transition-all hover:bg-[#EEF0FD] hover:border-[#3B4FE4] hover:text-[#3B4FE4]">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Calendar body */}
        <div className="p-4">
          {/* Weekday row */}
          <div className="grid grid-cols-7 mb-1.5">
            {t.days_short.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em] py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells grid */}
          <div className="grid grid-cols-7 gap-[3px]">
            {emptyCells.map((_, i) => <div key={`e-${i}`} />)}
            {dayCells.map((d) => (
              <DayCell
                key={d}
                d={d}
                k={dateKey(viewY, viewM + 1, d)}
                entries={entries}
                todayKey={todayKeyFn()}
                selectedKey={selectedKey}
                holidays={holidays}
                viewY={viewY}
                viewM={viewM}
                dailyEarning={earningsSummary.daily[dateKey(viewY, viewM + 1, d)]}
                handleDayClick={handleDayClick}
                toggleHoliday={toggleHoliday}
                paymentType={paymentType}
                publicHolidays={publicHolidays}
                lang={lang}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: day detail ── */}
      <div className="relative order-3 xl:order-4 min-w-0 xl:h-full">
        <div className="flex flex-col gap-4 min-w-0 overflow-hidden animate-[fadeUp_0.4s_0.20s_ease_both] w-full">

          {/* Day detail card (desktop) */}
          {selectedKey && (
            <div className="hidden xl:flex flex-col bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#E8EAEF]">
              <span className="text-sm font-bold text-[#111827]">{selLabel}</span>
              {isTodaySelected && (
                <span className="text-[10px] font-bold bg-[#6fa3cb] text-white px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
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
          { color: 'bg-[#EEF0FD] border border-[#C7CCFA]', label: t.regular_day_legend },
          { color: 'bg-[#fffdef] border border-[#ffe270]', label: t.ot_day_legend },
          { color: 'bg-[rgba(153,142,217,0.15)] border border-[rgba(153,142,217,0.4)]', label: t.holiday_legend },
          { color: 'bg-[#FEECEC] border border-[#EF4444]', label: t.public_holiday_legend },
          { color: 'bg-[#f0f5fa] border-2 border-[#6fa3cb]', label: t.today },
          { color: 'bg-[#f2f8fa] border-2 border-[#6ab9dc]', label: t.selected_legend },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[12px] text-[#6B7280] font-medium">
            <div className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Mobile Modal for Date Details */}
      {selectedKey && !showLeaveSelector && !showDeleteConfirm && (
        <div
          className="xl:hidden fixed inset-0 z-[200] bg-[#111827]/40 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease_both]"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-[20px] w-full max-w-[340px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden max-h-[90vh] scale-100 animate-[zoomIn_0.2s_ease_both]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEF]">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-[#111827]">{selLabel}</span>
                {isTodaySelected && (
                  <span className="text-[10px] font-bold bg-[#6fa3cb] text-white px-2 py-0.5 rounded-full uppercase tracking-[0.06em]">
                    {t.today}
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedKey(null)} className="w-[30px] h-[30px] grid place-items-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F8] hover:text-[#111827] cursor-pointer transition-colors bg-transparent border-none">
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

// ── DayCell Sub-component (ย้ายจาก App.jsx) ──────────────────────────────────
function DayCell({
  d, k, entries, todayKey, selectedKey, holidays, viewY, viewM,
  dailyEarning, handleDayClick, toggleHoliday, paymentType, publicHolidays, lang, t
}) {
  const entry = entries[k];
  const publicHol = publicHolidays?.[k] || null;
  const publicHolName = publicHol ? (lang === 'th' ? publicHol.name_th : publicHol.name_en) : '';
  const isToday = k === todayKey;
  const isSel = k === selectedKey;
  const isHol = holidays.has(k);
  const dow = new Date(viewY, viewM, d).getDay();
  const isWE = dow === 0 || dow === 6;

  const hTotal = dailyEarning?.working_hour || 0;
  const netOT = dailyEarning?.ot_hour || 0;
  const eEarn = dailyEarning?.total_earning || 0;
  const hasOT = netOT > 0;
  const hasShift = (dailyEarning?.shift_allowance || 0) > 0;
  const hasEntry = !!entry;

  // Leave tag
  const isLeave = entry?.leave !== null && entry?.leave !== undefined;
  const leaveType = entry?.leave?.type;
  const leaveInfo = isLeave && leaveType ? LEAVE_META[leaveType] : null;
  const isTrainingEntry = leaveType === 'training';
  const trainingLabel = lang === 'th' ? 'อบรม/ดูงานนอกสถานที่' : 'Training / Off-site';

  const CornerIcon = isHol ? Palmtree : Sun;

  const isPublicHolIdle = !!publicHol && !hasEntry;

  let baseBg = isHol
    ? 'bg-[rgba(153,142,217,0.15)]'
    : isPublicHolIdle
      ? 'bg-[rgba(239,68,68,0.07)]'
      : hasOT
        ? 'bg-[#fffdef]'
        : hasShift
          ? 'bg-[#FFF3E6]'
          : isToday
            ? 'bg-[#f0f5fa]'
            : 'bg-transparent hover:bg-[#F8F9FB]';

  let baseBorder = isSel
    ? 'border-[#6ab9dc] outline outline-[1.5px] outline-[#6ab9dc] z-10'
    : isPublicHolIdle
      ? 'border-transparent'
      : isHol
        ? 'border-transparent'
        : isToday
          ? 'border-[#6fa3cb] hover:border-[#5c96bb]'
          : hasOT
            ? 'border-transparent hover:border-[#fbde3a]'
            : 'border-transparent hover:border-[#E8EAEF]';

  const cellBg = `${baseBg} ${baseBorder}`;

  // ── Mobile Long Press logic ──
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleTouchStart = (e) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      toggleHoliday(e, k);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div
      onClick={() => {
        // กดค้างสลับวันหยุดแล้ว → ข้าม click ที่ตามมา และรีเซ็ต flag เพื่อไม่ให้ค้างไปกลืนการกดครั้งถัดไป
        if (isLongPress.current) { isLongPress.current = false; return; }
        handleDayClick(k);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative min-h-[72px] sm:min-h-[80px] p-[7px_6px_5px] rounded-lg flex flex-col gap-[2px] border cursor-pointer transition-all duration-[220ms] group ${cellBg}`}
    >
      {/* Day number */}
      <span className={`text-[11px] font-bold leading-none
        ${(publicHol ? 'text-[#EF4444]' : isToday ? 'text-[#6fa3cb]' : isWE ? 'text-[#9CA3AF]' : 'text-[#6B7280]')}`}>
        {d}
      </span>

      {/* ชื่อวันหยุดทางการ */}
      {publicHol && publicHolName && (
        <span className="text-[7px] sm:text-[8px] font-bold text-[#EF4444] leading-tight truncate pr-3.5" title={publicHolName}>
          {publicHolName}
        </span>
      )}

      {/* Leave / Public Holiday / Holiday Toggle */}
      {isLeave && leaveInfo && !isTrainingEntry ? (
        <div
          className="absolute top-0 right-0 w-[20px] h-[25px] rounded-tr-lg rounded-bl-[9px] rounded-br-[9px] flex items-start justify-center pt-[5px] z-20"
          style={{ backgroundColor: leaveInfo.color }}
        >
          <leaveInfo.Icon size={10} strokeWidth={2.5} color="#ffffff" />
        </div>
      ) : publicHol ? (
        <div className="absolute top-[4px] right-[4px] flex items-center justify-center z-20" title={publicHolName}>
          <CalendarDays size={13} strokeWidth={2.25} className="text-[#EF4444]" />
        </div>
      ) : (
        <>
          {isHol && (
            <div className="sm:hidden absolute top-[5px] right-[5px] w-[18px] h-[18px] rounded-[4px] grid place-items-center text-[#998ed9] bg-[rgba(153,142,217,0.15)] border border-[rgba(153,142,217,0.4)]">
              <CornerIcon size={10} strokeWidth={2.5} />
            </div>
          )}
          <button
            title={isHol ? 'Mark as workday' : 'Mark as holiday'}
            onClick={(e) => toggleHoliday(e, k)}
            className={[
              'absolute top-[5px] right-[5px]',
              'w-[18px] h-[18px] rounded-[4px]',
              'hidden sm:grid place-items-center cursor-pointer',
              'transition-all duration-150',
              (isHol ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'),
              (isHol
                ? 'text-[#998ed9] bg-[rgba(153,142,217,0.15)] hover:bg-[rgba(153,142,217,0.25)] border border-[rgba(153,142,217,0.4)]'
                : 'text-[#c29302] bg-[#fffdef] hover:bg-[#ffe270] border border-[#ffe270]'),
            ].join(' ')}
          >
            <CornerIcon size={10} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Entry data */}
      {hasEntry && (
        isTrainingEntry ? (
          <div className="mt-auto flex items-center gap-1 text-[#111827]" title={trainingLabel}>
            <GraduationCap size={11} strokeWidth={2.5} className="shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-bold leading-tight truncate">{trainingLabel}</span>
          </div>
        ) : (
        <div className="mt-auto flex flex-col gap-[2px]">
          <span className="text-[8px] sm:text-[9px] font-medium text-[#9CA3AF] leading-tight truncate">
            {entry.in}–{entry.out}
          </span>
          {hasShift && (
            <span title={t.shift_allowance_title} className="flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold text-[#E8730C] leading-none">
              <Moon size={9} strokeWidth={2.5} />
              +{fmtB(dailyEarning.shift_allowance)}
            </span>
          )}
          <div className="flex justify-between items-end">
            {hasOT ? (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#c29302] leading-none">OT {fmt1(netOT)}h</span>
                {dailyEarning?.ot_earning > 0 && (
                  <span className="text-[8px] font-bold text-[#c29302] leading-none mt-0.5">+{fmtB(dailyEarning.ot_earning)}</span>
                )}
              </div>
            ) : (
              paymentType !== 'monthly' ? (
                <span className="text-[10px] font-bold text-[#6B7280] leading-none">{fmt1(hTotal)}h</span>
              ) : null
            )}
            {eEarn > 0 && paymentType !== 'monthly' && (
              <span className="text-[9px] font-bold text-[#10B981] leading-none hidden sm:block">
                {fmtB(eEarn)}
              </span>
            )}
          </div>
        </div>
        )
      )}
    </div>
  );
}
