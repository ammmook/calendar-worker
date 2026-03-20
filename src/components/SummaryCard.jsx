import React from 'react';

export function SummaryCard({ title, value, icon: Icon, highlight = false, subtitle = '' }) {
  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${highlight ? 'bg-gradient-to-br from-brand-50 to-white border-brand-100 shadow-sm' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${highlight ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div>
        <p className={`text-4xl font-bold tracking-tight ${highlight ? 'text-brand-600' : 'text-slate-800'}`}>
          {value}
        </p>
        {subtitle && (
          <p className="mt-1.5 text-sm outline text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
