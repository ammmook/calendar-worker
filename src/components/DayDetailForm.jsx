import React from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import TimePicker from './TimePicker';
import { isValidTimeValue } from './timeUtils';
import { LEAVE_META } from './leaveMeta';

const fmt1 = (n) => n.toFixed(1);
const fmtB = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AnimatedWaitText = () => {
  const [dots, setDots] = React.useState('');
  React.useEffect(() => {
    const seq = ['.  ', '.. ', '...', '.. '];
    let i = 0;
    const timer = setInterval(() => { i = (i + 1) % seq.length; setDots(seq[i]); }, 300);
    return () => clearInterval(timer);
  }, []);
  return <span className="inline-block text-left whitespace-pre">{dots}</span>;
};

// ขนาด/ระยะของแต่ละ variant (panel = desktop side panel, modal = มือถือ)
const VARIANT = {
  panel: {
    gap: 'gap-3',
    timeGrid: 'grid-cols-1 sm:grid-cols-2',
    box: 'p-3 gap-2',
    firstRowMb: 'mb-2.5',
    val: 'text-[13px]',
    sub: 'text-[10px]',
    subList: 'pl-3 -mt-0.5',
    earnVal: 'text-[13px]',
    actions: 'gap-2 mt-1',
    delBtn: 'px-4 py-2.5',
    delIcon: 16,
    saveBtn: 'py-2.5 text-[13px] gap-2',
    saveInner: 'gap-2',
    saveIcon: 14,
    saveActive: 'hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(59,79,228,0.32)]',
  },
  modal: {
    gap: 'gap-4',
    timeGrid: 'grid-cols-2',
    box: 'p-4 gap-3',
    firstRowMb: 'mb-2',
    val: 'text-[14px]',
    sub: 'text-[11px]',
    subList: 'pl-3 -mt-1',
    earnVal: 'text-[16px]',
    actions: 'gap-2.5 mt-2',
    delBtn: 'px-5 py-3.5',
    delIcon: 18,
    saveBtn: 'py-3.5 text-[14px] gap-2.5',
    saveInner: 'gap-2.5',
    saveIcon: 16,
    saveActive: 'shadow-[0_4px_14px_rgba(59,79,228,0.25)]',
  },
};

const ROW_LABEL = 'text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.07em]';

// ฟอร์มรายละเอียดวัน (วันทำงาน / วันลา) — ใช้ร่วมกันทั้ง desktop panel และ modal มือถือ
export default function DayDetailForm({
  variant = 'panel',
  lang, t,
  selectedKey, entries, setEntries, showToast,
  dIn, dOut, setDIn, setDOut, dNote, setDNote,
  isSelectedHoliday, isSavingEntry, isDeletingEntry,
  saveSelectedEntry, deleteSelectedEntry,
  paymentType, previewCalc, calc,
  labelCls, inputCls,
}) {
  const v = VARIANT[variant];
  const [noteFocus, setNoteFocus] = React.useState(false);
  const entry = entries[selectedKey];
  const {
    detHReg, netDetOT, detE, detOTRateEarn, detShift,
    detOT15h, detOT15e, detOT1h, detOT1e, detOT3h, detOT3e,
  } = calc;

  // ── วันลา / อบรม ──
  if (entry?.leave !== null && entry?.leave !== undefined) {
    const info = LEAVE_META[entry.leave?.type] || LEAVE_META.sick;
    const isTraining = entry.leave?.type === 'training';
    const showDelete = entry._id || entry.leave;
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="bg-[#F8F9FB] rounded-[10px] p-4 flex flex-col gap-3">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-2" style={{ backgroundColor: info.bg }}>
              <info.Icon size={28} style={{ color: info.color }} />
            </div>
            <div className="text-sm font-bold text-[#111827]">{lang === 'th' ? info.th : info.en}</div>
            <div className="text-xs text-[#9CA3AF] mt-1">
              {isTraining
                ? (lang === 'th' ? 'บันทึกการอบรมแล้ว' : 'Training recorded for this day')
                : (lang === 'th' ? 'บันทึกการลาแล้ว' : 'Leave recorded for this day')}
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full">
          {showDelete && (
            <button
              onClick={deleteSelectedEntry}
              disabled={isDeletingEntry}
              title={t.delete_entry || 'Delete'}
              aria-label={t.delete_entry || 'Delete'}
              className={`${v.delBtn} rounded-[10px] border-none transition-all flex items-center justify-center shrink-0
                ${isDeletingEntry
                  ? 'bg-[#E8EAEF] text-[#9CA3AF] cursor-not-allowed'
                  : 'bg-[#FFF1F3] text-[#F43F5E] cursor-pointer hover:bg-[#FEE2E2]'}`}
            >
              {isDeletingEntry ? <AnimatedWaitText /> : <Trash2 size={v.delIcon} />}
            </button>
          )}
          <button
            onClick={() => {
              setEntries((p) => ({ ...p, [selectedKey]: { ...p[selectedKey], leave: null } }));
              showToast(lang === 'th' ? 'เปลี่ยนเป็นวันทำงาน' : 'Changed to working day');
            }}
            className="flex-1 py-2.5 rounded-[10px] border border-[#E8EAEF] text-[#6B7280] font-semibold text-sm hover:bg-[#F8F9FB] transition-colors"
          >
            {lang === 'th' ? 'เปลี่ยนเป็นวันทำงาน' : 'Change to Working Day'}
          </button>
        </div>
      </div>
    );
  }

  // ── วันทำงาน ──
  const hasOtBreakdown = previewCalc && (detOT15h > 0 || detOT1h > 0 || detOT3h > 0);
  const showDelete = entry?._id || entry?.in;
  const saveDisabled = !isValidTimeValue(dIn) || (!!dOut && !isValidTimeValue(dOut)) || isSelectedHoliday || isSavingEntry;
  const lockedCls = isSelectedHoliday ? 'bg-[#E8EAEF]' : '';

  const otRows = [
    { show: detOT15h > 0, label: 'OT ×1.5', h: detOT15h, e: detOT15e },
    { show: detOT1h > 0,  label: 'OT ×1',   h: detOT1h,  e: detOT1e  },
    { show: detOT3h > 0,  label: 'OT ×3',   h: detOT3h,  e: detOT3e  },
  ];

  return (
    <div className={`flex flex-col ${v.gap} w-full min-w-0`}>
      {/* Time inputs */}
      <div className={`grid ${v.timeGrid} gap-3 w-full min-w-0`}>
        <div className="min-w-0">
          <label className={labelCls}>{t.clock_in}</label>
          <TimePicker value={dIn} onChange={setDIn} className={`${inputCls} ${lockedCls}`} disabled={isSelectedHoliday} />
        </div>
        <div className="min-w-0">
          <label className={labelCls}>{t.clock_out}</label>
          <TimePicker value={dOut} onChange={setDOut} className={`${inputCls} ${lockedCls}`} disabled={isSelectedHoliday} />
        </div>
      </div>

      {/* Calc summary */}
      <div className={`bg-[#F8F9FB] rounded-[10px] flex flex-col ${v.box}`}>
        <div className={`flex justify-between items-center ${v.firstRowMb}`}>
          <span className={ROW_LABEL}>{t.regular}</span>
          <span className={`${v.val} font-bold text-[#3B4FE4]`}>{detHReg > 0 ? fmt1(detHReg) + 'h' : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className={ROW_LABEL}>{t.overtime}</span>
          <div className="text-right">
            <div className={`${v.val} font-bold text-[#c29302]`}>{netDetOT > 0 ? fmt1(netDetOT) + 'h' : '—'}</div>
            {netDetOT > 0 && detOTRateEarn > 0 && (
              <div className={`${v.sub} font-bold text-[#c29302] leading-none`}>+{fmtB(detOTRateEarn)}</div>
            )}
          </div>
        </div>
        {/* รายละเอียด OT แยกอัตรา (ก่อนบันทึก) */}
        {hasOtBreakdown && (
          <div className={`flex flex-col gap-1 ${v.subList}`}>
            {otRows.filter((r) => r.show).map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className={`${v.sub} font-medium text-[#c29302]`}>{r.label} · {fmt1(r.h)}h</span>
                <span className={`${v.sub} font-bold text-[#c29302]`}>+{fmtB(r.e)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className={ROW_LABEL}>{t.total}</span>
          <span className={`${v.val} font-bold text-[#111827]`}>{detHReg > 0 || netDetOT > 0 ? fmt1(detHReg + netDetOT) + 'h' : '—'}</span>
        </div>
        <hr className="border-[#E8EAEF]" />
        {detShift > 0 && (
          <div className="flex justify-between items-center">
            <span className={ROW_LABEL}>{t.shift_earnings}</span>
            <span className={`${v.val} font-bold text-[#E8730C]`}>+{fmtB(detShift)}</span>
          </div>
        )}
        {(paymentType !== 'monthly' || detE > 0) && (
          <div className="flex justify-between items-center">
            <span className={ROW_LABEL}>{t.earnings}</span>
            <span className={`${v.earnVal} font-bold text-[#10B981]`}>{detE > 0 ? fmtB(detE) : '—'}</span>
          </div>
        )}
      </div>

      {/* Note — แถวเดียว ขยายเป็น 3 แถวเมื่อโฟกัส/มีข้อความ */}
      <textarea
        value={dNote || ''}
        onChange={(e) => setDNote(e.target.value)}
        onFocus={() => setNoteFocus(true)}
        onBlur={() => setNoteFocus(false)}
        rows={noteFocus || dNote ? 3 : 1}
        maxLength={500}
        disabled={isSelectedHoliday}
        placeholder={t.note_placeholder}
        aria-label={t.note}
        className="w-full min-w-0 resize-none rounded-[10px] border border-[#E8EAEF] bg-white px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#3B4FE4] disabled:bg-[#E8EAEF] transition-all"
      />

      {/* Save / Update / Delete */}
      <div className={`flex ${v.actions} w-full`}>
        {showDelete && (
          <button
            onClick={deleteSelectedEntry}
            disabled={isSelectedHoliday || isDeletingEntry}
            title={t.delete_entry}
            aria-label={t.delete_entry}
            className={`${v.delBtn} rounded-[10px] border-none transition-all flex items-center justify-center shrink-0
              ${isSelectedHoliday || isDeletingEntry
                ? 'bg-[#E8EAEF] text-[#9CA3AF] cursor-not-allowed'
                : 'bg-[#F8F9FB] text-[#9CA3AF] cursor-pointer hover:bg-[#E8EAEF] hover:text-[#6B7280]'}`}
          >
            {isDeletingEntry ? <AnimatedWaitText /> : <Trash2 size={v.delIcon} />}
          </button>
        )}
        <button
          onClick={saveSelectedEntry}
          disabled={saveDisabled}
          className={`flex-1 ${v.saveBtn} rounded-[10px] text-white font-bold border-none transition-all flex items-center justify-center relative overflow-hidden
            ${isSelectedHoliday
              ? 'bg-[#D1D5E0] cursor-not-allowed'
              : isSavingEntry
                ? 'bg-[#7B8CED] cursor-wait text-transparent'
                : `bg-[#3B4FE4] cursor-pointer hover:bg-[#2A3BC0] ${v.saveActive}`}`}
        >
          <div className={`flex items-center ${v.saveInner} transition-opacity ${isSavingEntry ? 'opacity-0' : 'opacity-100'}`}>
            <CheckCircle2 size={v.saveIcon} />
            <span>{entry?.in ? t.update_entry : t.save_entry}</span>
          </div>
          {isSavingEntry && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <AnimatedWaitText />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
