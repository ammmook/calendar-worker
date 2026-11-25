import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight,
  LayoutDashboard, Settings2,
  Clock, TrendingUp, Wallet,
  Sun, Palmtree, Plane,
  Timer, CircleDollarSign, Banknote,
  CalendarDays, CheckCircle2, BarChart2,
  LogOut, UserCircle2, ChevronDown, X, Trash2,
  Stethoscope, UmbrellaOff, AlertCircle, Loader2,
  Moon, GraduationCap, Monitor,
} from 'lucide-react';
import useConfirm from './components/useConfirm';
import SelectField from './components/SelectField';
import SegmentedControl from './components/SegmentedControl';
import { withViewTransition } from './utils/viewTransition';
import YearlyDashboard from './components/YearlyDashboard';
import WorkCalendar from './components/WorkCalendar';
import MonthlySummary from './components/MonthlySummary';
import { LeaveSelector } from './components/LeaveSelector';
import { getLang } from './locales';
import { useAuth } from './components/AuthContext';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import { isValidTimeValue } from './components/timeUtils';
import { UserAPI, WorkEntryAPI, HolidayAPI, PublicHolidayAPI, sheetEntriesToFrontend, frontendEntryToSheet } from './services/api';
import { todayKey, yearOptions } from './utils/format';
import { readLocalGoal, writeLocalGoal, clearLocalGoal } from './utils/goalStorage';
import { isDesktopViewport } from './utils/viewport';
import { calcWorkDay, parseWorkSpan, addDaysStr, baseHourlyRate } from './utils/payCalc';
import { SkeletonCalendarView, SkeletonMonthly, SkeletonYearly, SkeletonAuthLoading } from './components/SkeletonLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** log เฉพาะตอน dev (ไม่ปล่อยอีเมล/ข้อมูลผู้ใช้ออก console ของ production) */
const devLog = (...a) => { if (import.meta.env.DEV) console.log(...a); };
/** สั่น (haptic) — no-op ถ้าเบราว์เซอร์ไม่รองรับ (เช่น iOS Safari) */
const vibrate = (pattern) => {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch { /* ไม่รองรับ — ข้าม */ }
};
// รูปแบบการสั่น: บันทึก/แก้ไข/ลบ สำเร็จ = จังหวะคู่ ; toggle วันหยุด = จังหวะสั้นเดียว (ให้ต่างกัน)
const VIBE_SUCCESS = [35, 25, 35];
const VIBE_HOLIDAY = 18;

// Weekend rest days removed due to custom monthly logic not matching daily work log

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const today = useMemo(() => new Date(), []);

  // ── Auth ──
  const { user, loading: authLoading, signOut } = useAuth();

  // ── Page routing ──
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'profile'

  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('timeflow_lang') || 'en';
    } catch { return 'en'; }
  });
  const t = getLang(lang);

  // ธีมสี: 'light' | 'dark' | 'system' (system = ไม่ตั้ง data-theme ให้ CSS ตามค่าระบบเอง)
  const [theme, setTheme] = useState(() => {
    try { const v = localStorage.getItem('timeflow_theme'); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    try { if (theme === 'system') localStorage.removeItem('timeflow_theme'); else localStorage.setItem('timeflow_theme', theme); } catch { /* storage ถูกบล็อก — ข้าม */ }
  }, [theme]);

  // Persist language to localStorage
  useEffect(() => {
    try { localStorage.setItem('timeflow_lang', lang); } catch { /* storage ถูกบล็อก — ข้าม */ }
  }, [lang]);

  const [entries, setEntries] = useState({});
  const [earningsSummary, setEarningsSummary] = useState({ monthly: [], yearly: {}, daily: {} });
  const [holidays, setHolidays] = useState(new Set());
  const [publicHolidays, setPublicHolidays] = useState({}); // { 'YYYY-MM-DD': { name_th, name_en } } วันหยุดทางการ
  const [selectedKey, setSelectedKey] = useState(null);
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [showLeaveSelector, setShowLeaveSelector] = useState(false);
  const [leaveSelectorKey, setLeaveSelectorKey] = useState(null);

  const [salary, setSalary] = useState(0);
  const [otRate, setOtRate] = useState(0);
  const std = 8; // ชั่วโมงทำงานปกติ/วัน คงที่ (ไม่มี input ให้แก้)

  const [leaveQuotas, setLeaveQuotas] = useState({ sick: 0, personal: 0, vacation: 0 });

  // ── Shift Allowance (เบี้ยกะ) — เก็บในตาราง user ──
  const [shiftAllowance, setShiftAllowance] = useState(0);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

  // ── ประกันสังคม (หักจากเงินเดือน) — เก็บใน user ──
  const [socialSecurity, setSocialSecurity] = useState(0);
  const [profileStatus, setProfileStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  // ── เป้ารายได้สุทธิต่อเดือน — เก็บใน user.monthly_goal (0 = ยังไม่ตั้ง) ──
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const goalInDbRef = useRef(true); // false = DB ยังไม่มีคอลัมน์ monthly_goal (ยังไม่ได้รัน migration) → ใช้ localStorage แทน

  const [dIn, setDIn] = useState('');
  const [dNote, setDNote] = useState('');
  const [dOut, setDOut] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [view, setView] = useState('calendar'); // 'calendar' | 'dashboard'
  const [dashTab, setDashTab] = useState('monthly'); // แท็บย่อยใน dashboard: 'monthly' | 'yearly'
  const changeView = useCallback((v) => withViewTransition(() => setView(v)), []);
  const changeDashTab = useCallback((v) => withViewTransition(() => setDashTab(v)), []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [isSavingLeave, setIsSavingLeave] = useState(false);

  // ── เปลี่ยนบัญชี/ออกจากระบบ → ล้างข้อมูลของบัญชีเก่าทั้งหมดก่อนโหลดของใหม่ ──
  // (ต้องอยู่ก่อน effect โหลดโปรไฟล์/entries เพื่อให้ลำดับรันถูกต้อง)
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    initialLoadDoneRef.current = false;
    setEntries({});
    setHolidays(new Set());
    setEarningsSummary({ monthly: [], yearly: {}, daily: {} });
    setSelectedKey(null);
    setSalary(0); setOtRate(0);
    setLeaveQuotas({ sick: 0, personal: 0, vacation: 0 });
    setSocialSecurity(0);
    setMonthlyGoal(0);
    setShiftAllowance(0); setShiftStart(''); setShiftEnd('');
    setDataLoaded(false);
  }, [user?.email]);

  // ── Load user profile on login ──
  // 'loading' | 'ready' | 'error' — ProfilePage บันทึกได้ต่อเมื่อ 'ready' เท่านั้น
  // (กันฟอร์มที่ค่ายังเป็น 0 ไปเขียนทับโปรไฟล์จริง)
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    setProfileStatus('loading');
    devLog('[TimeFlow] Loading user profile for:', user.email);

    (async () => {
      try {
        const res = await UserAPI.get(user.email);
        if (cancelled) return;
        devLog('[TimeFlow] User profile response:', res);

        if (res.success && res.data) {
          const u = res.data;
          // ตั้งค่าตรงๆ (ไม่ใช้ truthy guard) เพื่อให้ค่าที่ว่าง/0 ใน DB ล้างค่าเก่าได้
          setSalary(Number(u.salary_monthly) || 0);
          setOtRate(Number(u.ot_hourly) || 0);
          setLeaveQuotas({
            sick: Number(u.sick_leave_day) || 0,
            personal: Number(u.personal_leave_day) || 0,
            vacation: Number(u.annual_leave_day) || 0,
          });

          setSocialSecurity(Number(u.social_security) || 0);

          // เป้ารายได้: select('*') ไม่คืนคอลัมน์ที่ไม่มี → undefined = ยังไม่ได้รัน migration
          if (u.monthly_goal === undefined) {
            goalInDbRef.current = false;
            setMonthlyGoal(readLocalGoal(user.email));
          } else {
            goalInDbRef.current = true;
            const dbGoal = Number(u.monthly_goal) || 0;
            const localGoal = readLocalGoal(user.email);
            if (dbGoal === 0 && localGoal > 0) {
              // ย้ายเป้าที่เคยเก็บในเครื่องขึ้น DB ครั้งเดียว แล้วล้างค่าในเครื่องเมื่อบันทึกสำเร็จ
              setMonthlyGoal(localGoal);
              UserAPI.update({ email: user.email, monthly_goal: localGoal })
                .then((r) => { if (r?.success) clearLocalGoal(user.email); });
            } else {
              setMonthlyGoal(dbGoal);
              if (localGoal > 0) clearLocalGoal(user.email); // DB เป็นต้นทางแล้ว ทิ้งค่าเก่าในเครื่อง
            }
          }

          // เบี้ยกะ — เก็บในตาราง user แล้ว
          setShiftAllowance(Number(u.shift_allowance) || 0);
          setShiftStart(u.shift_start || '');
          setShiftEnd(u.shift_end || '');

          devLog('[TimeFlow] ✅ User profile loaded');
          setProfileStatus('ready');
        } else if (res.error === 'User not found') {
          // User ไม่เจอจริง ๆ → สร้างใหม่ด้วย defaults
          devLog('[TimeFlow] User not found, creating new user...');
          const created = await UserAPI.create({
            email: user.email,
            salary_monthly: 0,
            ot_hourly: 0,
            sick_leave_day: 0,
            personal_leave_day: 0,
            annual_leave_day: 0,
          });
          if (cancelled) return;
          setProfileStatus(created?.success ? 'ready' : 'error');
        } else {
          // error อื่น (เครือข่าย/RLS) — ห้ามถือว่าเป็น user ใหม่
          console.error('[TimeFlow] Failed to load user profile:', res.error);
          setProfileStatus('error');
        }
      } catch (err) {
        console.error('[TimeFlow] Failed to load user profile:', err);
        if (!cancelled) setProfileStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [user?.email]);

  // ── Load work entries and holidays from Google Sheets ──
  // reqIdRef: กัน response เก่า (เช่นสลับปีเร็วๆ) มาทับข้อมูลของคำขอล่าสุด
  const reqIdRef = useRef(0);
  const loadEntries = useCallback(async (silent = false, forceReload = false) => {
    if (!user?.email) return;
    const reqId = ++reqIdRef.current;
    if (!silent) setDataLoaded(false);
    // The first load uses skeleton loading; subsequent reloads are silent
    devLog('[TimeFlow] Loading work entries and holidays for:', user.email);
    try {
      // โหลดเฉพาะ "ปีที่ดูอยู่" (entries + summary มาใน getEarningsSummary คำขอเดียว) — ไม่ดึงทั้งประวัติ
      // วันหยุดของ user ชุดเล็กและไม่เปลี่ยนตามปี → โหลดเฉพาะครั้งแรก/บังคับ
      const needsFullLoad = forceReload || !initialLoadDoneRef.current;

      const [holRes, earnRes] = await Promise.all([
        needsFullLoad ? HolidayAPI.get(user.email) : Promise.resolve({ success: true, cached: true }),
        WorkEntryAPI.getEarningsSummary(user.email, viewY),
      ]);
      if (reqId !== reqIdRef.current) return; // มีคำขอที่ใหม่กว่าแล้ว → ทิ้งผลนี้

      if (needsFullLoad) {
        if (holRes.success && Array.isArray(holRes.data)) {
          setHolidays(new Set(holRes.data));
        } else if (!holRes.cached) {
          setHolidays(new Set());
        }
      }

      if (earnRes.success && earnRes.data) {
        const { entries: yearEntries, ...summary } = earnRes.data;
        setEntries(sheetEntriesToFrontend(yearEntries || []));
        setEarningsSummary(summary);
      }
    } catch (err) {
      console.error('[TimeFlow] Failed to load data:', err);
    } finally {
      // เฉพาะคำขอล่าสุดเท่านั้นที่ปิดสถานะโหลด
      if (reqId === reqIdRef.current) {
        initialLoadDoneRef.current = true;
        setDataLoaded(true);
      }
    }
  }, [user?.email, viewY]);

  // โหลดครั้งแรกใช้ skeleton ; เปลี่ยนปีหลังจากนั้นโหลดเงียบ ไม่ unmount ปฏิทิน (กันข้อความที่กำลังพิมพ์หาย)
  useEffect(() => {
    loadEntries(initialLoadDoneRef.current);
  }, [loadEntries]);

  // ── โหลดวันหยุดทางการ (global) ครั้งเดียวหลัง login ──
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await PublicHolidayAPI.get();
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((h) => {
            if (h.date) map[h.date] = { name_th: h.name_th || '', name_en: h.name_en || '' };
          });
          setPublicHolidays(map);
        }
      } catch (err) {
        console.error('[TimeFlow] Failed to load public holidays:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  // เคลียร์ timer เดิมก่อนเสมอ ไม่งั้น toast ใหม่จะถูก timer ของอันเก่าปิดก่อนเวลา
  const toastTimer = useRef(null);
  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, msg });
    toastTimer.current = setTimeout(() => setToast({ show: false, msg: '' }), 2600);
  }, []);

  // ── บันทึกเป้ารายได้ลง DB (ล้มเหลว → คืนค่าเดิม + แจ้งเตือน) ──
  const saveGoal = useCallback(async (value) => {
    const n = Math.max(0, Math.round(Number(value) || 0));
    const prev = monthlyGoal;
    setMonthlyGoal(n);
    if (!user?.email) return;
    if (!goalInDbRef.current) { writeLocalGoal(user.email, n); return; }
    const res = await UserAPI.update({ email: user.email, monthly_goal: n });
    if (!res?.success) {
      console.error('[TimeFlow] Failed to save goal:', res?.error);
      setMonthlyGoal(prev);
      showToast(t.goal_save_failed);
    }
  }, [monthlyGoal, user?.email, showToast, t]);

  // ── Sync selected entry → detail inputs ──
  const selEntry = selectedKey ? (entries[selectedKey] || {}) : {};
  useEffect(() => {
    setDIn(selEntry.in || '');
    setDOut(selEntry.out || '');
    setDNote(selEntry.note || '');
  }, [selectedKey, selEntry.in, selEntry.out, selEntry.note]);

  // Toggle holiday for a date key
  // อ่านค่าล่าสุดผ่าน ref เพื่อให้ callback ไม่เปลี่ยน identity ทุกครั้งที่ state เปลี่ยน (DayCell memo จึงได้ผล)
  const holidaysRef = useRef(holidays);
  holidaysRef.current = holidays;
  const selectedKeyRef = useRef(selectedKey);
  selectedKeyRef.current = selectedKey;
  const tRef = useRef(t);
  tRef.current = t;

  const setHolidayLocal = useCallback((k, on) => {
    setHolidays((prev) => {
      const next = new Set(prev);
      if (on) next.add(k); else next.delete(k);
      return next;
    });
  }, []);

  const toggleHoliday = useCallback(async (e, k) => {
    e.stopPropagation();

    const isNowHoliday = !holidaysRef.current.has(k);

    // อัปเดตทันทีเพื่อให้รู้สึกเร็ว (optimistic)
    setHolidayLocal(k, isNowHoliday);
    vibrate(VIBE_HOLIDAY);

    if (!user?.email) return;
    let ok = false;
    try {
      const res = await HolidayAPI.toggle(user.email, k, isNowHoliday);
      ok = !!res?.success;
      if (!ok) console.error('[TimeFlow] Failed to save holiday', res?.error);
    } catch (err) {
      console.error('[TimeFlow] Failed to save holiday', err);
    }
    // บันทึกไม่สำเร็จ → ย้อนค่า + แจ้งผู้ใช้
    if (!ok) {
      setHolidayLocal(k, !isNowHoliday);
      showToast(tRef.current.holiday_save_failed);
    }
  }, [user?.email, setHolidayLocal, showToast]);

  const saveSelectedEntry = async () => {
    if (!isValidTimeValue(dIn) || (dOut && !isValidTimeValue(dOut)) || !selectedKey || !user?.email) return false;
    
    // Optimistic update so data is shown on screen immediately
    setEntries((prev) => ({
      ...prev,
      [selectedKey]: {
        ...(prev[selectedKey] || {}),
        in: dIn,
        out: dOut,
        note: dNote.trim(),
        leave: null
      }
    }));

    setIsSavingEntry(true);
    try {
      const entryData = frontendEntryToSheet(
        selectedKey,
        { in: dIn, out: dOut, note: dNote.trim(), leave: null },
        user.email
      );
      const res = await WorkEntryAPI.upsert(entryData);
      if (res.success) {
        // Reload to sync _id and get calculated earnings before closing
        await loadEntries(true, true);

        vibrate(VIBE_SUCCESS);
        showToast(res.summaryStale
          ? (lang === 'th' ? 'บันทึกแล้ว แต่สรุปยอดอัปเดตไม่สำเร็จ ลองบันทึกซ้ำ' : 'Saved, but summary update failed — please save again')
          : (lang === 'th' ? 'บันทึกและคำนวณเงินแล้ว' : 'Saved and calculated'));
        
        // Close modal/pane immediately
        setSelectedKey(null);
        return true;
      } else {
        showToast(res.error || 'Save failed');
        loadEntries(true, true); // rollback on fail
        return false;
      }
    } catch (err) {
      console.error('[TimeFlow] Save error:', err);
      showToast('Save failed');
      loadEntries(true, true);
      return false;
    } finally {
      setIsSavingEntry(false);
    }
  };

  const performDelete = async () => {
    if (!selectedKey || !entries[selectedKey]) return;
    const entry = entries[selectedKey];
    setIsDeletingEntry(true);
    try {
      if (entry._id) {
        const res = await WorkEntryAPI.delete(entry._id);
        if (!res.success) {
          showToast(res.error || 'Delete failed');
          setIsDeletingEntry(false);
          return;
        }
      }
        // Reload entries จาก Sheet (force reload)
        await loadEntries(true, true);
      setSelectedKey(null);
      vibrate(VIBE_SUCCESS);
      showToast(t.entry_deleted || 'Entry deleted');
    } catch (err) {
      console.error('[TimeFlow] Delete error:', err);
      showToast('Delete failed');
    } finally {
      setIsDeletingEntry(false);
    }
  };

  const deleteSelectedEntry = async () => {
    if (!selectedKey || !entries[selectedKey]) return;
    setShowDeleteConfirm(true); // ซ่อน modal วันบนมือถือระหว่างรอยืนยัน
    const ok = await confirm({
      tone: 'danger',
      title: t.confirm_delete_title || 'Delete this entry?',
      text: t.confirm_delete || 'Are you sure you want to delete this entry?',
      confirmLabel: t.confirm_yes || 'Yes, delete it',
      cancelLabel: t.cancel || 'Cancel',
    });
    setShowDeleteConfirm(false);
    if (ok) performDelete();
  };

  // ── Leave Selector Handlers ──
  const handleLeaveSelect = async (dateStr, leaveData) => {
    // Close selector always
    setShowLeaveSelector(false);
    setLeaveSelectorKey(null);
    
    const isMobile = !isDesktopViewport();
    if (!leaveData.leave) {
      // Check for profile completeness: salary and otRate must be configured
      if (!salary || !otRate) {
        if (isMobile) setSelectedKey(null);
        confirm({
          tone: 'warning',
          title: t.profile_incomplete_title || 'Profile Incomplete',
          text: t.profile_incomplete_msg || 'Please complete your salary and OT rate in the profile page first.',
          confirmLabel: t.go_to_profile || 'Go to Profile',
          cancelLabel: t.cancel || 'Cancel',
        }).then((ok) => { if (ok) setPage('profile'); });
        return;
      }

      // Work day selected — just update local state, user will fill time later
      setEntries((p) => ({
        ...p,
        [dateStr]: { ...p[dateStr], ...leaveData }
      }));
      if (!isMobile) {
        showToast(lang === 'th' ? 'กรุณากรอกเวลา' : 'Please enter time');
      }
    } else {
      // Leave recorded — บันทึกลง DB (ไม่ส่ง note → ไม่เขียนทับโน้ตเดิมของวันนั้น)
      let saved = !user?.email;
      if (user?.email) {
        setIsSavingLeave(true);
        try {
          const entryData = frontendEntryToSheet(
            dateStr,
            { in: '', out: '', leave: leaveData.leave },
            user.email
          );
          const res = await WorkEntryAPI.upsert(entryData);
          saved = !!res?.success;
          if (!saved) console.error('[TimeFlow] Leave save failed:', res?.error);
          // force reload เพื่อให้ตัวเลขทุกอย่างตรงกับ DB (ทั้งกรณีสำเร็จและย้อนค่ากรณีล้มเหลว)
          await loadEntries(true, true);
        } catch (err) {
          console.error('[TimeFlow] Leave save error:', err);
        } finally {
          setIsSavingLeave(false);
        }
      }
      if (saved) {
        vibrate(VIBE_SUCCESS);
        showToast(leaveData.leave?.type === 'training'
          ? (lang === 'th' ? 'เพิ่มการอบรมแล้ว' : 'Training recorded')
          : (lang === 'th' ? 'เพิ่มการลางานแล้ว' : 'Leave recorded'));
      } else {
        showToast(t.leave_save_failed);
      }
      if (isMobile) setSelectedKey(null);
    }
  };

  const handleLeaveCancel = () => {
    setShowLeaveSelector(false);
    setLeaveSelectorKey(null);
    // On mobile, also clear selectedKey when cancelling leave selector
    if (!isDesktopViewport()) setSelectedKey(null);
  };

  const handleDayClick = useCallback((dateKey) => {
    if (selectedKeyRef.current === dateKey) {
      setSelectedKey(null);
    } else {
      setSelectedKey(dateKey);
      // ถ้าเป็นวันหยุด ไม่แสดง LeaveSelector
      if (holidaysRef.current.has(dateKey)) return;
      // Show LeaveSelector for both mobile and desktop
      setLeaveSelectorKey(dateKey);
      setShowLeaveSelector(true);
    }
  }, []);

  // Ensure bottom sheet closes if date is deselected
  useEffect(() => {
    if (!selectedKey) setShowDeleteConfirm(false);
  }, [selectedKey]);

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY((y) => y - 1); }
    else setViewM((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY((y) => y + 1); }
    else setViewM((m) => m + 1);
  };
  const goToday = () => { setViewY(today.getFullYear()); setViewM(today.getMonth()); };

  // ── Detail panel calc ──
  const selDailyEarning = selectedKey ? earningsSummary.daily[selectedKey] : null;

  // Preview คำนวณสดจากเวลาที่กรอก (ก่อนกดบันทึก) — ใช้ calcWorkDay ตัวเดียวกับ upsertWorkEntry ใน api.js
  const previewCalc = useMemo(() => {
    if (!isValidTimeValue(dIn) || !isValidTimeValue(dOut) || !selectedKey) return null;
    const stdH = Number(std) || 8;
    // ข้ามเที่ยงคืน → ตรวจว่าวันถัดไปเป็นนักขัตฤกษ์/วันหยุด(user)หรือไม่
    const { crossedMidnight } = parseWorkSpan(dIn, dOut);
    let nextIsPublic = false, nextIsUserHoliday = false;
    if (crossedMidnight) {
      const nextDate = addDaysStr(selectedKey, 1);
      nextIsPublic = !!publicHolidays?.[nextDate];
      if (!nextIsPublic) nextIsUserHoliday = holidays?.has?.(nextDate) || false;
    }
    const r = calcWorkDay({
      clockIn: dIn, clockOut: dOut,
      isPublicHolidayToday: !!publicHolidays?.[selectedKey],
      nextIsPublic, nextIsUserHoliday,
      stdH, baseHourly: baseHourlyRate(salary, otRate, stdH),
      shiftAllowance, shiftStart, shiftEnd,
    });
    return {
      working_hour: r.workingHour,
      ot_hour: r.otHour,
      ot_earning: r.otEarning,
      ot15_hours: r.ot15Hour, ot15_earn: r.ot15Earn,
      ot1_hours: r.ot1Hour, ot1_earn: r.ot1Earn,
      ot3_hours: r.ot3Hour, ot3_earn: r.ot3Earn,
      regular_earning: r.regularEarning,
      shift_allowance: r.shiftAllowance,
      total_earning: r.totalEarning,
    };
  }, [dIn, dOut, selectedKey, std, salary, otRate, shiftAllowance, shiftStart, shiftEnd, publicHolidays, holidays]);

  // ใช้ค่า preview เมื่อกรอกเวลาครบ; ถ้าไม่ครบใช้ค่าที่บันทึกไว้เดิม
  const detHReg = previewCalc ? previewCalc.working_hour : (selDailyEarning?.working_hour || 0);
  const netDetOT = previewCalc ? previewCalc.ot_hour : (selDailyEarning?.ot_hour || 0);
  const detE = previewCalc ? previewCalc.total_earning : (selDailyEarning?.total_earning || 0);
  const detOTRateEarn = previewCalc ? previewCalc.ot_earning : (selDailyEarning?.ot_earning || 0);
  const detShift = previewCalc ? previewCalc.shift_allowance : (selDailyEarning?.shift_allowance || 0);
  // รายละเอียด OT แยกอัตรา (แสดงเฉพาะตอน preview ก่อนบันทึก)
  const detOT15h = previewCalc?.ot15_hours || 0, detOT15e = previewCalc?.ot15_earn || 0;
  const detOT1h = previewCalc?.ot1_hours || 0, detOT1e = previewCalc?.ot1_earn || 0;
  const detOT3h = previewCalc?.ot3_hours || 0, detOT3e = previewCalc?.ot3_earn || 0;

  const selDateObj = selectedKey ? new Date(selectedKey + 'T00:00:00') : null;
  const selLabel = selDateObj
    ? `${t.days_long[selDateObj.getDay()]}, ${selDateObj.getDate()} ${t.short_months[viewM]}`
    : t.select_day;
  const isTodaySelected = selectedKey === todayKey();
  const isSelectedHoliday = selectedKey ? holidays.has(selectedKey) : false;

  // ── Shared utility classes ──
  const labelCls = 'text-[10px] font-bold text-muted uppercase tracking-[0.08em] block mb-1';
  const inputCls = 'w-full min-w-0 block bg-surface-alt border-[1.5px] border-line-strong rounded-[6px] text-ink text-sm font-medium px-1 sm:px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer transition-colors focus:border-primary focus:bg-surface box-border';

  // ── Auth guard — show login if not signed in ──────────────────────────────
  if (authLoading) {
    return <SkeletonAuthLoading />;
  }
  if (!user) return <LoginPage />;

  // ── Profile page ──────────────────────────────────────────────────────────
  if (page === 'profile') {
    return (
      <ProfilePage
        // key เปลี่ยนเมื่อโหลดโปรไฟล์เสร็จ → ฟอร์มรีเซ็ตจากค่าจริง ไม่ใช่ snapshot ตอนยังเป็น 0
        key={profileStatus}
        profileStatus={profileStatus}
        salary={salary} setSalary={setSalary}
        otRate={otRate} setOtRate={setOtRate}
        leaveQuotas={leaveQuotas} setLeaveQuotas={setLeaveQuotas}

        shiftAllowance={shiftAllowance} setShiftAllowance={setShiftAllowance}
        shiftStart={shiftStart} setShiftStart={setShiftStart}
        shiftEnd={shiftEnd} setShiftEnd={setShiftEnd}
        socialSecurity={socialSecurity} setSocialSecurity={setSocialSecurity}
        
        lang={lang}
        onBack={() => setPage('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink-2 font-sans antialiased selection:bg-primary-soft">
      
      {/* ════════════════════════════════════════════
          TOPBAR
      ════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full h-[60px] bg-surface/85 backdrop-blur border-b border-line flex items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-primary rounded-lg grid place-items-center shrink-0">
            <CalendarDays size={15} className="text-white" />
          </div>
          <span className="font-bold text-[17px] text-ink tracking-tight">TimeFlow</span>
        </div>

        {/* Period filters (desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold text-muted mr-1">{t.period}</span>

          <SelectField
              value={viewM}
              label={t.month_label}
              onChange={(e) => setViewM(Number(e.target.value))}>
              {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
            </SelectField>

          <SelectField
              value={viewY}
              label={t.year_label}
              onChange={(e) => {
                setViewY(Number(e.target.value));
                showToast(t.loading_data);
              }}>
              {yearOptions(today, viewY).map((y) => (
                <option key={y} value={y}>{lang === 'th' ? y + 543 : y}</option>
              ))}
            </SelectField>

          <button
            onClick={goToday}
            className="px-3.5 py-[7px] rounded-[10px] bg-surface border-[1.5px] border-line-strong text-ink-2 text-[13px] font-medium cursor-pointer shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition hover:border-primary hover:text-primary hover:bg-primary-soft hover:-translate-y-px"
          >
            {t.today}
          </button>
        </div>

        {/* Tab toggle — แท็บเล็ต (มือถือใช้ bottom bar, xl ใช้ sidebar) */}
        <div className="hidden sm:block xl:hidden">
        <SegmentedControl
          collapseLabel
          value={view}
          onChange={changeView}
          items={[
            { id: 'calendar', Icon: CalendarDays, label: t.work_calendar },
            { id: 'dashboard', Icon: LayoutDashboard, label: t.dashboard },
          ]}
        />
        </div>

        {/* Language Toggle & User Menu */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(l => l === 'en' ? 'th' : 'en')}
            aria-label={t.switch_language}
            className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-surface border-2 border-line text-[11px] font-bold text-muted cursor-pointer transition hover:border-primary-mid hover:text-primary"
          >
            {lang.toUpperCase()}
          </button>

          {/* User Menu Dropdown */}
          <UserMenu
            user={user}
            t={t}
            theme={theme}
            onTheme={setTheme}
            onProfile={() => setPage('profile')}
            onSignOut={signOut}
          />
        </div>
      </header>

      {/* ════════════════════════════════════════════
          LAYOUT
      ════════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-60px)]">

        {/* ── SIDEBAR ─────────────────────────────── */}
        <aside className="hidden xl:flex flex-col w-[220px] shrink-0 bg-surface border-r border-line sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto p-4 gap-1">

          {/* Nav: Work Calendar / Dashboard */}
          <div className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] px-3 pt-3 pb-2">{t.menu}</div>
          <button
            type="button"
            onClick={() => changeView('calendar')}
            aria-current={view === 'calendar' ? 'page' : undefined}
            className={`w-full text-left border-none bg-transparent flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer transition
              ${view === 'calendar' ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-alt hover:text-ink-2'}`}
          >
            <CalendarDays size={15} />
            {t.work_calendar}
          </button>
          <button
            type="button"
            onClick={() => changeView('dashboard')}
            aria-current={view === 'dashboard' ? 'page' : undefined}
            className={`w-full text-left border-none bg-transparent flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer transition
              ${view === 'dashboard' ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-alt hover:text-ink-2'}`}
          >
            <LayoutDashboard size={15} />
            {t.dashboard}
          </button>

          {/* Sub-tabs (แสดงเมื่ออยู่หน้า Dashboard) */}
          {view === 'dashboard' && (
            <div className="mt-1 ml-3 pl-3 border-l border-line flex flex-col gap-1">
              <button
                type="button"
                onClick={() => changeDashTab('monthly')}
                aria-current={dashTab === 'monthly' ? 'page' : undefined}
                className={`w-full text-left border-none bg-transparent flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] font-semibold cursor-pointer transition
                  ${dashTab === 'monthly' ? 'text-primary' : 'text-muted hover:text-ink-2'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dashTab === 'monthly' ? 'bg-primary' : 'bg-line-strong'}`} />
                {t.monthly}
              </button>
              <button
                type="button"
                onClick={() => changeDashTab('yearly')}
                aria-current={dashTab === 'yearly' ? 'page' : undefined}
                className={`w-full text-left border-none bg-transparent flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] font-semibold cursor-pointer transition
                  ${dashTab === 'yearly' ? 'text-primary' : 'text-muted hover:text-ink-2'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dashTab === 'yearly' ? 'bg-primary' : 'bg-line-strong'}`} />
                {t.annual}
              </button>
            </div>
          )}
        </aside>

        {/* ── MAIN ─────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-6 p-6 max-sm:pb-28 overflow-y-auto">

          {/* ══ CALENDAR VIEW (ปฏิทินการทำงาน) ══ */}
          {view === 'calendar' && !dataLoaded && (
            <SkeletonCalendarView daysShort={t.days_short} />
          )}
          {view === 'calendar' && dataLoaded && (
            <WorkCalendar
              viewY={viewY} viewM={viewM} lang={lang} t={t} today={today}
              prevMonth={prevMonth} nextMonth={nextMonth} goToday={goToday}
              setViewM={setViewM} setViewY={setViewY} showToast={showToast}
              entries={entries} setEntries={setEntries}
              earningsSummary={earningsSummary} holidays={holidays}
              publicHolidays={publicHolidays}
              selectedKey={selectedKey} setSelectedKey={setSelectedKey}
              handleDayClick={handleDayClick} toggleHoliday={toggleHoliday}
              dIn={dIn} dOut={dOut} setDIn={setDIn} setDOut={setDOut}
              dNote={dNote} setDNote={setDNote}
              saveSelectedEntry={saveSelectedEntry} deleteSelectedEntry={deleteSelectedEntry}
              isSavingEntry={isSavingEntry} isDeletingEntry={isDeletingEntry}
              showLeaveSelector={showLeaveSelector} showDeleteConfirm={showDeleteConfirm} confirm={confirm}
              selEntry={selEntry} selLabel={selLabel}
              isTodaySelected={isTodaySelected} isSelectedHoliday={isSelectedHoliday}
              previewCalc={previewCalc}
              detHReg={detHReg} netDetOT={netDetOT} detE={detE}
              detOTRateEarn={detOTRateEarn} detShift={detShift}
              detOT15h={detOT15h} detOT15e={detOT15e}
              detOT1h={detOT1h} detOT1e={detOT1e}
              detOT3h={detOT3h} detOT3e={detOT3e}
              labelCls={labelCls} inputCls={inputCls}
            />
          )}

          {/* ══ DASHBOARD VIEW — แท็บย่อย รายเดือน / รายปี ══ */}
          {view === 'dashboard' && (
            <div className="flex flex-col gap-6 w-full">

              {/* Sub-tab toggle (mobile-first: เต็มความกว้างบนมือถือ) */}
              <SegmentedControl
                fill
                value={dashTab}
                onChange={changeDashTab}
                items={[
                  { id: 'monthly', Icon: LayoutDashboard, label: t.monthly },
                  { id: 'yearly', Icon: BarChart2, label: t.annual },
                ]}
              />

              {/* รายเดือน */}
              {dashTab === 'monthly' && !dataLoaded && (
                <SkeletonMonthly />
              )}
              {dashTab === 'monthly' && dataLoaded && (
                <MonthlySummary
                  earningsSummary={earningsSummary}
                  entries={entries}
                  holidays={holidays}
                  publicHolidays={publicHolidays}
                  salary={salary}
                  otRate={otRate}
                  std={std}
                  socialSecurity={socialSecurity}
                  goal={monthlyGoal}
                  onGoalChange={saveGoal}
                  lang={lang}
                  t={t}
                  viewY={viewY}
                  viewM={viewM}
                  setViewM={setViewM}
                  setViewY={setViewY}
                  today={today}
                  showToast={showToast}
                  onSelectDay={(k) => {
                    setView('calendar');
                    setSelectedKey(k);
                    if (!holidays.has(k)) { setLeaveSelectorKey(k); setShowLeaveSelector(true); }
                  }}
                />
              )}

              {/* รายปี */}
              {dashTab === 'yearly' && !dataLoaded && (
                <SkeletonYearly />
              )}
              {dashTab === 'yearly' && dataLoaded && (
                <YearlyDashboard
                  entries={entries}
                  earningsSummary={earningsSummary}
                  salary={salary}
                  leaveQuotas={leaveQuotas}
                  socialSecurity={socialSecurity}
                  lang={lang}
                  viewY={viewY}
                  setViewY={setViewY}
                  showToast={showToast}
                />
              )}
            </div>
          )}

        </main>
      </div>

      <LeaveSelector
        isOpen={showLeaveSelector}
        dateStr={leaveSelectorKey}
        currentData={leaveSelectorKey ? entries[leaveSelectorKey] : {}}
        onSelect={handleLeaveSelect}
        onCancel={handleLeaveCancel}
        onDelete={() => {
          setShowLeaveSelector(false);
          deleteSelectedEntry();
        }}
        lang={lang}
      />

      {/* Bottom tab bar (มือถือ) */}
      <nav aria-label={t.menu} className="sm:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-2 bg-surface/90 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
        {[
          { id: 'calendar', Icon: CalendarDays, label: t.work_calendar },
          { id: 'dashboard', Icon: LayoutDashboard, label: t.dashboard },
        ].map(({ id, Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => changeView(id)}
            aria-current={view === id ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-semibold cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25
              ${view === id ? 'text-primary' : 'text-muted hover:text-ink-2'}`}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {confirmDialog}

      {/* Toast */}
      <div role="status" aria-live="polite" className={`fixed bottom-24 sm:bottom-6 right-6 bg-ink text-surface text-[13px] font-medium px-4 py-3 rounded-[10px] z-[300] shadow-[0_8px_28px_rgba(17,24,39,0.1)] flex items-center gap-2 pointer-events-none transition duration-300
        ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <CheckCircle2 size={14} className="text-income" />
        {toast.msg}
      </div>

      {/* Saving Toast */}
      <div className={`fixed bottom-24 sm:bottom-6 right-6 bg-ink text-surface text-[13px] font-medium px-4 py-3 rounded-[10px] z-[299] shadow-[0_8px_28px_rgba(17,24,39,0.1)] flex items-center gap-2 pointer-events-none transition duration-300
        ${(isSavingEntry || isDeletingEntry || isSavingLeave) && !toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Loader2 size={14} className="text-primary animate-spin" />
        {lang === 'th' ? 'กำลังบันทึกและคำนวณเงิน...' : 'Saving and calculating...'}
      </div>

    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────
function UserMenu({ user, t, theme, onTheme, onProfile, onSignOut }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border-[1.5px] border-line bg-surface cursor-pointer transition hover:border-primary-mid hover:shadow-[0_2px_8px_rgba(17,24,39,0.08)] select-none"
      >
        {/* Avatar image */}
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-7 h-7 rounded-full object-cover border border-line"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary-soft grid place-items-center text-[11px] font-bold text-primary">
            {initials}
          </div>
        )}
        {/* Name (desktop only) */}
        <span className="hidden md:block text-[12px] font-semibold text-ink-2 max-w-[100px] truncate">
          {user?.name?.split(' ')[0]}
        </span>
        <ChevronDown size={12} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[240px] bg-surface border border-line rounded-2xl shadow-[0_8px_32px_rgba(17,24,39,0.12)] z-[999] overflow-hidden animate-[fadeUp_0.2s_ease_both]">

          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-line">
            <div className="flex items-center gap-3">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-9 h-9 rounded-xl object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary-soft grid place-items-center text-[13px] font-bold text-primary">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-ink truncate">{user?.name}</div>
                <div className="text-[11px] text-muted truncate">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <MenuItem
              Icon={UserCircle2}
              label={t?.profile || "Profile"}
              sub={t?.profile_desc || "Personal & Work Info"}
              onClick={() => { setOpen(false); onProfile(); }}
            />
          </div>

          <div className="border-t border-line px-4 py-3">
            <div className="text-[11px] font-semibold text-muted mb-2">{t?.theme_label || 'Appearance'}</div>
            <div role="radiogroup" aria-label={t?.theme_label || 'Appearance'} className="grid grid-cols-3 gap-1 bg-surface-alt border border-line rounded-[10px] p-1">
              {[
                { id: 'light', Icon: Sun, label: t?.theme_light || 'Light' },
                { id: 'dark', Icon: Moon, label: t?.theme_dark || 'Dark' },
                { id: 'system', Icon: Monitor, label: t?.theme_system || 'System' },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={theme === id}
                  onClick={() => onTheme(id)}
                  className={`flex flex-col items-center gap-1 py-1.5 rounded-[7px] text-[11px] font-semibold cursor-pointer transition focus-visible:ring-2 focus-visible:ring-primary/25
                    ${theme === id ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(17,24,39,0.12)]' : 'text-muted hover:text-ink-2'}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-line py-1.5">
            <MenuItem
              Icon={LogOut}
              label={t?.logout || "Sign Out"}
              danger
              onClick={() => { setOpen(false); onSignOut(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ Icon, label, sub, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors
        ${danger
          ? 'text-danger hover:bg-[#FFF1F3]'
          : 'text-ink-2 hover:bg-surface-alt'}`}
    >
      <div className={`w-7 h-7 rounded-[7px] grid place-items-center shrink-0
        ${danger ? 'bg-danger-soft' : 'bg-surface-alt'}`}>
        <Icon size={14} className={danger ? 'text-danger' : 'text-muted'} />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold">{label}</div>
        {sub && <div className="text-[10px] text-muted">{sub}</div>}
      </div>
    </button>
  );
}
