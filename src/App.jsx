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
  Moon, GraduationCap,
} from 'lucide-react';
import Swal from 'sweetalert2';
import YearlyDashboard from './components/YearlyDashboard';
import WorkCalendar from './components/WorkCalendar';
import MonthlySummary from './components/MonthlySummary';
import { LeaveSelector } from './components/LeaveSelector';
import { getLang } from './locales';
import { useAuth } from './components/AuthContext';
import LoginPage from './components/LoginPage';
import ProfilePage, { OT_MODE } from './components/ProfilePage';
import { UserAPI, WorkEntryAPI, HolidayAPI, PublicHolidayAPI, sheetEntriesToFrontend, frontendEntryToSheet } from './services/api';
import { SkeletonDashboard, SkeletonAuthLoading } from './components/SkeletonLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dateKey = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayKey = () => {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
};

const fmt1 = (n) => n.toFixed(1);
const fmtB = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Weekend rest days removed due to custom monthly logic not matching daily work log

const AnimatedWaitText = () => {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const seq = ['.  ', '.. ', '...', '.. '];
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % seq.length; setDots(seq[i]); }, 300);
    return () => clearInterval(t);
  }, []);
  return <span className="inline-block text-left whitespace-pre">{dots}</span>;
};

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

  // Persist language to localStorage
  useEffect(() => {
    try { localStorage.setItem('timeflow_lang', lang); } catch {}
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
  const [std, setStd] = useState(8);

  // ── Payment Type & Rest Days ──
  const [paymentType, setPaymentType] = useState('monthly'); // 'monthly' | 'daily'
  const [dailyRate, setDailyRate] = useState(0);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(5);

  // ── OT Calculation Mode (from ProfilePage) ──
  const [otMode, setOtMode] = useState(OT_MODE.HOURLY);
  const [otBlockHours, setOtBlockHours] = useState(2);
  const [otDeductMins, setOtDeductMins] = useState(30);
  const [otSettingId, setOtSettingId] = useState('');
  const [leaveQuotas, setLeaveQuotas] = useState({ sick: 0, personal: 0, vacation: 0 });

  // ── Shift Allowance (เบี้ยกะ) — เก็บในตาราง user ──
  const [shiftAllowance, setShiftAllowance] = useState(0);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

  // ── ประกันสังคม (หักจากเงินเดือน) — เก็บใน user ──
  const [socialSecurity, setSocialSecurity] = useState(0);

  const [dIn, setDIn] = useState('');
  const [dOut, setDOut] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [view, setView] = useState('calendar'); // 'calendar' | 'dashboard'
  const [dashTab, setDashTab] = useState('monthly'); // แท็บย่อยใน dashboard: 'monthly' | 'yearly'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfileIncomplete, setShowProfileIncomplete] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [isSavingLeave, setIsSavingLeave] = useState(false);

  // ── Load user profile from Google Sheets on login ──
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    console.log('[TimeFlow] Loading user profile for:', user.email);

    (async () => {
      try {
        const res = await UserAPI.get(user.email);
        if (cancelled) return;
        console.log('[TimeFlow] User profile response:', res);

        if (res.success && res.data) {
          const u = res.data;
          if (u.salary_monthly) setSalary(Number(u.salary_monthly));
          if (u.ot_hourly) setOtRate(Number(u.ot_hourly));
          if (u.sick_leave_day !== undefined) setLeaveQuotas(q => ({ ...q, sick: Number(u.sick_leave_day) }));
          if (u.personal_leave_day !== undefined) setLeaveQuotas(q => ({ ...q, personal: Number(u.personal_leave_day) }));
          if (u.annual_leave_day !== undefined) setLeaveQuotas(q => ({ ...q, vacation: Number(u.annual_leave_day) }));

          if (u.payment_type) setPaymentType(u.payment_type);
          if (u.daily_rate) setDailyRate(Number(u.daily_rate));
          if (u.social_security !== undefined && u.social_security !== null) setSocialSecurity(Number(u.social_security) || 0);

          // เบี้ยกะ — เก็บในตาราง user แล้ว
          if (u.shift_allowance !== undefined && u.shift_allowance !== null) setShiftAllowance(Number(u.shift_allowance) || 0);
          if (u.shift_start) setShiftStart(u.shift_start);
          if (u.shift_end) setShiftEnd(u.shift_end);

          console.log('[TimeFlow] ✅ User profile loaded');
        } else {
          // User ไม่เจอ → สร้างใหม่ด้วย defaults
          console.log('[TimeFlow] User not found, creating new user...');
          await UserAPI.create({
            email: user.email,
            salary_monthly: 0,
            ot_hourly: 0,
            sick_leave_day: 0,
            personal_leave_day: 0,
            annual_leave_day: 0,
            payment_type: 'monthly',
            daily_rate: 0,
          });
        }
      } catch (err) {
        console.error('[TimeFlow] Failed to load user profile:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.email]);

  // ── Load work entries and holidays from Google Sheets ──
  const initialLoadDoneRef = useRef(false);
  const loadEntries = useCallback(async (silent = false, forceReload = false) => {
    if (!user?.email) return;
    if (!silent) setDataLoaded(false);
    // The first load uses skeleton loading; subsequent reloads are silent
    console.log('[TimeFlow] Loading work entries and holidays for:', user.email);
    try {
      // Fetch all data concurrently to reduce wait time
      const promises = [];
      const needsFullLoad = forceReload || !initialLoadDoneRef.current;

      if (needsFullLoad) {
        promises.push(WorkEntryAPI.getByUser(user.email));
        promises.push(HolidayAPI.get(user.email));
      } else {
        promises.push(Promise.resolve({ success: true, cached: true }));
        promises.push(Promise.resolve({ success: true, cached: true }));
      }
      promises.push(WorkEntryAPI.getEarningsSummary(user.email, viewY));

      const [res, holRes, earnRes] = await Promise.all(promises);

      if (needsFullLoad) {
        console.log('[TimeFlow] Work entries response:', res);
        if (res.success && Array.isArray(res.data)) {
          const converted = sheetEntriesToFrontend(res.data);
          console.log('[TimeFlow] ✅ Entries loaded:', Object.keys(converted).length, 'dates');
          setEntries(converted);
        } else if (!res.cached) {
          console.warn('[TimeFlow] No entries found or unexpected response:', res);
          setEntries({});
        }

        if (holRes.success && Array.isArray(holRes.data)) {
          console.log('[TimeFlow] ✅ Holidays loaded:', holRes.data.length, 'days');
          setHolidays(new Set(holRes.data));
        } else if (!holRes.cached) {
          setHolidays(new Set());
        }
      }
      
      if (earnRes.success && earnRes.data) {
        setEarningsSummary(earnRes.data);
      }
    } catch (err) {
      console.error('[TimeFlow] Failed to load data:', err);
    } finally {
      initialLoadDoneRef.current = true;
      setDataLoaded(true);
    }
  }, [user?.email, lang, viewY]);

  useEffect(() => {
    loadEntries();
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

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2600);
  };

  // ── Sync selected entry → detail inputs ──
  const selEntry = selectedKey ? (entries[selectedKey] || {}) : {};
  useEffect(() => {
    setDIn(selEntry.in || '');
    setDOut(selEntry.out || '');
  }, [selectedKey, selEntry.in, selEntry.out]);

  // ── Monthly aggregates ──
  const currentMonthSummary = useMemo(() => {
    return earningsSummary.monthly.find(m => m.month_num === viewM + 1 && m.year_num === viewY) || {
      days_worked: 0,
      ot_days: 0,
      shift_days: 0,
      total_working_hour: 0,
      total_ot_hour: 0,
      total_ot_earning: 0,
      total_regular_earning: 0,
      total_shift_allowance: 0,
      total_earning: 0
    };
  }, [earningsSummary.monthly, viewY, viewM]);

  const totalReg = currentMonthSummary.total_working_hour;
  const totalOT = currentMonthSummary.total_ot_hour;
  const otDays = currentMonthSummary.ot_days;
  const daysWorked = currentMonthSummary.days_worked;

  const regEarn = paymentType === 'daily'
    ? currentMonthSummary.total_regular_earning
    : salary; // Full monthly salary as requested

  const otEarn = currentMonthSummary.total_ot_earning;
  // เบี้ยกะรวมของเดือน (backend เก็บ total_shift_allowance + shift_days ไว้ใน monthly_summary)
  const shiftEarn = currentMonthSummary.total_shift_allowance || 0;
  const shiftDays = currentMonthSummary.shift_days || 0;
  // หักประกันสังคมออกจากรายได้รวมของเดือน
  const totalEarn = Math.max(0, regEarn + otEarn + shiftEarn - (socialSecurity || 0));
  // อัตรา OT วันธรรมดาที่แสดงบนการ์ด = base (เงินเดือน ÷ 30 ÷ std) × 1.5 ; รายวัน fallback ค่า OT Rate ที่กรอกเอง
  const otDisplayRate = Number(salary) > 0 ? (Number(salary) / 30 / (Number(std) || 8)) * 1.5 : otRate;

  // Toggle holiday for a date key
  const toggleHoliday = async (e, k) => {
    e.stopPropagation();
    
    // Calculate the new state before putting it in setHolidays
    const isNowHoliday = !holidays.has(k);
    
    // Update local state immediately for fast feedback
    setHolidays((prev) => {
      const next = new Set(prev);
      if (isNowHoliday) {
        next.add(k);
      } else {
        next.delete(k);
      }
      return next;
    });

    // Save to Google Apps Script backend
    if (user?.email) {
      try {
        await HolidayAPI.toggle(user.email, k, isNowHoliday);
      } catch (err) {
        console.error('[TimeFlow] Failed to save holiday', err);
      }
    }
  };

  const saveSelectedEntry = async () => {
    if (!dIn || !selectedKey || !user?.email) return false;
    
    // Optimistic update so data is shown on screen immediately
    setEntries((prev) => ({
      ...prev,
      [selectedKey]: {
        ...(prev[selectedKey] || {}),
        in: dIn,
        out: dOut,
        leave: null
      }
    }));

    setIsSavingEntry(true);
    try {
      const entryData = frontendEntryToSheet(
        selectedKey,
        { in: dIn, out: dOut, leave: null },
        user.email
      );
      const res = await WorkEntryAPI.upsert(entryData);
      if (res.success) {
        // Reload to sync _id and get calculated earnings before closing
        await loadEntries(true, true);

        showToast(lang === 'th' ? 'บันทึกและคำนวณเงินแล้ว' : 'Saved and calculated');
        
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
      showToast(t.entry_deleted || 'Entry deleted');
    } catch (err) {
      console.error('[TimeFlow] Delete error:', err);
      showToast('Delete failed');
    } finally {
      setIsDeletingEntry(false);
    }
  };

  const deleteSelectedEntry = () => {
    if (!selectedKey || !entries[selectedKey]) return;
    const isDesktop = window.innerWidth >= 1280; // xl breakpoint
    if (isDesktop) {
      Swal.fire({
        title: t.confirm_delete_title || 'Delete this entry?',
        text: t.confirm_delete || 'Are you sure you want to delete this entry?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: t.confirm_yes || 'Yes, delete it',
        cancelButtonText: t.cancel || 'Cancel',
        reverseButtons: true,
        customClass: {
          container: 'font-sans',
          popup: 'rounded-2xl',
          confirmButton: 'rounded-[10px] font-bold px-6 py-2.5',
          cancelButton: 'rounded-[10px] font-bold px-6 py-2.5',
          title: 'text-[18px] text-[#111827]',
          htmlContainer: 'text-[14px] text-[#6B7280]'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          performDelete();
        }
      });
    } else {
      setShowDeleteConfirm(true);
    }
  };

  // ── Leave Selector Handlers ──
  const handleLeaveSelect = async (dateStr, leaveData) => {
    // Close selector always
    setShowLeaveSelector(false);
    setLeaveSelectorKey(null);
    
    const isMobile = window.innerWidth < 1280;
    if (!leaveData.leave) {
      // Check for profile completeness: salary/dailyRate and otRate must be configured
      const isRateIncomplete = paymentType === 'monthly' ? !salary : !dailyRate;
      if (isRateIncomplete || !otRate) {
        if (isMobile) {
          setShowProfileIncomplete(true);
          setSelectedKey(null);
        } else {
          Swal.fire({
            title: t.profile_incomplete_title || 'Profile Incomplete',
            text: t.profile_incomplete_msg || 'Please complete your salary and OT rate in the profile page first.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3B4FE4',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: t.go_to_profile || 'Go to Profile',
            cancelButtonText: t.cancel || 'Cancel',
            customClass: {
              container: 'font-sans',
              popup: 'rounded-2xl',
              confirmButton: 'rounded-[10px] font-bold px-6 py-2.5',
              cancelButton: 'rounded-[10px] font-bold px-6 py-2.5',
            }
          }).then((result) => {
            if (result.isConfirmed) {
              setPage('profile');
            }
          });
        }
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
      // Leave recorded — save to Google Sheets
      if (user?.email) {
        setIsSavingLeave(true);
        try {
          const entryData = frontendEntryToSheet(
            dateStr,
            { in: '', out: '', leave: leaveData.leave },
            user.email, std, salary, otRate,
            otMode, otBlockHours, otDeductMins
          );
          entryData.leave_type = leaveData.leave?.type || '';
          await WorkEntryAPI.upsert(entryData);
          // Save successful, update local state directly instead of full reload?
          // For simplicity, we just force reload for now as user expects everything up-to-date
          await loadEntries(true, true);
        } catch (err) {
          console.error('[TimeFlow] Leave save error:', err);
        } finally {
          setIsSavingLeave(false);
        }
      }
      showToast(leaveData.leave?.type === 'training'
        ? (lang === 'th' ? 'เพิ่มการอบรมแล้ว' : 'Training recorded')
        : (lang === 'th' ? 'เพิ่มการลางานแล้ว' : 'Leave recorded'));
      if (isMobile) setSelectedKey(null);
    }
  };

  const handleLeaveCancel = () => {
    setShowLeaveSelector(false);
    setLeaveSelectorKey(null);
    // On mobile, also clear selectedKey when cancelling leave selector
    if (window.innerWidth < 1280) setSelectedKey(null);
  };

  const handleDayClick = (dateKey) => {
    if (selectedKey === dateKey) {
      setSelectedKey(null);
    } else {
      setSelectedKey(dateKey);
      // ถ้าเป็นวันหยุด ไม่แสดง LeaveSelector
      if (holidays.has(dateKey)) return;
      // Show LeaveSelector for both mobile and desktop
      setLeaveSelectorKey(dateKey);
      setShowLeaveSelector(true);
    }
  };

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

  // Preview คำนวณสดจากเวลาที่กรอก (ก่อนกดบันทึก) — ใช้ตรรกะเดียวกับ upsertWorkEntry ใน api.js
  const previewCalc = useMemo(() => {
    if (!dIn || !dOut || !selectedKey) return null;
    const pIn = String(dIn).split(':'), pOut = String(dOut).split(':');
    const ih = Number(pIn[0] || 0), im = Number(pIn[1] || 0);
    const oh = Number(pOut[0] || 0), om = Number(pOut[1] || 0);
    let totalMins = (oh * 60 + om) - (ih * 60 + im);
    if (totalMins < 0) totalMins += 1440; // ข้ามเที่ยงคืน
    if (totalMins <= 0) return { working_hour: 0, ot_hour: 0, ot_earning: 0, regular_earning: 0, shift_allowance: 0, total_earning: 0 };

    const totalH = totalMins / 60;
    // หักเวลาพัก 1 ชม. ออกจากช่วงเวลาทำงานก่อนคิด normal/OT
    // เช่น std 8 → 9:00–18:00 (9 ชม.) = ปกติเต็ม ; 9:00–19:00 (10 ชม.) = OT 1 ชม.
    const netH = Math.max(0, totalH - 1);
    const stdH = Number(std) || 8;
    const rate = Number(otRate) || 0;
    // base ต่อชั่วโมง = เงินเดือน ÷ 30 ÷ std แล้วคูณ 1.5 / 2 / 3 (fallback เป็น OT Rate ที่กรอกเองถ้าไม่มีเงินเดือน)
    const baseHourly = Number(salary) > 0 ? Number(salary) / 30 / stdH : rate;

    // วันนี้เป็นวันหยุดทางการ (public holiday) หรือไม่
    const isPublicHolidayToday = !!publicHolidays?.[selectedKey];

    const inMin = ih * 60 + im;
    const ssParts = String(shiftStart || '').split(':');
    const ssMin = (ssParts.length >= 2 && !isNaN(Number(ssParts[0])) && !isNaN(Number(ssParts[1])))
      ? Number(ssParts[0]) * 60 + Number(ssParts[1]) : null;

    let workingHour = 0, otHour = 0, otEarning = 0, shiftEarning = 0;
    // แยกรายละเอียด OT ตามอัตรา: 1.5 = วันปกติ, 1 = วันหยุด 8 ชม.แรก, 3 = สามแรง (วันหยุดเลย 8 ชม. / ข้ามคืน)
    let ot15Hours = 0, ot15Earn = 0, ot1Hours = 0, ot1Earn = 0, ot3Hours = 0, ot3Earn = 0;

    if (isPublicHolidayToday) {
      // วันหยุดทางการ: ยังได้ค่าแรงปกติ + บวก OT (เริ่มคิดทันที) — 8 ชม.แรก 1x, เลย 8 ชม. 3x
      // หักเฉพาะส่วนโอที่เลย 8 ชม. (rawOT): > 2 ชม. หัก 30 นาที ; ≥ 9 ชม. หัก 1 ชม.
      // เช่น 9:00–21:00 → netH 11 → ทำงาน 8 + ทำโอ 3 (3>2 หัก 30น. → 2.5)
      // ข้ามเที่ยงคืนไปตกวันปกติ → ยังคิดเรตวันหยุดต่อจนเลิกงาน (ไม่ตัดที่เที่ยงคืน)
      const ot1x = Math.min(netH, stdH);              // 8 ชม.แรก 1x (ไม่หัก)
      const rawOT = Math.max(0, netH - stdH);         // ส่วนที่ทำโอเลย 8 ชม.
      let ot3x = rawOT;
      if (rawOT >= 9) ot3x = Math.max(0, rawOT - 1);
      else if (rawOT > 2) ot3x = Math.max(0, rawOT - 0.5);
      workingHour = Math.min(netH, stdH);
      otHour = ot1x + ot3x;
      ot1Hours = ot1x; ot1Earn = ot1x * 1 * baseHourly;   // _1 = วันหยุด 8 ชม.แรก (เรต 1x)
      ot3Hours = ot3x; ot3Earn = ot3x * 3 * baseHourly;
      ot15Hours = 0; ot15Earn = 0;
      otEarning = ot1Earn + ot3Earn;
      if (Number(shiftAllowance) > 0 && ssMin != null && inMin === ssMin) shiftEarning = Number(shiftAllowance);
    } else {
      // วันปกติ: OT ทั้งหมด = 1.5 เท่า (ทำกะข้ามคืนไปตกวันหยุดก็คิดปกติ ไม่มีสามแรง)
      workingHour = Math.min(netH, stdH);
      const rawOT = Math.max(0, netH - stdH);
      // หักตามชั่วโมง OT ที่ทำจริง (rawOT): 1–2 ชม. เต็ม ; > 2 ชม. หัก 30 นาที ; ≥ 9 ชม. หัก 1 ชม.
      let netNormalOT = rawOT;
      if (rawOT >= 9) netNormalOT = Math.max(0, rawOT - 1);
      else if (rawOT > 2) netNormalOT = Math.max(0, rawOT - 0.5);
      otHour = netNormalOT;
      ot15Hours = netNormalOT; ot15Earn = netNormalOT * 1.5 * baseHourly;
      ot3Hours = 0; ot3Earn = 0;
      otEarning = ot15Earn;
      if (Number(shiftAllowance) > 0 && ssMin != null && inMin === ssMin) shiftEarning = Number(shiftAllowance);
    }

    const regularEarning = paymentType === 'daily'
      ? (Number(dailyRate) || 0) * (stdH > 0 ? workingHour / stdH : 0)
      : 0;

    return {
      working_hour: workingHour,
      ot_hour: otHour,
      ot_earning: otEarning,
      ot15_hours: ot15Hours, ot15_earn: ot15Earn,
      ot1_hours: ot1Hours, ot1_earn: ot1Earn,
      ot3_hours: ot3Hours, ot3_earn: ot3Earn,
      regular_earning: regularEarning,
      shift_allowance: shiftEarning,
      total_earning: regularEarning + otEarning + shiftEarning,
    };
  }, [dIn, dOut, selectedKey, std, salary, otRate, paymentType, dailyRate, shiftAllowance, shiftStart, publicHolidays]);

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
  const labelCls = 'text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] block mb-1';
  const inputCls = 'w-full min-w-0 block bg-[#F8F9FB] border-[1.5px] border-[#D1D5E0] rounded-[6px] text-[#111827] text-sm font-medium px-1 sm:px-3 py-2 outline-none cursor-pointer transition-colors focus:border-[#3B4FE4] focus:bg-white box-border';

  // ── Auth guard — show login if not signed in ──────────────────────────────
  if (authLoading) {
    return <SkeletonAuthLoading />;
  }
  if (!user) return <LoginPage />;

  // ── Profile page ──────────────────────────────────────────────────────────
  if (page === 'profile') {
    return (
      <ProfilePage
        salary={salary} setSalary={setSalary}
        otRate={otRate} setOtRate={setOtRate}
        std={std} setStd={setStd}
        otMode={otMode} setOtMode={setOtMode}
        otBlockHours={otBlockHours} setOtBlockHours={setOtBlockHours}
        otDeductMins={otDeductMins} setOtDeductMins={setOtDeductMins}
        otSettingId={otSettingId} setOtSettingId={setOtSettingId}
        leaveQuotas={leaveQuotas} setLeaveQuotas={setLeaveQuotas}

        shiftAllowance={shiftAllowance} setShiftAllowance={setShiftAllowance}
        shiftStart={shiftStart} setShiftStart={setShiftStart}
        shiftEnd={shiftEnd} setShiftEnd={setShiftEnd}
        socialSecurity={socialSecurity} setSocialSecurity={setSocialSecurity}
        
        paymentType={paymentType} setPaymentType={setPaymentType}
        dailyRate={dailyRate} setDailyRate={setDailyRate}
        workDaysPerWeek={workDaysPerWeek} setWorkDaysPerWeek={setWorkDaysPerWeek}

        lang={lang}
        onBack={() => setPage('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#374151] font-sans antialiased selection:bg-[#EEF0FD]">
      
      {/* ════════════════════════════════════════════
          TOPBAR
      ════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full h-[60px] bg-white border-b border-[#E8EAEF] flex items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-[#3B4FE4] rounded-lg grid place-items-center shrink-0">
            <CalendarDays size={15} className="text-white" />
          </div>
          <span className="font-bold text-[17px] text-[#111827] tracking-tight">TimeFlow</span>
        </div>

        {/* Period filters (desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9CA3AF] mr-1">{t.period}</span>

          <div className="relative">
            <select
              value={viewM}
              onChange={(e) => setViewM(Number(e.target.value))}
              className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[#111827] text-[13px] font-medium pl-3 pr-7 py-[7px] cursor-pointer outline-none shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all hover:border-[#3B4FE4] hover:shadow-[0_0_0_3px_#EEF0FD] focus:border-[#3B4FE4] focus:shadow-[0_0_0_3px_#EEF0FD]"
            >
              {t.months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
          </div>

          <div className="relative">
            <select
              value={viewY}
              onChange={(e) => {
                setViewY(Number(e.target.value));
                showToast(lang === 'th' ? 'กำลังโหลดข้อมูล...' : 'Loading data...');
              }}
              className="appearance-none bg-white border-[1.5px] border-[#D1D5E0] rounded-[10px] text-[#111827] text-[13px] font-medium pl-3 pr-7 py-[7px] cursor-pointer outline-none shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all hover:border-[#3B4FE4] hover:shadow-[0_0_0_3px_#EEF0FD] focus:border-[#3B4FE4] focus:shadow-[0_0_0_3px_#EEF0FD]"
            >
              {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{lang === 'th' ? y + 543 : y}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] text-[10px]">▾</span>
          </div>

          <button
            onClick={goToday}
            className="px-3.5 py-[7px] rounded-[10px] bg-white border-[1.5px] border-[#D1D5E0] text-[#374151] text-[13px] font-medium cursor-pointer shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all hover:border-[#3B4FE4] hover:text-[#3B4FE4] hover:bg-[#EEF0FD] hover:-translate-y-px"
          >
            {t.today}
          </button>
        </div>

        {/* Tab toggle (always visible) — Work Calendar | Dashboard */}
        <div className="flex items-center gap-1 bg-[#F8F9FB] border border-[#E8EAEF] rounded-[10px] p-1">
          {[
            { id: 'calendar', Icon: CalendarDays, label: t.work_calendar },
            { id: 'dashboard', Icon: LayoutDashboard, label: t.dashboard },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold cursor-pointer transition-all
                ${view === id
                  ? 'bg-white text-[#3B4FE4] shadow-[0_1px_3px_rgba(17,24,39,0.08)]'
                  : 'text-[#6B7280] hover:text-[#374151]'}`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Language Toggle & User Menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(l => l === 'en' ? 'th' : 'en')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-[#E8EAEF] text-[11px] font-bold text-[#6B7280] cursor-pointer transition-all hover:border-[#C7CCFA] hover:text-[#3B4FE4]"
          >
            {lang.toUpperCase()}
          </button>

          {/* User Menu Dropdown */}
          <UserMenu
            user={user}
            t={t}
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
        <aside className="hidden xl:flex flex-col w-[220px] shrink-0 bg-white border-r border-[#E8EAEF] sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto p-4 gap-1">

          {/* Nav: Work Calendar / Dashboard */}
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] px-3 pt-3 pb-2">{t.menu}</div>
          <div
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all
              ${view === 'calendar' ? 'bg-[#EEF0FD] text-[#3B4FE4]' : 'text-[#6B7280] hover:bg-[#F8F9FB] hover:text-[#374151]'}`}
          >
            <CalendarDays size={15} />
            {t.work_calendar}
          </div>
          <div
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all
              ${view === 'dashboard' ? 'bg-[#EEF0FD] text-[#3B4FE4]' : 'text-[#6B7280] hover:bg-[#F8F9FB] hover:text-[#374151]'}`}
          >
            <LayoutDashboard size={15} />
            {t.dashboard}
          </div>

          {/* Sub-tabs (แสดงเมื่ออยู่หน้า Dashboard) */}
          {view === 'dashboard' && (
            <div className="mt-1 ml-3 pl-3 border-l border-[#E8EAEF] flex flex-col gap-1">
              <div
                onClick={() => setDashTab('monthly')}
                className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] font-semibold cursor-pointer transition-all
                  ${dashTab === 'monthly' ? 'text-[#3B4FE4]' : 'text-[#6B7280] hover:text-[#374151]'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dashTab === 'monthly' ? 'bg-[#3B4FE4]' : 'bg-[#D1D5E0]'}`} />
                {t.monthly}
              </div>
              <div
                onClick={() => setDashTab('yearly')}
                className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] font-semibold cursor-pointer transition-all
                  ${dashTab === 'yearly' ? 'text-[#3B4FE4]' : 'text-[#6B7280] hover:text-[#374151]'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dashTab === 'yearly' ? 'bg-[#3B4FE4]' : 'bg-[#D1D5E0]'}`} />
                {t.annual}
              </div>
            </div>
          )}
        </aside>

        {/* ── MAIN ─────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-6 p-6 overflow-y-auto">

          {/* ══ CALENDAR VIEW (ปฏิทินการทำงาน) ══ */}
          {view === 'calendar' && !dataLoaded && (
            <SkeletonDashboard daysShort={t.days_short} />
          )}
          {view === 'calendar' && dataLoaded && (
            <WorkCalendar
              viewY={viewY} viewM={viewM} lang={lang} t={t} today={today}
              prevMonth={prevMonth} nextMonth={nextMonth} goToday={goToday}
              setViewM={setViewM} setViewY={setViewY} showToast={showToast}
              entries={entries} setEntries={setEntries}
              earningsSummary={earningsSummary} holidays={holidays}
              publicHolidays={publicHolidays} paymentType={paymentType}
              selectedKey={selectedKey} setSelectedKey={setSelectedKey}
              handleDayClick={handleDayClick} toggleHoliday={toggleHoliday}
              dIn={dIn} dOut={dOut} setDIn={setDIn} setDOut={setDOut}
              saveSelectedEntry={saveSelectedEntry} deleteSelectedEntry={deleteSelectedEntry}
              isSavingEntry={isSavingEntry} isDeletingEntry={isDeletingEntry}
              showLeaveSelector={showLeaveSelector} showDeleteConfirm={showDeleteConfirm}
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
              <div className="flex items-center gap-1 bg-[#F8F9FB] border border-[#E8EAEF] rounded-[12px] p-1 w-full sm:w-auto sm:self-start">
                {[
                  { id: 'monthly', Icon: LayoutDashboard, label: t.monthly },
                  { id: 'yearly', Icon: BarChart2, label: t.annual },
                ].map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setDashTab(id)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all
                      ${dashTab === id
                        ? 'bg-white text-[#3B4FE4] shadow-[0_1px_3px_rgba(17,24,39,0.08)]'
                        : 'text-[#6B7280] hover:text-[#374151]'}`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* รายเดือน */}
              {dashTab === 'monthly' && !dataLoaded && (
                <SkeletonDashboard daysShort={t.days_short} />
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
                  paymentType={paymentType}
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
              {dashTab === 'yearly' && (
                <YearlyDashboard
                  userEmail={user.email}
                  entries={entries}
                  earningsSummary={earningsSummary}
                  holidays={holidays}
                  salary={salary}
                  otRate={otRate}
                  leaveQuotas={leaveQuotas}
                  paymentType={paymentType}
                  dailyRate={dailyRate}
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

      {/* Mobile Delete Confirmation Bottom Sheet */}
      {showDeleteConfirm && (
        <div 
          className="xl:hidden fixed inset-0 z-[250] bg-black/40 flex items-end justify-center animate-[fadeIn_0.2s_ease_both]"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white w-full rounded-t-[24px] shadow-xl flex flex-col overflow-hidden animate-[slideUpSheet_0.3s_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-[#E8EAEF] rounded-full"></div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 pb-10 gap-4">
              <div className="w-14 h-14 bg-[#FEF2F2] rounded-full flex items-center justify-center mb-1 text-[#EF4444]">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[17px] font-bold text-[#111827] text-center leading-tight">{t.confirm_delete_title || 'Delete this entry?'}</h3>
              <p className="text-[14px] text-[#6B7280] text-center mb-2 px-2 leading-relaxed">{t.confirm_delete || 'Are you sure you want to delete this entry?'}</p>
              
              <div className="flex w-full gap-3 mt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-[12px] bg-[#F8F9FB] text-[#6B7280] text-[15px] font-bold border border-[#E8EAEF] transition-all cursor-pointer hover:bg-[#E8EAEF]"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    performDelete();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-3.5 rounded-[12px] bg-[#EF4444] text-white text-[15px] font-bold border-none transition-all cursor-pointer hover:bg-[#DC2828] shadow-[0_4px_14px_rgba(239,68,68,0.25)]"
                >
                  {t.confirm_yes || 'Yes, delete it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Mobile Profile Incomplete Warning Bottom Sheet */}
      {showProfileIncomplete && (
        <div 
          className="xl:hidden fixed inset-0 z-[250] bg-black/40 flex items-end justify-center animate-[fadeIn_0.2s_ease_both]"
          onClick={() => setShowProfileIncomplete(false)}
        >
          <div 
            className="bg-white w-full rounded-t-[24px] shadow-xl flex flex-col overflow-hidden animate-[slideUpSheet_0.3s_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-[#E8EAEF] rounded-full"></div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 pb-10 gap-4">
              <div className="w-16 h-16 bg-[#FFFBEB] rounded-full flex items-center justify-center mb-1 text-[#F59E0B]">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-1 px-4">
                <h3 className="text-[18px] font-bold text-[#111827] leading-tight">{t.profile_incomplete_title}</h3>
                <p className="text-[14px] text-[#6B7280] leading-relaxed">{t.profile_incomplete_msg}</p>
              </div>
              
              <div className="flex w-full gap-3 mt-2">
                <button
                  onClick={() => setShowProfileIncomplete(false)}
                  className="flex-1 py-3.5 rounded-[14px] bg-[#F8F9FB] text-[#6B7280] text-[15px] font-bold border border-[#E8EAEF] transition-all cursor-pointer hover:bg-[#E8EAEF]"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setShowProfileIncomplete(false);
                    setPage('profile');
                  }}
                  className="flex-1 py-3.5 rounded-[14px] bg-[#3B4FE4] text-white text-[15px] font-bold border-none transition-all cursor-pointer hover:bg-[#2A3BC0] shadow-[0_4px_14px_rgba(59,79,228,0.25)]"
                >
                  {t.go_to_profile}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Toast */}
      <div className={`fixed bottom-6 right-6 bg-[#111827] text-white text-[13px] font-medium px-4 py-3 rounded-[10px] z-[300] shadow-[0_8px_28px_rgba(17,24,39,0.1)] flex items-center gap-2 pointer-events-none transition-all duration-300
        ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <CheckCircle2 size={14} className="text-[#10B981]" />
        {toast.msg}
      </div>

      {/* Saving Toast */}
      <div className={`fixed bottom-6 right-6 bg-[#111827] text-white text-[13px] font-medium px-4 py-3 rounded-[10px] z-[299] shadow-[0_8px_28px_rgba(17,24,39,0.1)] flex items-center gap-2 pointer-events-none transition-all duration-300
        ${(isSavingEntry || isDeletingEntry || isSavingLeave) && !toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Loader2 size={14} className="text-[#3B4FE4] animate-spin" />
        {lang === 'th' ? 'กำลังบันทึกและคำนวณเงิน...' : 'Saving and calculating...'}
      </div>

    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────
function UserMenu({ user, t, onProfile, onSignOut }) {
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
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border-[1.5px] border-[#E8EAEF] bg-white cursor-pointer transition-all hover:border-[#C7CCFA] hover:shadow-[0_2px_8px_rgba(17,24,39,0.08)] select-none"
      >
        {/* Avatar image */}
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-7 h-7 rounded-full object-cover border border-[#E8EAEF]"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#EEF0FD] grid place-items-center text-[11px] font-bold text-[#3B4FE4]">
            {initials}
          </div>
        )}
        {/* Name (desktop only) */}
        <span className="hidden md:block text-[12px] font-semibold text-[#374151] max-w-[100px] truncate">
          {user?.name?.split(' ')[0]}
        </span>
        <ChevronDown size={12} className={`text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[240px] bg-white border border-[#E8EAEF] rounded-2xl shadow-[0_8px_32px_rgba(17,24,39,0.12)] z-[999] overflow-hidden animate-[fadeUp_0.2s_ease_both]">

          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-[#F3F4F8]">
            <div className="flex items-center gap-3">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-9 h-9 rounded-xl object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#EEF0FD] grid place-items-center text-[13px] font-bold text-[#3B4FE4]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#111827] truncate">{user?.name}</div>
                <div className="text-[11px] text-[#9CA3AF] truncate">{user?.email}</div>
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

          <div className="border-t border-[#F3F4F8] py-1.5">
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
          ? 'text-[#F43F5E] hover:bg-[#FFF1F3]'
          : 'text-[#374151] hover:bg-[#F8F9FB]'}`}
    >
      <div className={`w-7 h-7 rounded-[7px] grid place-items-center shrink-0
        ${danger ? 'bg-[#FFF1F3]' : 'bg-[#F8F9FB]'}`}>
        <Icon size={14} className={danger ? 'text-[#F43F5E]' : 'text-[#6B7280]'} />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold">{label}</div>
        {sub && <div className="text-[10px] text-[#9CA3AF]">{sub}</div>}
      </div>
    </button>
    );
    }
