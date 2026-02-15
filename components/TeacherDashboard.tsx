
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
  
  // Local State for Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // New State for "Portal" Modal Navigation
  const [portalView, setPortalView] = useState<'grid' | 'edit'>('grid');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  // Back Button Handler
  useModalBackHandler(!!activeModal, () => {
      // If we are in 'edit' view of homework, back should go to 'grid'
      if (activeModal === 'homework' && portalView === 'edit') {
          setPortalView('grid');
          setSelectedPeriod(null);
      } else {
          setActiveModal(null);
      }
  });

  const handlePeriodSubmit = async (pData: PeriodData) => {
    const success = await submitPeriodData(credentials.school_id, credentials.mobile, pData, data.user_name, 'submit');
    if (success) { 
        const msg = navigator.onLine 
            ? "Submission Synced with Cloud!" 
            : "Saved Offline. Will sync when online.";
        alert(msg);
        
        // Return to Grid View
        setPortalView('grid');
        setSelectedPeriod(null);
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
      // Reset portal state when opening
      if (key === 'homework') {
          setPortalView('grid');
          setSelectedPeriod(null);
      }
  };

  return (
    <div className="space-y-3 pb-10">
       {/* SHARED TOP CARDS */}
       <div className="grid grid-cols-2 gap-2">
            {/* Gallery */}
            <div 
                onClick={() => isSchoolActive ? setActiveModal('gallery') : onShowLocked()} 
                className={`glass-card p-4 rounded-[1.8rem] flex flex-col items-center justify-center gap-2 cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                    <ImageIcon size={20} />
                </div>
                <div className="text-center">
                    <h3 className={`font-black uppercase text-xs leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Gallery</h3>
                </div>
            </div>

            {/* Exam Management */}
            <div 
                onClick={() => isSchoolActive ? setActiveModal('exam_mgmt') : onShowLocked()} 
                className={`glass-card p-4 rounded-[1.8rem] flex flex-col items-center justify-center gap-2 cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                    <FileCheck size={20} />
                </div>
                <div className="text-center">
                    <h3 className={`font-black uppercase text-xs leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Results</h3>
                </div>
            </div>
       </div>

       {/* Download History Card - Full Width */}
       <div 
            onClick={() => isSchoolActive ? setActiveModal('reports') : onShowLocked()} 
            className={`glass-card p-4 rounded-[2rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
        >
            <div className="flex items-center gap-3 text-left">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                    <FileText size={20} />
                </div>
                <div>
                    <h3 className={`font-black uppercase text-sm leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>Downloads</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Report Center</p>
                </div>
            </div>
            {!isSchoolActive ? <Lock size={16} className="text-rose-400" /> : <ChevronRight size={18} className="text-slate-200 group-hover:text-brand-500 transition-colors" />}
        </div>

       {/* MAIN FEATURE CARDS */}
       <div className="space-y-2">
          {[
              { key: 'attendance', icon: <UserCheck size={22} />, title: t('attendance'), sub: t('digital_register') },
              { key: 'leave', icon: <CalendarRange size={22} />, title: t('staff_leave'), sub: t('apply_absence') },
              { key: 'history', icon: <History size={22} />, title: "Previous History", sub: "Cloud Submission Log" },
              { key: 'homework', icon: <BookOpen size={22} />, title: "Submit Homework", sub: `${data?.total_periods || 8} Daily Periods`, border: "border-l-4 border-brand-500" }
          ].map((it, idx) => (
              <div key={idx} onClick={(e) => handleCardClick(it.key, e)} className={`glass-card p-4 rounded-[2rem] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-sm ${it.border || ''} ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>{it.icon}</div><div className="text-left"><h3 className={`font-black uppercase text-sm leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{it.title}</h3><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{it.sub}</p></div></div>{!isSchoolActive ? <Lock size={16} className="text-rose-400" /> : <ChevronRight size={18} className="text-slate-200" />}</div>
          ))}
       </div>

       {/* MODALS */}
       <AttendanceModal isOpen={activeModal === 'attendance'} onClose={() => setActiveModal(null)} schoolId={data.school_db_id || ''} teacherId={data.user_id || ''} />
       <LeaveRequestModal isOpen={activeModal === 'leave'} onClose={() => setActiveModal(null)} userId={data.user_id || ''} schoolId={data.school_db_id || ''} />
       <TeacherHistoryModal isOpen={activeModal === 'history'} onClose={() => setActiveModal(null)} credentials={credentials} />
       
       {/* UNIFIED HOMEWORK PORTAL MODAL */}
       <Modal isOpen={activeModal === 'homework'} onClose={() => setActiveModal(null)} title="TODAY'S PORTAL">
           {portalView === 'grid' ? (
                <div className="space-y-4 premium-subview-enter">
                    <div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-500/10 p-4 rounded-[2rem] border border-brand-100 dark:border-brand-500/20">
                        <div className="w-12 h-12 bg-white dark:bg-dark-900 rounded-xl flex items-center justify-center text-brand-600 shadow-sm shrink-0"><Sparkles size={24} /></div>
                        <div className="text-left"><h4 className="font-black text-slate-800 dark:text-white uppercase text-sm leading-tight">Quick Submission</h4><p className="text-[9px] font-black text-slate-400 dark:text-brand-500/60 uppercase tracking-widest">Update {data?.total_periods || 8} sessions</p></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pb-4">
                        {getPeriodsArray().map((num) => { 
                            const pData = data?.periods?.find(p => p.period_number === num); 
                            const isSubmitted = pData?.status === 'submitted'; 
                            return (
                                <div key={num} onClick={(e) => { e.stopPropagation(); setSelectedPeriod(num); setPortalView('edit'); }} className={`glass-card p-3 rounded-[1.5rem] transition-all h-32 flex flex-col justify-between cursor-pointer active:scale-95 ${isSubmitted ? 'border-brand-500/30 bg-brand-50 dark:bg-brand-500/5 shadow-inner' : ''}`}>
                                    <div className="flex justify-between items-start text-left"><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">P {num}</span>{isSubmitted && <div className="text-brand-500"><CheckCircle2 size={14} /></div>}</div>
                                    <div className="min-w-0 text-left"><p className="text-xs font-black truncate uppercase text-slate-800 dark:text-white leading-tight">{pData?.subject || 'Waiting'}</p><p className="text-[8px] font-bold text-slate-400 uppercase truncate">{pData?.class_name || 'Empty'}</p></div>
                                    <button className={`w-full py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${isSubmitted ? 'bg-brand-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{isSubmitted ? 'EDIT' : 'SET'}</button>
                                </div>
                            ); 
                        })}
                    </div>
                    
                    <button onClick={() => setActiveModal(null)} className="w-full py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 dark:border-white/5">Close Portal</button>
                </div>
           ) : (
                /* INLINE PERIOD EDITOR (SUB-VIEW) */
                <PeriodModal 
                    onBack={() => { setPortalView('grid'); setSelectedPeriod(null); }}
                    periodNumber={selectedPeriod || 1} 
                    onSubmit={handlePeriodSubmit} 
                    initialData={data?.periods?.find(p => p.period_number === selectedPeriod)} 
                    schoolDbId={data?.school_db_id}
                    teacherId={data?.user_id} 
                />
           )}
       </Modal>
       
       {/* Extra Shared Modals */}
       <GalleryModal isOpen={activeModal === 'gallery'} onClose={() => setActiveModal(null)} schoolId={data.school_db_id || ''} userId={data.user_id || ''} canUpload={true} />
       <ExamModal isOpen={activeModal === 'exam_mgmt'} onClose={() => setActiveModal(null)} role='teacher' schoolId={data.school_db_id || ''} userId={data.user_id || ''} assignedSubject={data.assigned_subject} />
       <ReportModal isOpen={activeModal === 'reports'} onClose={() => setActiveModal(null)} role='teacher' schoolId={data.school_db_id} userId={data.user_id} />
    </div>
  );
};
