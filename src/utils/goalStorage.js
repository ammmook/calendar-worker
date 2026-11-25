// ที่เก็บเป้ารายได้ในเครื่อง (localStorage) แยกตามอีเมล
// ใช้ 2 กรณีเท่านั้น: (1) ย้ายค่าเก่าขึ้น DB ครั้งเดียว (2) สำรองเมื่อ DB ยังไม่มีคอลัมน์ monthly_goal
const keyOf = (email) => `timeflow_goal_${email}`;

export function readLocalGoal(email) {
  if (!email) return 0;
  try { return Number(localStorage.getItem(keyOf(email))) || 0; } catch { return 0; }
}

export function writeLocalGoal(email, value) {
  if (!email) return;
  try {
    if (value > 0) localStorage.setItem(keyOf(email), String(value));
    else localStorage.removeItem(keyOf(email));
  } catch { /* storage ถูกบล็อก — ข้าม */ }
}

export function clearLocalGoal(email) { writeLocalGoal(email, 0); }
