// เป้ารายได้แยกรายเดือน — คีย์เดือนรูปแบบ 'YYYY-MM' (เดือน 1-12)
// ที่เก็บในเครื่อง (localStorage) ใช้ 2 กรณีเท่านั้น: (1) ย้ายขึ้น DB ครั้งเดียวเมื่อมีตาราง monthly_goal แล้ว
// (2) สำรองเมื่อ DB ยังไม่มีตาราง monthly_goal (ยังไม่ได้รัน monthly_goal_per_month_migration.sql)

/** viewM เป็น 0-11 → 'YYYY-MM' */
export const goalKey = (year, month0) => `${year}-${String(month0 + 1).padStart(2, '0')}`;

const mapKey = (email) => `timeflow_goals_${email}`;
const legacyKey = (email) => `timeflow_goal_${email}`; // เวอร์ชันเก่า: เป้าเดียวทุกเดือน

export function readLocalGoals(email) {
  if (!email) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(mapKey(email)) || '{}');
    const out = {};
    Object.entries(raw || {}).forEach(([k, v]) => { if (/^\d{4}-\d{2}$/.test(k) && Number(v) > 0) out[k] = Number(v); });
    return out;
  } catch { return {}; }
}

export function writeLocalGoal(email, key, value) {
  if (!email) return;
  const map = readLocalGoals(email);
  if (value > 0) map[key] = value; else delete map[key];
  try {
    if (Object.keys(map).length) localStorage.setItem(mapKey(email), JSON.stringify(map));
    else localStorage.removeItem(mapKey(email));
  } catch { /* storage ถูกบล็อก — ข้าม */ }
}

export function clearLocalGoals(email) {
  if (!email) return;
  try { localStorage.removeItem(mapKey(email)); } catch { /* ข้าม */ }
}

/** เป้าเดียวแบบเก่าในเครื่อง (ใช้ย้ายเข้าเดือนปัจจุบันครั้งเดียว แล้วลบทิ้ง) */
export function takeLegacyLocalGoal(email) {
  if (!email) return 0;
  try {
    const v = Number(localStorage.getItem(legacyKey(email))) || 0;
    if (v) localStorage.removeItem(legacyKey(email));
    return v;
  } catch { return 0; }
}
