import React from 'react';
import { format, isToday } from 'date-fns';
import { Clock, Stethoscope, UmbrellaOff, Plane } from 'lucide-react';

const LEAVE_TYPES = [
  { key: 'sick', label: 'Sick', icon: Stethoscope, color: '#F43F5E', bg: '#FFF1F3' },
  { key: 'personal', label: 'Personal', icon: UmbrellaOff, color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'vacation', label: 'Vacation', icon: Plane, color: '#3B4FE4', bg: '#EEF0FD' },
];

export function DayCell({ day, data, onClick, isMobile = false, isHoliday = false }) {
  const hasData = !!data;
  const isSelected = isToday(day);
  const isLeave = data?.leave !== null && data?.leave !== undefined;
  const leaveInfo = isLeave ? LEAVE_TYPES.find(t => t.key === data.leave?.type) : null;
  
  // Don't show leave tag if it's a holiday
  const showLeaveTag = isLeave && !isHoliday;
  
  if (isMobile) {
    return (
      <div 
        onClick={onClick}
        className={`w-full p-4 mb-3 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-[0.98]
          ${isSelected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-xl font-bold ${isSelected ? 'text-brand-600' : 'text-slate-800'}`}>
              {format(day, 'd')}
            </span>
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              {format(day, 'EEEE')}
            </span>
          </div>
          {showLeaveTag && leaveInfo && (
            <span className="px-3 py-1 text-xs font-bold rounded-full text-white flex items-center gap-1.5 shadow-sm border border-opacity-20"
              style={{ backgroundColor: leaveInfo.color }}>
              <leaveInfo.icon size={12} />
              {leaveInfo.label}
            </span>
          )}
          {!isLeave && hasData && data.otHours > 0 && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 shadow-sm border border-orange-200">
              {data.otHours}h OT
            </span>
          )}
        </div>
        
        {isLeave ? (
          <div className="flex items-center justify-center bg-opacity-10 p-4 rounded-xl border border-dashed"
            style={{ backgroundColor: leaveInfo?.bg, borderColor: leaveInfo?.color + '40' }}>
            <span className="font-semibold text-slate-600">{leaveInfo?.label} Leave</span>
          </div>
        ) : hasData ? (
          <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center text-sm font-medium text-slate-600 gap-1.5">
                <Clock size={16} className="text-slate-400" />
                <span>{data.clockIn} — {data.clockOut}</span>
              </div>
              <div className="text-sm mt-1">
                <span className="font-bold text-slate-800 text-lg">{data.regularHours}h</span>
                <span className="text-slate-500 font-medium ml-1.5 uppercase text-xs tracking-wide">regular</span>
              </div>
            </div>
            {data.otEarnings > 0 && (
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase font-semibold mb-0.5 tracking-wider">Earnings</div>
                <div className="text-lg font-bold text-brand-600">+฿{data.otEarnings.toLocaleString()}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-center h-16 border-dashed">
            No entry for this day
          </div>
        )}
      </div>
    );
  }

  // Grid cell layout for desktop
  return (
    <div 
      onClick={onClick}
      className={`min-h-[140px] p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 flex flex-col group
        ${isSelected ? 'border-brand-500 ring-2 ring-brand-500 bg-brand-50/50 shadow-brand-100 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center transition-colors
          ${isSelected ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-700 group-hover:bg-slate-100'}`}>
          {format(day, 'd')}
        </span>
        {showLeaveTag && leaveInfo && (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full text-white text-opacity-90 flex items-center gap-1 border border-opacity-20"
            style={{ backgroundColor: leaveInfo.color }}>
            <leaveInfo.icon size={11} />
            {leaveInfo.label}
          </span>
        )}
        {!isLeave && hasData && data.otHours > 0 && (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200 border-opacity-50">
            {data.otHours}h OT
          </span>
        )}
      </div>
      
      {isLeave && leaveInfo ? (
        <div className="mt-auto flex items-center justify-center p-2 rounded-lg text-sm font-semibold text-opacity-80"
          style={{ backgroundColor: leaveInfo.bg, color: leaveInfo.color }}>
          {leaveInfo.label}
        </div>
      ) : hasData && (
        <div className="mt-auto flex flex-col gap-2">
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg w-fit border border-slate-200 flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />
            {data.clockIn} - {data.clockOut}
          </div>
          <div className="flex justify-between items-end mt-1 px-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <span className="font-extrabold text-slate-800 text-sm mr-1">{data.regularHours}h</span>Reg
            </span>
            {data.otEarnings > 0 && (
              <span className="text-sm font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">+฿{data.otEarnings.toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
