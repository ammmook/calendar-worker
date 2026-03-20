import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calculator, CalendarDays } from 'lucide-react';

export function HeaderControls({ currentMonth, onPrevMonth, onNextMonth, wageRate, onWageChange }) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-8">
      <div className="flex items-center gap-6 w-full md:w-auto">
        <div className="hidden md:flex items-center justify-center p-3 bg-brand-50 rounded-2xl">
          <CalendarDays className="text-brand-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 hidden md:block">Time & OT Tracker</h1>
          <p className="text-slate-500 hidden md:block text-sm mt-1">Manage your work hours efficiently</p>
        </div>
        
        <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm w-full md:w-auto justify-between md:ml-auto">
          <button 
            onClick={onPrevMonth}
            className="p-2 sm:p-2.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="w-32 sm:w-40 text-center font-semibold text-slate-700">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button 
            onClick={onNextMonth}
            className="p-2 sm:p-2.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex items-center w-full md:w-auto">
        <label className="sr-only" htmlFor="wage-rate">Hourly Wage Rate (฿)</label>
        <div className="relative w-full md:w-auto flex items-center bg-white rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all overflow-hidden group hover:border-slate-300 cursor-text">
          <div className="pl-4 text-slate-400 group-focus-within:text-brand-500 transition-colors">
            <Calculator size={20} />
          </div>
          <input 
            id="wage-rate"
            type="number"
            min="0"
            value={wageRate || ''}
            onChange={(e) => onWageChange(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full md:w-36 py-3 px-3 bg-transparent border-none focus:outline-none text-slate-800 font-semibold text-lg"
            placeholder="Hourly Wage"
          />
          <span className="pr-5 text-slate-400 font-medium select-none">฿/hr</span>
        </div>
      </div>
    </div>
  );
}
