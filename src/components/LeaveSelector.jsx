import React, { useState, useEffect } from 'react';
import { X, Stethoscope, UmbrellaOff, Plane, Clock } from 'lucide-react';

const LEAVE_TYPES = [
  { key: 'sick', label: 'Sick Leave', icon: Stethoscope, color: '#F43F5E', bg: '#FFF1F3' },
  { key: 'personal', label: 'Personal Leave', icon: UmbrellaOff, color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'vacation', label: 'Annual Leave', icon: Plane, color: '#3B4FE4', bg: '#EEF0FD' },
];

export function LeaveSelector({ isOpen, dateStr, currentData, onSelect, onCancel, lang = 'en', isMobile = false, onWorkSelected = null }) {
  const [mode, setMode] = useState('choice'); // 'choice' | 'leaveType'

  // Reset mode when opening
  useEffect(() => {
    if (isOpen) {
      setMode('choice');
    }
  }, [isOpen]);

  const handleSelectWork = () => {
    onSelect(dateStr, { leave: null });
    // Don't close immediately - let parent handle it
    // If desktop and onWorkSelected callback, call it to show time inputs
    if (onWorkSelected) {
      onWorkSelected();
    }
  };

  const handleSelectLeaveType = (type) => {
    onSelect(dateStr, { leave: { type } });
    // Close modal immediately after selecting leave type
    setMode('choice');
    onCancel();
  };

  const handleClose = () => {
    setMode('choice');
    onCancel();
  };

  if (!isOpen) return null;

  const isLeave = currentData?.leave !== null && currentData?.leave !== undefined;
  const currentLeaveType = currentData?.leave?.type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div 
        className="bg-white rounded-3xl shadow-xl max-w-md w-full animate-[fadeUp_0.3s_ease_both]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8EAEF]">
          <h2 className="text-lg font-bold text-[#111827]">
            {mode === 'choice' ? (lang === 'th' ? 'เลือกสถานะ' : 'Select Status') : (lang === 'th' ? 'เลือกประเภทการลา' : 'Select Leave Type')}
          </h2>
          <button 
            onClick={handleClose} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F8F9FB] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'choice' ? (
            <div className="space-y-3">
              {/* Work Option */}
              <button
                onClick={handleSelectWork}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3
                  ${!isLeave
                    ? 'border-[#3B4FE4] bg-[#EEF0FD] shadow-sm'
                    : 'border-[#E8EAEF] hover:border-[#D1D5E0] hover:bg-[#F8F9FB]'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${!isLeave ? 'bg-[#3B4FE4] text-white' : 'bg-[#F0F1F9] text-[#6B7280]'}`}>
                  <Clock size={20} />
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">{lang === 'th' ? 'ทำงาน' : 'Working'}</div>
                  <div className="text-xs text-[#9CA3AF]">{lang === 'th' ? 'บันทึกเวลาทำงาน' : 'Record work time'}</div>
                </div>
              </button>

              {/* Leave Option */}
              <button
                onClick={() => setMode('leaveType')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3
                  ${isLeave
                    ? 'border-[#8B5CF6] bg-[#F5F3FF] shadow-sm'
                    : 'border-[#E8EAEF] hover:border-[#D1D5E0] hover:bg-[#F8F9FB]'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${isLeave ? 'bg-[#8B5CF6] text-white' : 'bg-[#F0F1F9] text-[#6B7280]'}`}>
                  <UmbrellaOff size={20} />
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">{lang === 'th' ? 'ลางาน' : 'Taking Leave'}</div>
                  <div className="text-xs text-[#9CA3AF]">
                    {isLeave && currentLeaveType
                      ? LEAVE_TYPES.find(t => t.key === currentLeaveType)?.label
                      : (lang === 'th' ? 'เลือกประเภทการลา' : 'Select leave type')
                    }
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {LEAVE_TYPES.map((leave) => (
                <button
                  key={leave.key}
                  onClick={() => handleSelectLeaveType(leave.key)}
                  className="w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3"
                  style={{
                    borderColor: currentLeaveType === leave.key ? leave.color : '#E8EAEF',
                    backgroundColor: currentLeaveType === leave.key ? leave.bg : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentLeaveType !== leave.key) {
                      e.currentTarget.style.borderColor = '#D1D5E0';
                      e.currentTarget.style.backgroundColor = '#F8F9FB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentLeaveType !== leave.key) {
                      e.currentTarget.style.borderColor = '#E8EAEF';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg grid place-items-center shrink-0 text-white"
                    style={{ backgroundColor: leave.color }}
                  >
                    <leave.icon size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#111827]">{leave.label}</div>
                    <div className="text-xs text-[#9CA3AF]">{lang === 'th' ? `${leave.label}` : `${leave.label}`}</div>
                  </div>
                </button>
              ))}
              
              {/* Back Button */}
              <button
                onClick={() => setMode('choice')}
                className="w-full mt-4 p-3 rounded-lg border border-[#E8EAEF] text-[#6B7280] font-semibold text-sm hover:bg-[#F8F9FB] transition-colors"
              >
                {lang === 'th' ? 'กลับ' : 'Back'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
