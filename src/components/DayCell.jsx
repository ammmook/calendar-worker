import React, { useEffect, useRef } from 'react';
import { CalendarDays, GraduationCap, Moon, Palmtree, Sun } from 'lucide-react';
import { LEAVE_META } from './leaveMeta';
import { fmt1, fmtB } from '../utils/format';

// ช่องวันในปฏิทิน
// โครงสร้างเพื่อ accessibility: ปุ่มหลัก (เลือกวัน) คลุมทั้งช่องด้วย absolute inset-0,
// เนื้อหาภายในเป็นภาพ (aria-hidden) แล้วสรุปเป็นข้อความใน aria-label ของปุ่มแทน,
// ปุ่มสลับวันหยุดเป็นพี่น้องกัน (ไม่ซ้อนปุ่มในปุ่ม)
function DayCell({
  d, k, entry, isToday, isSel, isHol, isWE, dow, publicHol, dailyEarning,
  handleDayClick, toggleHoliday, paymentType, viewM, lang, t,
}) {
  const publicHolName = publicHol ? (lang === 'th' ? publicHol.name_th : publicHol.name_en) : '';

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
  const trainingLabel = t.training_offsite;

  const CornerIcon = isHol ? Palmtree : Sun;
  const isPublicHolIdle = !!publicHol && !hasEntry;

  const baseBg = isHol
    ? 'bg-[rgba(153,142,217,0.15)]'
    : isPublicHolIdle
      ? 'bg-[rgba(239,68,68,0.07)]'
      : hasOT
        ? 'bg-ot-soft'
        : hasShift
          ? 'bg-shift-soft'
          : isToday
            ? 'bg-today-soft'
            : isWE
              ? 'bg-surface-alt/70 hover:bg-surface-alt'
              : 'bg-transparent hover:bg-surface-alt';

  // วันที่เลือก = วงสีคราม (primary) หนา 2px ; วันนี้ = ขอบฟ้า — แยกจากกันชัดเจน
  const baseBorder = isSel
    ? 'border-primary outline outline-2 outline-primary z-10'
    : isPublicHolIdle || isHol
      ? 'border-transparent'
      : isToday
        ? 'border-today hover:border-today-ink'
        : hasOT
          ? 'border-transparent hover:border-ot-bar'
          : 'border-transparent hover:border-line';

  // ── ข้อความสำหรับ screen reader ──
  const parts = [`${t.days_long[dow]} ${d} ${t.months[viewM]}`];
  if (isToday) parts.push(t.today);
  if (publicHol) parts.push(publicHolName || t.public_holiday_legend);
  else if (isHol) parts.push(t.holiday_legend);
  if (leaveInfo) parts.push(lang === 'th' ? leaveInfo.th : leaveInfo.en);
  else if (hasEntry) {
    parts.push(`${entry.in}–${entry.out}`);
    if (hasOT) parts.push(`${t.overtime} ${fmt1(netOT)}h`);
    if (hasShift) parts.push(t.shift_short);
  }
  const ariaLabel = parts.join(', ');

  // ── Mobile Long Press logic ──
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  // วันนักขัตฤกษ์/วันลาจริง สลับวันหยุดไม่ได้ (เงื่อนไขเดียวกับปุ่มสลับด้านล่าง)
  const canToggleHoliday = !(isLeave && leaveInfo && !isTrainingEntry) && !publicHol;

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const handleTouchStart = (e) => {
    isLongPress.current = false;
    if (!canToggleHoliday) return;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      toggleHoliday(e, k);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 600);
  };
  // เคลียร์ timer ตอน unmount กัน toggle หลังช่องหายไปแล้ว
  useEffect(() => cancelLongPress, []);

  const handleClick = () => {
    // กดค้างสลับวันหยุดแล้ว → ข้าม click ที่ตามมา และรีเซ็ต flag เพื่อไม่ให้ค้างไปกลืนการกดครั้งถัดไป
    if (isLongPress.current) { isLongPress.current = false; return; }
    handleDayClick(k);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative flex flex-col min-h-[84px] sm:min-h-[92px] rounded-lg border transition-colors duration-200 group ${baseBg} ${baseBorder}`}
    >
      {/* ปุ่มเลือกวัน — คลุมทั้งช่อง */}
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-pressed={isSel}
        aria-current={isToday ? 'date' : undefined}
        className="absolute inset-0 w-full h-full rounded-lg bg-transparent border-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />

      {/* เนื้อหาที่มองเห็น (ไม่รับเมาส์/สัมผัส ปล่อยให้ปุ่มด้านล่างรับ) */}
      <div aria-hidden="true" className="pointer-events-none flex-1 flex flex-col gap-[2px] overflow-hidden px-1 sm:px-1.5 pt-[7px] pb-[5px]">
        {/* Day number */}
        <span className={`text-xs font-bold leading-none
          ${publicHol ? 'text-danger' : isToday ? 'text-today-ink' : isWE ? 'text-muted' : 'text-ink-2'}`}>
          {d}
        </span>

        {/* ชื่อวันหยุดทางการ */}
        {publicHol && publicHolName && (
          <span className="hidden sm:block text-[10px] font-bold text-danger leading-tight truncate pr-3.5">
            {publicHolName}
          </span>
        )}

        {/* ไอคอนวันลา / วันหยุดทางการ / วันหยุดของผู้ใช้ (มือถือ) */}
        {isLeave && leaveInfo && !isTrainingEntry ? (
          <div
            className="absolute top-0 right-0 w-[22px] h-[26px] rounded-tr-lg rounded-bl-[9px] rounded-br-[9px] flex items-start justify-center pt-[5px] z-20"
            style={{ backgroundColor: leaveInfo.color }}
          >
            <leaveInfo.Icon size={11} strokeWidth={2.5} color="#ffffff" />
          </div>
        ) : publicHol ? (
          <div className="absolute top-[4px] right-[4px] flex items-center justify-center z-20">
            <CalendarDays size={14} strokeWidth={2.25} className="text-danger" />
          </div>
        ) : (
          isHol && (
            <div className="sm:hidden absolute top-[5px] right-[5px] w-5 h-5 rounded-[4px] grid place-items-center text-[#998ed9] bg-[rgba(153,142,217,0.15)] border border-[rgba(153,142,217,0.4)]">
              <CornerIcon size={11} strokeWidth={2.5} />
            </div>
          )
        )}

        {/* Entry data */}
        {hasEntry && !(isLeave && !isTrainingEntry) && (
          isTrainingEntry ? (
            <div className="mt-auto flex items-center gap-1 text-ink">
              <GraduationCap size={12} strokeWidth={2.5} className="shrink-0" />
              <span className="hidden sm:inline text-[10px] font-bold leading-tight truncate">{trainingLabel}</span>
            </div>
          ) : (
            <div className="mt-auto flex flex-col gap-[2px]">
              {/* มือถือ: ช่องแคบ (~46px) แสดงแค่ข้อมูลหลักอย่างเดียว ส่วนรายละเอียดเต็มอยู่ใน modal / aria-label */}
              <span className="hidden sm:block text-[10px] font-medium text-muted leading-tight truncate">
                {entry.in}–{entry.out}
              </span>
              {!hasOT && !hasShift && (
                <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              {hasShift && (
                <span className="flex items-center gap-0.5 text-[7px] sm:text-[10px] tracking-tight font-bold text-shift leading-none whitespace-nowrap">
                  <Moon size={10} strokeWidth={2.5} className="hidden sm:block" />
                  <span>+{fmtB(dailyEarning.shift_allowance)}</span>
                </span>
              )}
              <div className="flex justify-between items-end">
                {hasOT ? (
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-ot leading-none whitespace-nowrap">
                      <span className="sm:hidden">{fmt1(netOT)}h</span>
                      <span className="hidden sm:inline">OT {fmt1(netOT)}h</span>
                    </span>
                    {dailyEarning?.ot_earning > 0 && (
                      <span className="text-[7px] sm:text-[10px] tracking-tight font-bold text-ot leading-none mt-0.5 whitespace-nowrap">
                        +{fmtB(dailyEarning.ot_earning)}
                      </span>
                    )}
                  </div>
                ) : (
                  paymentType !== 'monthly' ? (
                    <span className="text-[11px] font-bold text-muted leading-none">{fmt1(hTotal)}h</span>
                  ) : null
                )}
                {eEarn > 0 && paymentType !== 'monthly' && (
                  <span className="text-[10px] font-bold text-income leading-none hidden sm:block">
                    {fmtB(eEarn)}
                  </span>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* ปุ่มสลับวันหยุด (วันหยุดทางการ/วันลาไม่มีปุ่มนี้) — อยู่นอก aria-hidden เพื่อให้ใช้ด้วยคีย์บอร์ดได้ */}
      {canToggleHoliday && (
        <button
          type="button"
          title={isHol ? t.mark_workday : t.mark_holiday}
          aria-label={isHol ? t.mark_workday : t.mark_holiday}
          aria-pressed={isHol}
          onClick={(e) => toggleHoliday(e, k)}
          className={[
            'absolute top-[5px] right-[5px] z-20',
            'w-5 h-5 rounded-[4px]',
            'hidden sm:grid place-items-center cursor-pointer',
            'transition-opacity duration-150',
            'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary',
            isHol
              ? 'opacity-100 text-[#998ed9] bg-[rgba(153,142,217,0.15)] hover:bg-[rgba(153,142,217,0.25)] border border-[rgba(153,142,217,0.4)]'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 text-ot bg-ot-soft hover:bg-ot-line border border-ot-line',
          ].join(' ')}
        >
          <CornerIcon size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export default React.memo(DayCell);
