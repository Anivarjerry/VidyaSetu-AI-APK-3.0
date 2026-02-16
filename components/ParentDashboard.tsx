
import React, { useState } from 'react';
import { DashboardData, LoginRequest, ParentHomework } from '../types';
import { UserCheck, CalendarRange, Truck, BookOpen, Lock, PieChart, Image as ImageIcon } from 'lucide-react';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { AttendanceHistoryModal } from './AttendanceHistoryModal';
import { StudentLeaveRequestModal } from './LeaveModals';
import { TransportTrackerModal } from './TransportTrackerModal';
import { HomeworkListModal } from './HomeworkListModal';
import { ParentHomeworkModal } from './ParentHomeworkModal';
import { GalleryModal } from './GalleryModal';
import { ReportModal } from './ReportModal';
import { updateParentHomeworkStatus, getISTDate } from '../services/dashboardService';

interface ParentDashboardProps {
  data: DashboardData;
  credentials: LoginRequest;
  role: 'parent' | 'student';
  isSchoolActive: boolean;
  isUserActive: boolean;
  onShowLocked: (type: 'school' | 'parent') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ 
  data, 
  credentials,
  role,
  isSchoolActive, 
  isUserActive,
  onShowLocked,
  onRefresh,
  isRefreshing
}) => {
  const { t } = useThemeLanguage();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedHomework, setSelectedHomework] = useState<ParentHomework | null>(null);

  // NOTE: We removed the local useModalBackHandler here because the <Modal> components
  // now handle history registration internally. Double registration causes bugs.

  const isFeatureLocked = !isSchoolActive || !isUserActive;

  const handleCardClick = (key: string) => {
      if (isFeatureLocked) {
          if (!isSchoolActive) onShowLocked('school');
          else onShowLocked('parent');
      } else {
          setActiveModal(key);
      }
  };

  const handleHomeworkComplete = async () => {
      if(selectedHomework) {
          await updateParentHomeworkStatus(
              credentials.school_id, 
              data.class_name || '', 
              data.section || '', 
              data.student_id || '', 
              credentials.mobile, 
              selectedHomework.period, 
              selectedHomework.subject, 
              getISTDate()
          );
          // Instead of closing "details" and re-opening "list" which causes history jump,
          // We just close details. Since "list" remains mounted, it's smooth.
          setActiveModal('daily_tasks');
          onRefresh();
      }
  };

  if (!data.student_id) {
      return <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest"><p>Student Profile Not Linked</p></div>;
  }

  // Unified Item List
  const dashboardItems = [
      { key: 'daily_tasks', title: t('daily_tasks'), sub: "Assignments", icon: <BookOpen size={20} />, color: "text-brand-600", bg: "bg-brand-500/10" },
      { key: 'attendance_history', title: t('attendance'), sub: data.today_attendance ? t(data.today_attendance) : t('waiting'), icon: <UserCheck size={20} />, color: data.today_attendance === 'present' ? "text-emerald-600" : data.today_attendance === 'absent' ? "text-rose-600" : "text-blue-600", bg: data.today_attendance === 'present' ? "bg-emerald-500/10" : data.today_attendance === 'absent' ? "bg-rose-500/10" : "bg-blue-500/10" },
      { key: 'reports', title: "Results", sub: "Performance", icon: <PieChart size={20} />, color: "text-purple-600", bg: "bg-purple-500/10" },
      { key: 'live_transport', title: t('live_transport'), sub: "Track Bus", icon: <Truck size={20} />, color: "text-orange-600", bg: "bg-orange-500/10" },
      { key: 'apply_leave', title: t('apply_leave'), sub: "Request Off", icon: <CalendarRange size={20} />, color: "text-indigo-600", bg: "bg-indigo-500/10" },
      { key: 'gallery', title: "Gallery", sub: "Memories", icon: <ImageIcon size={20} />, color: "text-sky-600", bg: "bg-sky-500/10" },
  ];

  return (
    <div className="pb-24">
        {/* UNIFIED GRID */}
        <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-300">
            {dashboardItems.map((item) => (
                <div 
                    key={item.key}
                    onClick={() => handleCardClick(item.key)}
                    className={`glass-card p-4 rounded-[1.8rem] flex flex-col justify-center items-center text-center gap-2 cursor-pointer group active:scale-[0.98] transition-all shadow-sm relative overflow-hidden ${isFeatureLocked ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20 opacity-80' : 'bg-white dark:bg-dark-900'}`}
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 ${isFeatureLocked ? 'bg-rose-500 text-white' : `${item.bg} ${item.color}`}`}>
                        {item.icon}
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-xs leading-tight ${isFeatureLocked ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{item.title}</h3>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isFeatureLocked ? 'text-rose-400' : 'text-slate-400'}`}>{item.sub}</p>
                    </div>
                    {isFeatureLocked && <div className="absolute top-2 right-2"><Lock size={12} className="text-rose-400" /></div>}
                </div>
            ))}
        </div>

        {/* MODALS */}
        <AttendanceHistoryModal isOpen={activeModal === 'attendance_history'} onClose={() => setActiveModal(null)} studentId={data.student_id || ''} studentName={data.student_name || ''} />
        <StudentLeaveRequestModal isOpen={activeModal === 'apply_leave'} onClose={() => setActiveModal(null)} parentId={role === 'student' ? (data.linked_parent_id || data.user_id || '') : (data.user_id || '')} studentId={data.student_id || ''} schoolId={data.school_db_id || ''} />
        <TransportTrackerModal isOpen={activeModal === 'live_transport'} onClose={() => setActiveModal(null)} schoolId={data.school_db_id || ''} />
        
        {/* HOMEWORK MODALS - IMPROVED STACKING */}
        {/* Keep List open even when Details are open to prevent unmount/remount flicker */}
        <HomeworkListModal 
            isOpen={activeModal === 'daily_tasks' || activeModal === 'homework_details'} 
            onClose={() => setActiveModal(null)} 
            dashboardData={data} 
            credentials={credentials} 
            isSubscribed={!isFeatureLocked} 
            onLockClick={() => onShowLocked('parent')} 
            onViewHomework={(hw) => { setSelectedHomework(hw); setActiveModal('homework_details'); }} 
            onRefresh={onRefresh} 
            isRefreshing={isRefreshing} 
            refreshTrigger={0} 
        />
        
        {/* Detail View overlays the List */}
        <ParentHomeworkModal 
            isOpen={activeModal === 'homework_details'} 
            onClose={() => setActiveModal('daily_tasks')} 
            data={selectedHomework} 
            onComplete={handleHomeworkComplete} 
            isSubmitting={false} 
        />

        {/* SHARED */}
        <GalleryModal isOpen={activeModal === 'gallery'} onClose={() => setActiveModal(null)} schoolId={data.school_db_id || ''} userId={data.user_id || ''} canUpload={false} />
        <ReportModal isOpen={activeModal === 'reports'} onClose={() => setActiveModal(null)} role={role} schoolId={data.school_db_id} userId={data.user_id} studentId={data.student_id} studentName={data.student_name} />
    </div>
  );
};
