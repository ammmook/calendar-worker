import { Stethoscope, UmbrellaOff, Plane, GraduationCap } from 'lucide-react';

// ตารางประเภทการลา/อบรมที่ใช้ร่วมกัน (DayCell + DayDetailForm)
export const LEAVE_META = {
  sick:     { Icon: Stethoscope,   color: '#F43F5E', bg: '#FFF1F3', th: 'ลาป่วย',   en: 'Sick Leave'     },
  personal: { Icon: UmbrellaOff,   color: '#F472B6', bg: '#FCE7F3', th: 'ลากิจ',    en: 'Personal Leave' },
  vacation: { Icon: Plane,         color: '#3B4FE4', bg: '#EEF0FD', th: 'ลาพักร้อน', en: 'Annual Leave'   },
  training: { Icon: GraduationCap, color: '#111827', bg: '#F3F4F6', th: 'อบรม',     en: 'Training'       },
};
