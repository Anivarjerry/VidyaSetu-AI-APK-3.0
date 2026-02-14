
import React, { useState } from 'react';
import { DashboardData, LoginRequest, PeriodData } from '../types';
import { UserCheck, CalendarRange, History, BookOpen, Lock, ChevronRight, CheckCircle2, Sparkles, Image as ImageIcon, FileText, FileCheck } from 'lucide-react';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { AttendanceModal } from './AttendanceModal';
import { LeaveRequestModal } from './LeaveModals';
import { TeacherHistoryModal } from './TeacherHistoryModal';
import { PeriodModal } from './PeriodModal';
import { Modal } from './Modal';
import { submitPeriodData } from '../services/dashboardService';
import { GalleryModal } from './GalleryModal';
import { ExamModal } from './ExamModal';
import { ReportModal } from './ReportModal';

interface TeacherDashboardProps {
  data: DashboardData;
  credentials: LoginRequest;
  isSchoolActive: boolean;
  onShowLocked: () => void;
  onRefresh: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  data, 
  credentials, 
  isSchoolActive, 
  onShowLocked,
  onRefresh
}) => {
  const { t } = useThemeLanguage();
  
  // Local State for Modals (Replaces NavigationContext)
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  // Back Button Handler
  useModalBackHandler(!!activeModal, () => setActiveModal(null));

  const handlePeriodSubmit = async (pData: PeriodData) => {
    const success = await submitPeriodData(credentials.school_id, credentials.mobile, pData, data.user_name, 'submit');
    if (success) { 
        const msg = navigator.onLine 
            ? "Submission Synced with Cloud!" 
            : "Saved Offline. Will sync when online.";
        alert(msg);
        
        // Close Edit Period Modal, but Keep Homework Grid Open
        setActiveModal('homework'); 
        onRefresh(); 
    } else alert("Submission Failed!");
  };

  const getPeriodsArray = () => {
      const count = data?.total_periods || 8;
      return Array.from({ length: count }, (_, i) => i + 1);
  };

  const handleCardClick = (key: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSchoolActive) {
          onShowLocked();
          return;
      }
      setActiveModal(key);
  };

  return (
    <div className="space-y-4 pb-10">
       {/* SHARED TOP CARDS */}
       <div className="space-y-3">
            {/* Gallery */}
            <div 
                onClick={() => isSchoolActive ? setActiveModal('gallery') : onShowLocked()} 
                className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
            >
                <div className="flex items-center gap-4 text-left">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                        <ImageIcon size={24} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-base leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Photo Gallery</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Events & Memories</p>
                    </div>
                </div>
                {!isSchoolActive ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200 group-hover:text-brand-500 transition-colors" />}
            </div>

            {/* Exam Management */}
            <div 
                onClick={() => isSchoolActive ? setActiveModal('exam_mgmt') : onShowLocked()} 
                className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
            >
                <div className="flex items-center gap-4 text-left">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                        <FileCheck size={24} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-base leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Result Management</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Upload Marks & Reports</p>
                    </div>
                </div>
                {!isSchoolActive ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200 group-hover:text-brand-500 transition-colors" />}
            </div>

            {/* Download History */}
            <div 
                onClick={() => isSchoolActive ? setActiveModal('reports') : onShowLocked()} 
                className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
            >
                <div className="flex items-center gap-4 text-left">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-base leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Download History</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Report Center (PDF)</p>
                    </div>
                </div>
                {!isSchoolActive ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200 group-hover:text-brand-500 transition-colors" />}
            </div>
       </div>

       {/* MAIN FEATURE CARDS */}
       <div className="space-y-3">
          {[
              { key: 'attendance', icon: <UserCheck size={28} />, title: t('attendance'), sub: t('digital_register') },
              { key: 'leave', icon: <CalendarRange size={28} />, title: t('staff_leave'), sub: t('apply_absence') },
              { key: 'history', icon: <History size={28} />, title: "Previous History", sub: "Cloud Submission Log" },
              { key: 'homework', icon: <BookOpen size={28} />, title: "Submit Homework", sub: `${data?.total_periods || 8} Daily Learning Periods`, border: "border-l-4 border-brand-500" }
          ].map((it, idx) => (
              <div key={idx} onClick={(e) => handleCardClick(it.key, e)} className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-sm ${it.border || ''} ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}><div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>{it.icon}</div><div className="text-left"><h3 className={`font-black uppercase text-base leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{it.title}</h3><p className="text-[10px] font-black text-slate-400 font-black uppercase tracking-widest">{it.sub}</p></div></div>{!isSchoolActive ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200" />}</div>
          ))}
       </div>

       {/* MODALS */}
       <AttendanceModal isOpen={activeModal === 'attendance'} onClose={() => setActiveModal(null)} schoolId={data.school_db_id || ''} teacherId={data.user_id || ''} />
       <LeaveRequestModal isOpen={activeModal === 'leave'} onClose={() => setActiveModal(null)} userId={data.user_id || ''} schoolId={data.school_db_id || ''} />
       <TeacherHistoryModal isOpen={activeModal === 'history'} onClose={() => setActiveModal(null)} credentials={credentials} />
       
       {/* HOMEWORK GRID MODAL */}
       <Modal isOpen={activeModal === 'homework'} onClose={() => setActiveModal(null)} title="TODAY'S PORTAL">
           <div className="space-y-4 premium-subview-enter">
               <div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-500/10 p-5 rounded-[2.5rem] border border-brand-100 dark:border-brand-500/20">
                   <div className="w-14 h-14 bg-white dark:bg-dark-900 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm shrink-0"><Sparkles size={28} /></div>
                   <div className="text-left"><h4 className="font-black text-slate-800 dark:text-white uppercase leading-tight">Quick Submission</h4><p className="text-[10px] font-black text-slate-400 dark:text-brand-500/60 uppercase tracking-widest">Update {data?.total_periods || 8} sessions</p></div>
               </div>
               
               <div className="grid grid-cols-2 gap-3 pb-4">
                   {getPeriodsArray().map((num) => { 
                       const pData = data?.periods?.find(p => p.period_number === num); 
                       const isSubmitted = pData?.status === 'submitted'; 
                       return (
                           <div key={num} onClick={(e) => { e.stopPropagation(); setSelectedPeriod(num); setActiveModal('edit_period'); }} className={`glass-card p-4 rounded-[2rem] transition-all h-36 flex flex-col justify-between cursor-pointer active:scale-95 ${isSubmitted ? 'border-brand-500/30 bg-brand-50 dark:bg-brand-500/5 shadow-inner' : ''}`}>
                               <div className="flex justify-between items-start text-left"><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">P {num}</span>{isSubmitted && <div className="text-brand-500"><CheckCircle2 size={16} /></div>}</div>
                               <div className="min-w-0 text-left"><p className="text-sm font-black truncate uppercase text-slate-800 dark:text-white leading-tight">{pData?.subject || 'Waiting'}</p><p className="text-[9px] font-bold text-slate-400 uppercase truncate">{pData?.class_name || 'Empty'}</p></div>
                               <button className={`w-full py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest ${isSubmitted ? 'bg-brand-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{isSubmitted ? 'EDIT' : 'SET'}</button>
                           </div>
                       ); 
                   })}
               </div>
               
               <button onClick={() => setActiveModal(null)} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 dark:border-white/5">Close Portal</button>
           </div>
       </Modal>
       
       <PeriodModal 
           isOpen={activeModal === 'edit_period'} 
           onClose={() => setActiveModal('homework')} 
           periodNumber={selectedPeriod || 1} 
           onSubmit={handlePeriodSubmit} 
           initialData={data?.periods?.find(p => p.period_number === selectedPeriod)} 
           schoolDbId={data?.school_db_id} 
       />

       {/* Extra Shared Modals */}
       <GalleryModal isOpen={activeModal === 'gallery'} onClose={() => setActiveModal(null)} schoolId={data.school_db_id || ''} userId={data.user_id || ''} canUpload={true} />
       <ExamModal isOpen={activeModal === 'exam_mgmt'} onClose={() => setActiveModal(null)} role='teacher' schoolId={data.school_db_id || ''} userId={data.user_id || ''} assignedSubject={data.assigned_subject} />
       <ReportModal isOpen={activeModal === 'reports'} onClose={() => setActiveModal(null)} role='teacher' schoolId={data.school_db_id} userId={data.user_id} />
    </div>
  );
};
