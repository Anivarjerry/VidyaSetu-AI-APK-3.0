
import React, { useState } from 'react';
import { DashboardData, LoginRequest, ParentHomework } from '../types';
import { UserCheck, CalendarRange, Truck, BookOpen, Lock, ChevronRight, PieChart, Image as ImageIcon } from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
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
  const [stack, setStack] = useState<string[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<ParentHomework | null>(null);
  
  // Shared Features
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useModalBackHandler(stack.length > 0 || isGalleryOpen || isReportOpen, () => {
      if (isGalleryOpen) setIsGalleryOpen(false);
      else if (isReportOpen) setIsReportOpen(false);
      else setStack(prev => prev.slice(0, -1));
  });

  const isFeatureLocked = !isSchoolActive || !isUserActive;

  const handleCardClick = (key: string) => {
      if (isFeatureLocked) {
          if (!isSchoolActive) onShowLocked('school');
          else onShowLocked('parent');
      } else {
          setStack(prev => [...prev, key]);
      }
  };

  const handleGalleryClick = () => {
      if (isFeatureLocked) {
          if (!isSchoolActive) onShowLocked('school');
          else onShowLocked('parent');
      } else {
          setIsGalleryOpen(true);
      }
  };

  const handleReportClick = () => {
      if (isFeatureLocked) {
          if (!isSchoolActive) onShowLocked('school');
          else onShowLocked('parent');
      } else {
          setIsReportOpen(true);
      }
  };

  if (!data.student_id) {
      return <div className="p-8 text-center"><p>Student Profile Not Linked</p></div>;
  }

  return (
    <div className="space-y-4 pb-10">
        
        {/* SHARED CARDS */}
        <div className="space-y-3">
            {/* Gallery */}
            <div 
                onClick={handleGalleryClick} 
                className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${isFeatureLocked ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
            >
                <div className="flex items-center gap-4 text-left">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${isFeatureLocked ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                        <ImageIcon size={24} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-base leading-tight ${isFeatureLocked ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Photo Gallery</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Events & Memories</p>
                    </div>
                </div>
                {isFeatureLocked ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200 group-hover:text-brand-500 transition-colors" />}
            </div>

            {/* Exam Result Analytics */}
            <div 
                onClick={handleReportClick} 
                className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${isFeatureLocked ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
            >
                <div className="flex items-center gap-4 text-left">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${isFeatureLocked ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                        <PieChart size={24} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-base leading-tight ${isFeatureLocked ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Result Analytics</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Download Report Cards</p>
                    </div>
                </div>
                {isFeatureLocked ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200 group-hover:text-brand-500 transition-colors" />}
            </div>
        </div>

        {/* MAIN FEATURES */}
        <div className="space-y-3">
            {/* 3. Attendance Status */}
            <div onClick={() => isSchoolActive ? setStack(prev => [...prev, 'attendance_history']) : onShowLocked('school')} className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}><UserCheck size={28} /></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('attendance_status')}</p><h4 className={`text-base font-black uppercase leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{t('current')}: <span className={data?.today_attendance === 'present' ? 'text-emerald-500' : data?.today_attendance === 'absent' ? 'text-rose-500' : 'text-brand-500'}>{data?.today_attendance ? t(data.today_attendance) : t('waiting')}</span></h4></div>
                </div>
                {!isSchoolActive ? <Lock size={18} className="text-rose-400" /> : <ChevronRight size={20} className="text-slate-300" />}
            </div>

            {/* 4, 5, 6 Cards */}
            {[
                { key: 'apply_leave', icon: <CalendarRange size={28} />, title: t('apply_leave'), sub: 'Absence Request Portal' },
                { key: 'live_transport', icon: <Truck size={28} />, title: t('live_transport'), sub: 'Real-time Route Monitor' },
                { key: 'daily_tasks', icon: <BookOpen size={28} />, title: t('daily_tasks'), sub: 'Check Current Assignments' }
            ].map((it, idx) => {
                return (
                    <div key={idx} onClick={() => handleCardClick(it.key)} className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm ${isFeatureLocked ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}>
                        <div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isFeatureLocked ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>{it.icon}</div><div className="text-left"><h3 className={`font-black uppercase text-base leading-tight ${isFeatureLocked ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{it.title}</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{it.sub}</p></div></div>
                        {isFeatureLocked ? <Lock size={18} className="text-rose-400" /> : <ChevronRight size={20} className="text-slate-300" />}
                    </div>
                );
            })}
        </div>

        {/* MODALS */}
        <AttendanceHistoryModal isOpen={stack[stack.length-1] === 'attendance_history'} onClose={() => setStack(prev => prev.slice(0, -1))} studentId={data.student_id || ''} studentName={data.student_name || ''} />
        <StudentLeaveRequestModal isOpen={stack[stack.length-1] === 'apply_leave'} onClose={() => setStack(prev => prev.slice(0, -1))} parentId={role === 'student' ? (data.linked_parent_id || data.user_id || '') : (data.user_id || '')} studentId={data.student_id || ''} schoolId={data.school_db_id || ''} />
        <TransportTrackerModal isOpen={stack[stack.length-1] === 'live_transport'} onClose={() => setStack(prev => prev.slice(0, -1))} schoolId={data.school_db_id || ''} />
        
        {/* HOMEWORK MODALS */}
        <HomeworkListModal isOpen={stack.includes('daily_tasks')} onClose={() => setStack(prev => prev.filter(k => k !== 'daily_tasks' && k !== 'homework_details'))} dashboardData={data} credentials={credentials} isSubscribed={isUserActive} onLockClick={() => onShowLocked('parent')} onViewHomework={(hw) => { setSelectedHomework(hw); setStack(prev => [...prev, 'homework_details']); }} onRefresh={onRefresh} isRefreshing={isRefreshing} refreshTrigger={0} />
        <ParentHomeworkModal isOpen={stack[stack.length-1] === 'homework_details'} onClose={() => setStack(prev => prev.slice(0, -1))} data={selectedHomework} onComplete={async () => { if(selectedHomework) await updateParentHomeworkStatus(credentials.school_id, data.class_name || '', data.section || '', data.student_id || '', credentials.mobile, selectedHomework.period, selectedHomework.subject, getISTDate()); setStack(prev => prev.slice(0, -1)); onRefresh(); }} isSubmitting={false} />

        {/* SHARED */}
        <GalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} schoolId={data.school_db_id || ''} userId={data.user_id || ''} canUpload={false} />
        <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} role={role} schoolId={data.school_db_id} userId={data.user_id} studentId={data.student_id} studentName={data.student_name} />
    </div>
  );
};
