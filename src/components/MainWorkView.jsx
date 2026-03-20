import React, { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth } from 'date-fns';
import { DayCell } from './DayCell';

export function MainWorkView({ currentMonth, entries, onDayClick }) {
  // Generate calendar days
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Extract entries by date string (YYYY-MM-DD) for O(1) lookup
  const entryMap = useMemo(() => {
    const map = {};
    entries.forEach(entry => {
      const dateStr = format(entry.date, 'yyyy-MM-dd');
      map[dateStr] = entry;
    });
    return map;
  }, [entries]);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full">
      {/* Mobile View: Vertical List */}
      <div className="md:hidden flex flex-col gap-1 pb-10">
        {days.filter(day => isSameMonth(day, currentMonth)).map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <DayCell 
              key={dateStr} 
              day={day} 
              data={entryMap[dateStr]} 
              isMobile={true} 
              onClick={() => onDayClick(day)}
            />
          );
        })}
      </div>

      {/* Desktop View: Grid Calendar */}
      <div className="hidden md:block bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-10">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-sm font-bold text-slate-400 uppercase tracking-wider text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-3">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, currentMonth);
            
            return (
              <div key={dateStr} className={`${!inMonth ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <DayCell 
                  day={day} 
                  data={entryMap[dateStr]} 
                  onClick={() => onDayClick(day)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
