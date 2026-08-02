import React from 'react';

// ─── DonutChart ───────────────────────────────────────────────────────────────
// segments: [{ label, value, color }] ; center overlay = centerLabel + centerValue
export function DonutChart({ segments, centerLabel, centerValue, size = 200, thickness = 28 }) {
  const total = segments.reduce((a, seg) => a + Math.max(0, seg.value), 0);
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total <= 0 ? (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F3F4F8" strokeWidth={thickness} />
          ) : (
            segments.map((seg, i) => {
              const v = Math.max(0, seg.value);
              if (v <= 0) return null;
              const len = (v / total) * circ;
              const el = (
                <circle
                  key={i}
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none" stroke={seg.color} strokeWidth={thickness}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-500"
                />
              );
              offset += len;
              return el;
            })
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em]">{centerLabel}</span>
        <span className="text-[17px] font-bold text-[#111827] leading-tight mt-0.5 break-all">{centerValue}</span>
      </div>
    </div>
  );
}

// ─── LegendRow ────────────────────────────────────────────────────────────────
export function LegendRow({ color, label, sub, value, total, raw }) {
  const pct = total > 0 ? Math.round((Math.max(0, raw) / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-3 h-3 rounded-[4px] shrink-0" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-[#374151] leading-tight truncate">{label}</div>
        {sub && <div className="text-[10px] text-[#9CA3AF] leading-tight truncate">{sub}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-[12px] font-bold text-[#111827] leading-tight">{value}</div>
        <div className="text-[10px] text-[#9CA3AF] leading-tight">{pct}%</div>
      </div>
    </div>
  );
}
