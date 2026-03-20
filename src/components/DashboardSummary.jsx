import React from 'react';
import { Clock, Timer, Banknote } from 'lucide-react';
import { SummaryCard } from './SummaryCard';

export function DashboardSummary({ regularHours, otHours, estimatedEarnings }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
      <SummaryCard 
        title="Regular Hours" 
        value={`${regularHours}h`} 
        icon={Clock} 
      />
      <SummaryCard 
        title="Overtime (OT)" 
        value={`${otHours}h`} 
        icon={Timer} 
      />
      <SummaryCard 
        title="Est. Earnings" 
        value={`฿${estimatedEarnings.toLocaleString()}`} 
        icon={Banknote}
        highlight={true}
      />
    </div>
  );
}
