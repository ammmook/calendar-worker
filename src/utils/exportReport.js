// ส่งออกสรุปรายเดือนเป็น รูปภาพ (PNG) / PDF (พิมพ์) / Excel (CSV)
// ทุกรูปแบบสร้างจาก "statement" ก้อนเดียวกัน → ตัวเลขตรงกันทุกไฟล์
import { LEAVE_META } from '../components/leaveMeta';
import { fmtB, fmt1 } from './format';

const COLORS = {
  base: '#3B4FE4', ot: '#c29302', shift: '#E8730C', income: '#10B981',
  ink: '#111827', ink2: '#374151', muted: '#6B7280', line: '#E8EAEF', danger: '#EF4444',
  primary: '#3B4FE4', backdrop: '#EEF0FD',
};
const FONT = '"Google Sans","Noto Sans Thai","Sarabun","Leelawadee UI",system-ui,sans-serif';

const pad2 = (n) => String(n).padStart(2, '0');

/** รวมข้อมูลเดือนที่ดูอยู่เป็นโครงเดียวสำหรับทุกรูปแบบไฟล์ */
export function buildStatement({ t, lang, viewY, viewM, s, entries, daily, socialSecurity = 0 }) {
  const reg = s.total_regular_earning || 0;
  const ot = s.total_ot_earning || 0;
  const shift = s.total_shift_allowance || 0;
  const gross = reg + ot + shift;
  const yearLabel = lang === 'th' ? viewY + 543 : viewY;
  const monthKey = `${viewY}-${pad2(viewM + 1)}`;

  const otTiers = [
    { label: t.ot_x1, hours: s.total_ot_hour_1 || 0, value: s.total_ot_earning_1 || 0 },
    { label: t.ot_x15, hours: s.total_ot_hour_15 || 0, value: s.total_ot_earning_15 || 0 },
    { label: t.ot_x3, hours: s.total_ot_hour_3 || 0, value: s.total_ot_earning_3 || 0 },
  ].filter((x) => x.hours > 0 || x.value > 0);

  const log = Object.keys(entries || {})
    .filter((k) => k.startsWith(monthKey))
    .sort()
    .map((k) => {
      const e = entries[k];
      const d = daily?.[k] || {};
      const dow = new Date(`${k}T00:00:00`).getDay();
      const isLeave = e.leave !== null && e.leave !== undefined;
      const meta = isLeave ? LEAVE_META[e.leave?.type] || LEAVE_META.vacation : null;
      return {
        key: k,
        day: Number(k.slice(8, 10)),
        dow: t.days_short[dow],
        time: isLeave ? (lang === 'th' ? meta.th : meta.en) : `${e.in || ''}–${e.out || ''}`,
        isLeave,
        hours: d.working_hour || 0,
        otHours: d.ot_hour || 0,
        shift: d.shift_allowance || 0,
        earning: d.total_earning || 0,
        note: e.note || '',
      };
    });

  return {
    lang, t,
    fileBase: `timeflow-${monthKey}`,
    period: `${t.months[viewM]} ${yearLabel}`,
    title: t.export_title,
    reg, ot, shift, gross,
    ss: socialSecurity || 0,
    net: s.total_earning || 0,
    otTiers,
    shiftDays: s.shift_days || 0,
    stats: [
      { label: t.stmt_stat_days, value: String(s.days_worked || 0) },
      { label: t.stmt_stat_ot_days, value: String(s.ot_days || 0) },
      { label: t.stmt_stat_hours, value: fmt1(s.total_working_hour) },
      { label: t.stmt_stat_ot_hours, value: fmt1(s.total_ot_hour) },
    ],
    log,
    generated: new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

// ───────────────────────── CSV (เปิดใน Excel / Google Sheets) ─────────────────────────
const csvCell = (v) => {
  let str = v === null || v === undefined ? '' : String(v);
  // กัน formula injection จากข้อความที่ผู้ใช้พิมพ์ (หมายเหตุ) — ตัวเลขจริงไม่โดน
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};
const csvRow = (cells) => cells.map(csvCell).join(',');
const num = (n) => Number((Number(n) || 0).toFixed(2));

export function statementToCsv(st) {
  const { t } = st;
  const rows = [
    [st.title, st.period],
    [],
    [t.regular_earnings, num(st.reg)],
    ...st.otTiers.map((x) => [`${x.label} (${fmt1(x.hours)} ${t.hr_unit_short})`, num(x.value)]),
    [t.ot_earnings, num(st.ot)],
    [t.shift_earnings, num(st.shift)],
    [t.gross_income, num(st.gross)],
    [t.less_social_security, -num(st.ss)],
    [t.stmt_net, num(st.net)],
    [],
    ...st.stats.map((x) => [x.label, x.value]),
    [],
    [t.stmt_log],
    [t.stmt_col_date, t.stmt_col_time, t.stmt_col_hours, t.stmt_col_ot, t.stmt_col_shift, t.stmt_col_earn, t.stmt_col_note],
    ...st.log.map((r) => [r.key, r.time, num(r.hours), num(r.otHours), num(r.shift), num(r.earning), r.note]),
  ];
  return '﻿' + rows.map(csvRow).join('\r\n');
}

export function statementToCsvBlob(st) {
  return new Blob([statementToCsv(st)], { type: 'text/csv;charset=utf-8' });
}

// ───────────────────────── ดาวน์โหลด / แชร์ ─────────────────────────
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** มือถือ (จอสัมผัส) เปิดหน้าต่างแชร์ของระบบ เช่น ส่งเข้า LINE ; เครื่องอื่นดาวน์โหลดตรง ๆ */
export async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // ผู้ใช้ปิดหน้าต่างแชร์เอง
    }
  }
  downloadBlob(blob, filename);
}

// ───────────────────────── PNG (วาดสลิปบน canvas) ─────────────────────────
async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`400 16px ${FONT}`, 'Ag฿กข'),
      document.fonts.load(`700 16px ${FONT}`, 'Ag฿กข'),
    ]);
    await document.fonts.ready;
  } catch { /* ใช้ฟอนต์สำรองของระบบ */ }
}

const SCALE = 2;
const W = 720;
const SHEET_X = 24;
const CX0 = SHEET_X + 40;      // ขอบซ้ายของเนื้อหา
const CX1 = W - SHEET_X - 40;  // ขอบขวาของเนื้อหา
const TOOTH = 14;              // ขนาดฟันเลื่อยของขอบกระดาษ

function setFont(ctx, weight, size) { ctx.font = `${weight} ${size}px ${FONT}`; }

function leaderRow(ctx, y, { label, sub, amount, color, amountColor = COLORS.ink, indent = 0, size = 15, weight = 400, marker }) {
  const x0 = CX0 + indent;
  ctx.textBaseline = 'alphabetic';
  let lx = x0;
  if (marker) {
    ctx.fillStyle = marker;
    ctx.fillRect(x0, y - 9, 8, 8);
    lx = x0 + 18;
  }
  setFont(ctx, weight, size);
  ctx.fillStyle = color || COLORS.ink2;
  ctx.textAlign = 'left';
  ctx.fillText(label, lx, y);
  let endX = lx + ctx.measureText(label).width;
  if (sub) {
    setFont(ctx, 400, size - 3);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(sub, endX + 8, y);
    endX += 8 + ctx.measureText(sub).width;
  }
  setFont(ctx, 700, size);
  ctx.fillStyle = amountColor;
  ctx.textAlign = 'right';
  ctx.fillText(amount, CX1, y);
  const amountW = ctx.measureText(amount).width;
  // เส้นจุดไข่ปลาเชื่อมชื่อรายการกับยอด
  ctx.strokeStyle = '#C9CDD8';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.setLineDash([0.1, 5]);
  ctx.beginPath();
  ctx.moveTo(endX + 12, y - 3);
  ctx.lineTo(CX1 - amountW - 12, y - 3);
  ctx.stroke();
  ctx.setLineDash([]);
}

function rule(ctx, y, width = 1, color = COLORS.line) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(CX0, y);
  ctx.lineTo(CX1, y);
  ctx.stroke();
}

/** วาดเนื้อหาสลิป คืนค่าพิกัด y สุดท้าย (ใช้วัดความสูงก่อนวาดจริง) */
function drawContent(ctx, st, top) {
  const { t } = st;
  let y = top + 46;

  ctx.textAlign = 'left';
  setFont(ctx, 700, 15);
  ctx.fillStyle = COLORS.primary;
  ctx.fillText('TimeFlow', CX0, y);
  y += 38;
  setFont(ctx, 700, 30);
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(st.period, CX0, y);
  y += 26;
  setFont(ctx, 400, 14);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(st.title, CX0, y);
  y += 22;
  rule(ctx, y);
  y += 34;

  leaderRow(ctx, y, { label: t.regular_earnings, amount: fmtB(st.reg), marker: COLORS.base });
  y += 36;
  leaderRow(ctx, y, { label: t.ot_earnings, amount: fmtB(st.ot), marker: COLORS.ot });
  y += 30;
  for (const tier of st.otTiers) {
    leaderRow(ctx, y, {
      label: tier.label, sub: `${fmt1(tier.hours)} ${t.hr_unit_short}`, amount: fmtB(tier.value),
      indent: 18, size: 13, color: COLORS.muted, amountColor: COLORS.ink2,
    });
    y += 26;
  }
  y += 8;
  leaderRow(ctx, y, {
    label: t.shift_earnings, sub: st.shiftDays ? `${st.shiftDays} ${t.shift_days_label}` : '', amount: fmtB(st.shift), marker: COLORS.shift,
  });
  y += 24;
  rule(ctx, y);
  y += 32;
  leaderRow(ctx, y, { label: t.gross_income, amount: fmtB(st.gross), weight: 700, color: COLORS.ink });
  y += 34;
  leaderRow(ctx, y, { label: t.less_social_security, amount: `−${fmtB(st.ss)}`, amountColor: COLORS.danger });
  y += 26;
  rule(ctx, y, 2, COLORS.ink);
  y += 48;

  setFont(ctx, 700, 17);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'left';
  ctx.fillText(t.stmt_net, CX0, y);
  setFont(ctx, 700, 36);
  ctx.fillStyle = COLORS.income;
  ctx.textAlign = 'right';
  ctx.fillText(fmtB(st.net), CX1, y);
  y += 26;
  rule(ctx, y);
  y += 40;

  // สถิติ 4 ช่อง (ไม่ใส่กรอบ — จัดเรียงด้วยระยะห่าง)
  const colW = (CX1 - CX0) / st.stats.length;
  st.stats.forEach((x, i) => {
    ctx.textAlign = 'left';
    setFont(ctx, 700, 22);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(x.value, CX0 + i * colW, y);
    setFont(ctx, 400, 12);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(x.label, CX0 + i * colW, y + 20);
  });
  y += 62;

  ctx.textAlign = 'center';
  setFont(ctx, 400, 11);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(t.stmt_generated.replace('{date}', st.generated), W / 2, y);
  return y + 34;
}

function sheetPath(ctx, top, bottom) {
  ctx.beginPath();
  ctx.moveTo(SHEET_X, top);
  ctx.lineTo(W - SHEET_X, top);
  ctx.lineTo(W - SHEET_X, bottom - TOOTH);
  // ขอบล่างแบบฟันเลื่อย เหมือนฉีกจากใบสลิป
  const teeth = Math.floor((W - SHEET_X * 2) / TOOTH);
  const tw = (W - SHEET_X * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const x = W - SHEET_X - i * tw;
    ctx.lineTo(x - tw / 2, bottom);
    ctx.lineTo(x - tw, bottom - TOOTH);
  }
  ctx.closePath();
}

export async function statementToPngBlob(st) {
  await ensureFonts();
  const sheetTop = 24;

  // รอบแรก: วัดความสูง
  const probe = document.createElement('canvas').getContext('2d');
  const contentEnd = drawContent(probe, st, sheetTop);
  const H = contentEnd + 24;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = COLORS.backdrop;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = 'rgba(17,24,39,0.10)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#FFFFFF';
  sheetPath(ctx, sheetTop, H - 18);
  ctx.fill();
  ctx.restore();

  drawContent(ctx, st, sheetTop);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))), 'image/png');
  });
}

// ───────────────────────── PDF (หน้าต่างพิมพ์ → Save as PDF) ─────────────────────────
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function statementToHtml(st) {
  const { t } = st;
  const ledger = (label, amount, extra = '') =>
    `<div class="row ${extra}"><span class="lbl">${esc(label)}</span><span class="dots"></span><span class="amt">${esc(amount)}</span></div>`;
  const tiers = st.otTiers
    .map((x) => ledger(`${x.label}  (${fmt1(x.hours)} ${t.hr_unit_short})`, fmtB(x.value), 'sub'))
    .join('');
  const logRows = st.log
    .map((r) => `<tr>
      <td>${esc(r.dow)} ${r.day}</td>
      <td>${esc(r.time)}</td>
      <td class="n">${r.isLeave ? '' : fmt1(r.hours)}</td>
      <td class="n">${r.otHours > 0 ? fmt1(r.otHours) : ''}</td>
      <td class="n">${r.shift > 0 ? fmtB(r.shift) : ''}</td>
      <td class="n">${r.earning > 0 ? fmtB(r.earning) : ''}</td>
      <td class="note">${esc(r.note)}</td></tr>`)
    .join('');

  return `<!doctype html><html lang="${st.lang}"><head><meta charset="utf-8">
<title>${esc(`TimeFlow ${st.period}`)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;700&display=swap">
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${FONT}; color: ${COLORS.ink}; font-size: 12.5px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .brand { color: ${COLORS.primary}; font-weight: 700; font-size: 13px; }
  h1 { font-size: 26px; margin: 2px 0 0; }
  .sub { color: ${COLORS.muted}; margin: 0 0 14px; }
  .sheet { max-width: 520px; }
  .row { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; }
  .row .dots { flex: 1; border-bottom: 1.5px dotted #C9CDD8; transform: translateY(-3px); }
  .row .amt { font-weight: 700; font-variant-numeric: tabular-nums; }
  .row.sub { padding: 2px 0 2px 16px; font-size: 11.5px; color: ${COLORS.muted}; }
  .row.sub .amt { color: ${COLORS.ink2}; }
  .row.neg .amt { color: ${COLORS.danger}; }
  .row.b .lbl { font-weight: 700; }
  .hr { border-top: 1px solid ${COLORS.line}; margin: 8px 0; }
  .hr.heavy { border-top: 2px solid ${COLORS.ink}; margin-top: 10px; }
  .net { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 0 8px; }
  .net .lbl { font-weight: 700; font-size: 14px; }
  .net .amt { font-weight: 700; font-size: 28px; color: ${COLORS.income}; font-variant-numeric: tabular-nums; }
  .stats { display: flex; gap: 28px; margin: 14px 0 22px; }
  .stats b { display: block; font-size: 18px; }
  .stats span { color: ${COLORS.muted}; font-size: 11px; }
  h2 { font-size: 14px; margin: 22px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; color: ${COLORS.muted}; font-weight: 400; border-bottom: 1px solid ${COLORS.ink}; padding: 4px 6px; }
  td { padding: 4px 6px; border-bottom: 1px solid ${COLORS.line}; vertical-align: top; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  th.n { text-align: right; }
  .note { color: ${COLORS.ink2}; }
  tr { break-inside: avoid; }
  .foot { margin-top: 18px; color: ${COLORS.muted}; font-size: 10.5px; }
</style></head><body>
<div class="sheet">
  <div class="brand">TimeFlow</div>
  <h1>${esc(st.period)}</h1>
  <p class="sub">${esc(st.title)}</p>
  <div class="hr"></div>
  ${ledger(t.regular_earnings, fmtB(st.reg))}
  ${ledger(t.ot_earnings, fmtB(st.ot))}
  ${tiers}
  ${ledger(`${t.shift_earnings}${st.shiftDays ? `  (${st.shiftDays} ${t.shift_days_label})` : ''}`, fmtB(st.shift))}
  <div class="hr"></div>
  ${ledger(t.gross_income, fmtB(st.gross), 'b')}
  ${ledger(t.less_social_security, `−${fmtB(st.ss)}`, 'neg')}
  <div class="hr heavy"></div>
  <div class="net"><span class="lbl">${esc(t.stmt_net)}</span><span class="amt">${esc(fmtB(st.net))}</span></div>
  <div class="hr"></div>
  <div class="stats">${st.stats.map((x) => `<div><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join('')}</div>
</div>
${st.log.length ? `<h2>${esc(t.stmt_log)}</h2>
<table><thead><tr>
  <th>${esc(t.stmt_col_date)}</th><th>${esc(t.stmt_col_time)}</th><th class="n">${esc(t.stmt_col_hours)}</th>
  <th class="n">${esc(t.stmt_col_ot)}</th><th class="n">${esc(t.stmt_col_shift)}</th><th class="n">${esc(t.stmt_col_earn)}</th><th>${esc(t.stmt_col_note)}</th>
</tr></thead><tbody>${logRows}</tbody></table>` : ''}
<div class="foot">${esc(t.stmt_generated.replace('{date}', st.generated))}</div>
</body></html>`;
}

/** เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ (เลือก "Save as PDF") — ใช้ iframe ซ่อน ไม่โดนบล็อกป๊อปอัป */
export async function printStatement(st) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(statementToHtml(st));
  doc.close();
  await new Promise((resolve) => {
    iframe.onload = resolve;
    setTimeout(resolve, 1500); // ถ้าโหลดฟอนต์ช้า/ออฟไลน์ ก็พิมพ์ต่อด้วยฟอนต์สำรอง
  });
  try { await doc.fonts?.ready; } catch { /* ข้าม */ }
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => iframe.remove(), 60000);
}
