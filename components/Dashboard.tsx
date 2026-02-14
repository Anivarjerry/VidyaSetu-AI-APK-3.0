
import React, { useState, useEffect, useCallback } from 'react';
import { DashboardData, LoginRequest, Role } from '../types';
import { fetchDashboardData, fetchSchoolSummary, fetchSchoolClasses } from '../services/dashboardService';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SkeletonSchoolCard } from './Skeletons';
import { ProfileView } from './ProfileView';
import { SchoolInfoCard } from './SchoolInfoCard';
import { SettingsModal, AboutModal, HelpModal } from './MenuModals';
import { NoticeListModal } from './NoticeListModal';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { RefreshCw, Lock, ChevronRight, School as SchoolIcon, User, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { SubscriptionModal } from './SubscriptionModal';
import { Modal } from './Modal';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { PrincipalDashboard } from './PrincipalDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { ParentDashboard } from './ParentDashboard';
import { DriverDashboard } from './DriverDashboard';
import { AIChatModal } from './AIChatModal'; 

interface DashboardProps {
  credentials: LoginRequest;
  role: Role;
  userName?: string;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ credentials, role, userName, onLogout }) => {
  const { t } = useThemeLanguage();
  
  // Expanded view type to include 'action'
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'action'>(() => {
    return (window.history.state?.view === 'profile') ? 'profile' : 'home';
  });

  const [data, setData] = useState<DashboardData | null>(null);
  const [isSchoolActive, setIsSchoolActive] = useState(true);
  const [isUserActive, setIsUserActive] = useState(true);
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [showLockPopup, setShowLockPopup] = useState<string | null>(null);
  const [lockSource, setLockSource] = useState<'school' | 'user' | null>(null);

  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Menu States
  const [activeMenuModal, setActiveMenuModal] = useState<'settings' | 'about' | 'help' | null>(null);
  const [isNoticeListOpen, setIsNoticeListOpen] = useState(false);
  const [isSchoolDetailOpen, setIsSchoolDetailOpen] = useState(false);
  
  // School Detail Logic (Kept here as it's common)
  const [schoolSummary, setSchoolSummary] = useState<any>(null);
  const [loadingSchoolSummary, setLoadingSchoolSummary] = useState(false);

  // New AI Chat State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useModalBackHandler(isSchoolDetailOpen || isNoticeListOpen || isAIChatOpen, () => {
      if (isAIChatOpen) setIsAIChatOpen(false);
      else if (isNoticeListOpen) setIsNoticeListOpen(false);
      else setIsSchoolDetailOpen(false);
  });

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) setCurrentView(e.state.view);
      else setCurrentView('home');
    };
    if (!window.history.state) {
      try { window.history.replaceState({ view: 'home' }, '', window.location.href); } catch (e) {}
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleViewChange = (view: 'home' | 'profile' | 'action') => {
    if (view === currentView) return;
    
    // History Management
    if (view === 'home') {
      if (window.history.state?.view !== 'home') window.history.back();
      else setCurrentView('home');
    } else {
      try { window.history.pushState({ view: view }, '', window.location.href); } catch (e) {}
      setCurrentView(view);
    }
  };

  const fetchGenericData = useCallback(async (targetStudent?: string) => {
     try {
        const dashboardData = await fetchDashboardData(credentials.school_id, credentials.mobile, role, credentials.password, targetStudent);
        if (dashboardData) {
            setData(dashboardData);
            setIsSchoolActive(dashboardData.school_subscription_status === 'active');
            setIsUserActive(dashboardData.subscription_status === 'active');
            if (dashboardData.student_id && !targetStudent) setSelectedStudentId(dashboardData.student_id);
            localStorage.setItem('vidyasetu_dashboard_data', JSON.stringify(dashboardData));
            setTimeout(() => setInitialLoading(false), 300);
        }
     } catch (e) {}
  }, [credentials, role]);

  useEffect(() => {
    fetchGenericData(selectedStudentId || undefined);
  }, [fetchGenericData]);

  const handleManualRefresh = async () => {
    if (!isSchoolActive && role !== 'principal') return; // Principal might refresh to check subscription
    setIsRefreshing(true);
    await fetchGenericData(selectedStudentId || undefined);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleStudentSwitch = (sId: string) => {
      if (sId === selectedStudentId) return;
      setSelectedStudentId(sId);
      setIsRefreshing(true); 
      fetchGenericData(sId).then(() => setIsRefreshing(false));
  };

  const showLockedFeature = (type: 'school' | 'parent') => {
      setLockSource(type === 'school' ? 'school' : 'user');
      setShowLockPopup(type === 'school' ? t('school_plan_inactive_teacher') : t('parent_plan_required'));
  };

  const handleSchoolCardClick = async () => {
    if (!data?.school_db_id) return;
    setIsSchoolDetailOpen(true);
    setLoadingSchoolSummary(true);
    const summary = await fetchSchoolSummary(data.school_db_id);
    if (summary) setSchoolSummary(summary);
    setLoadingSchoolSummary(false);
  };

  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#F8FAFC] dark:bg-dark-950 flex flex-col overflow-hidden transition-colors">
      <Header onRefresh={handleManualRefresh} onOpenSettings={() => setActiveMenuModal('settings')} onOpenAbout={() => setActiveMenuModal('about')} onOpenHelp={() => setActiveMenuModal('help')} onOpenNotices={() => setIsNoticeListOpen(true)} onLogout={onLogout} currentView={currentView === 'action' ? 'home' : currentView as any} onChangeView={(v) => handleViewChange(v)} />

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col overflow-hidden relative" style={{ marginTop: 'calc(5.5rem + env(safe-area-inset-top, 0px))', marginBottom: window.innerWidth < 768 ? 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' : '0' }}>
        
        {/* VIEW 1: HOME DASHBOARD */}
        {(currentView === 'home' || currentView === 'action') ? (
            <>
                {currentView === 'home' && (
                    <div className="w-full px-4 pt-3 pb-0.5 z-[40] flex-shrink-0 animate-in fade-in zoom-in-95 duration-300">
                        <div className="max-w-4xl md:max-w-7xl mx-auto w-full">
                            {initialLoading && !data ? <SkeletonSchoolCard /> : <SchoolInfoCard schoolName={data?.school_name || ''} schoolCode={data?.school_code || ''} onClick={handleSchoolCardClick} />}
                            
                            <div className="flex items-center justify-between mt-1 mb-2.5 px-1.5">
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                    {role === 'parent' || role === 'student' ? t('student_hub') : role === 'teacher' ? t('todays_schedule') : role === 'driver' ? t('bus_route_tracker') : t('principal_portal')}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {(role === 'parent' && data?.siblings && data.siblings.length > 1) && (
                                        <div className="flex gap-1.5">
                                            {data.siblings.map(sib => (
                                                <button key={sib.id} onClick={() => handleStudentSwitch(sib.id)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedStudentId === sib.id ? 'bg-brand-500 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'}`}>{sib.name.split(' ')[0]}</button>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={handleManualRefresh} disabled={isRefreshing || !isSchoolActive} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black transition-all border ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-500 border-rose-100 dark:border-rose-800' : 'bg-brand-500/10 dark:bg-slate-800/40 text-brand-500 border-brand-500/10 active:scale-90 shadow-sm'}`}><RefreshCw size={10} className={isRefreshing ? "animate-spin" : ""} />{isSchoolActive ? t('sync') : 'LOCKED'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto w-full px-4 pb-4 no-scrollbar">
                    <div className="max-w-4xl md:max-w-7xl mx-auto w-full h-full">
                         <div className={`w-full h-full transition-opacity duration-300 pb-10 ${isRefreshing ? 'opacity-40' : 'opacity-100'}`}>
                            
                            {/* DYNAMIC DASHBOARD COMPONENT BASED ON ROLE */}
                            {data && role === 'principal' && <PrincipalDashboard data={data} credentials={credentials} isSchoolActive={isSchoolActive} onShowPayModal={() => setShowPayModal(true)} onRefresh={handleManualRefresh} viewMode={currentView === 'action' ? 'action' : 'home'} />}
                            {data && role === 'teacher' && <TeacherDashboard data={data} credentials={credentials} isSchoolActive={isSchoolActive} onShowLocked={() => showLockedFeature('school')} onRefresh={handleManualRefresh} />}
                            {data && (role === 'parent' || role === 'student') && <ParentDashboard data={data} credentials={credentials} role={role} isSchoolActive={isSchoolActive} isUserActive={isUserActive} onShowLocked={showLockedFeature} onRefresh={handleManualRefresh} isRefreshing={isRefreshing} />}
                            {data && role === 'driver' && <DriverDashboard data={data} isSchoolActive={isSchoolActive} onShowLocked={() => showLockedFeature('school')} />}

                         </div>
                    </div>
                </div>
            </>
        ) : (
            // VIEW 2: PROFILE
            <div className="flex-1 overflow-y-auto px-4 w-full no-scrollbar">
                <div className="max-w-4xl md:max-w-7xl mx-auto w-full pt-4">
                    <ProfileView data={data} isLoading={initialLoading} onLogout={onLogout} credentials={credentials} onOpenSubscription={() => { if ((role === 'parent' || role === 'student') && !isSchoolActive) setShowLockPopup(t('upgrade_school_first')); else setShowPayModal(true); }} onOpenHelp={() => setActiveMenuModal('help')} onOpenAbout={() => setActiveMenuModal('about')} />
                </div>
            </div>
        )}
      </main>

      {/* Show Action Button only for Principal */}
      <BottomNav currentView={currentView} onChangeView={handleViewChange} showAction={role === 'principal'} />
      
      {/* FLOATING AI BUTTON (Only on Home/Action) */}
      {currentView !== 'profile' && isSchoolActive && (
          <button 
            onClick={() => setIsAIChatOpen(true)}
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-6 z-40 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center text-white active:scale-90 transition-all hover:scale-105 border-2 border-white/20 animate-in zoom-in duration-300"
          >
             <Sparkles size={24} className="animate-pulse" />
          </button>
      )}

      {/* --- GLOBAL MODALS --- */}
      
      {/* 1. LOCK POPUP */}
      <Modal isOpen={!!showLockPopup} onClose={() => setShowLockPopup(null)} title="ACCESS RESTRICTED">
          <div className="text-center py-4 space-y-6">
              <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><Lock size={40} /></div>
              <div><h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Services Blocked</h4><p className="text-xs text-slate-400 font-bold uppercase mt-3 px-4 leading-relaxed italic">"{showLockPopup}"</p></div>
              {((role === 'principal' && lockSource === 'school') || ((role === 'parent' || role === 'student') && lockSource === 'user')) ? (
                  <button onClick={() => { setShowLockPopup(null); setShowPayModal(true); }} className="w-full py-5 rounded-[2rem] bg-emerald-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">{lockSource === 'school' ? 'RENEW SCHOOL PLAN' : 'UNLOCK PREMIUM NOW'} <ChevronRight size={14} /></button>
              ) : (
                  <button onClick={() => setShowLockPopup(null)} className="w-full py-5 rounded-[2rem] bg-slate-900 dark:bg-white/10 text-white font-black uppercase text-xs tracking-widest shadow-xl">Got it</button>
              )}
          </div>
      </Modal>

      {/* 2. PAYMENT MODAL */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="PREMIUM UPGRADE"><SubscriptionModal role={role} /></Modal>
      
      {/* 3. SETTINGS & INFO MODALS */}
      <SettingsModal isOpen={activeMenuModal === 'settings'} onClose={() => setActiveMenuModal(null)} />
      <AboutModal isOpen={activeMenuModal === 'about'} onClose={() => setActiveMenuModal(null)} />
      <HelpModal isOpen={activeMenuModal === 'help'} onClose={() => setActiveMenuModal(null)} />
      
      {/* 4. NOTICES */}
      <NoticeListModal isOpen={isNoticeListOpen} onClose={() => setIsNoticeListOpen(false)} schoolId={credentials.school_id} role={role} />

      {/* 5. SCHOOL DETAIL MODAL */}
      <Modal isOpen={isSchoolDetailOpen} onClose={() => setIsSchoolDetailOpen(false)} title="INSTITUTION PROFILE">
        <div className="flex flex-col h-[50vh]">
             <div className="space-y-6 overflow-y-auto no-scrollbar pb-4 flex-1 relative premium-subview-enter">
                {loadingSchoolSummary ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-brand-500" /></div> : (
                    <>
                        <div className="p-6 rounded-[2.5rem] bg-slate-900 dark:bg-slate-800 text-white shadow-xl relative overflow-hidden mt-2">
                            <div className="relative z-10 text-center">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20"><SchoolIcon size={32} /></div>
                                <h2 className="text-xl font-black uppercase tracking-tight leading-tight">{schoolSummary?.school_name || data?.school_name}</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Code: {schoolSummary?.school_code || data?.school_code}</p>
                            </div>
                        </div>
                        <div className="p-5 rounded-[2rem] bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20"><User size={24} /></div>
                            <div>
                                <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest mb-0.5">Principal</p>
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase">{schoolSummary?.principal_name || 'Not Assigned'}</h4>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Teaching Staff</p><span className="text-3xl font-black text-slate-800 dark:text-white">{schoolSummary?.total_teachers || 0}</span></div>
                            <div className="p-4 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Transport</p><span className="text-3xl font-black text-slate-800 dark:text-white">{schoolSummary?.total_drivers || 0}</span></div>
                        </div>
                    </>
                )}
             </div>
        </div>
      </Modal>

      {/* 6. AI CHAT MODAL */}
      <AIChatModal isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} userName={data?.user_name || 'User'} role={role} className={data?.class_name} dashboardData={data} />

    </div>
  );
};
