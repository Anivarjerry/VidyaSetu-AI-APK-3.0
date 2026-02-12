
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardData, LoginRequest, Role, PeriodData, ParentHomework, SchoolSummary, SchoolUser } from '../types';
import { fetchDashboardData, submitPeriodData, updateParentHomeworkStatus, getISTDate, updateVehicleLocation, fetchSchoolSummary, fetchSchoolUserList, fetchSchoolClasses, fetchVisitorEntries } from '../services/dashboardService';
import { fetchPendingApprovals, updateUserApprovalStatus } from '../services/authService';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SkeletonSchoolCard } from './Skeletons';
import { ProfileView } from './ProfileView';
import { SchoolInfoCard } from './SchoolInfoCard';
import { PeriodModal } from './PeriodModal';
import { AttendanceModal } from './AttendanceModal';
import { AttendanceHistoryModal } from './AttendanceHistoryModal';
import { ParentHomeworkModal } from './ParentHomeworkModal';
import { HomeworkListModal } from './HomeworkListModal';
import { SettingsModal, AboutModal, HelpModal } from './MenuModals';
import { NoticeModal } from './NoticeModal';
import { NoticeListModal } from './NoticeListModal';
import { AnalyticsModal } from './AnalyticsModal';
import { HomeworkAnalyticsModal } from './HomeworkAnalyticsModal';
import { TransportTrackerModal } from './TransportTrackerModal';
import { LeaveRequestModal, StaffLeaveManagementModal, StudentLeaveRequestModal } from './LeaveModals';
import { TeacherHistoryModal } from './TeacherHistoryModal';
import { GalleryModal } from './GalleryModal';
import { ReportModal } from './ReportModal';
import { ExamModal } from './ExamModal';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { ChevronRight, CheckCircle2, RefreshCw, UserCheck, Bell, BarChart2, BookOpen, MapPin, Truck, CalendarRange, Play, Square, Loader2, Megaphone, GraduationCap, School as SchoolIcon, Sparkles, User, Smartphone, ChevronLeft, History, Lock, AlertCircle, Zap, ShieldCheck, MoreHorizontal, X, LayoutGrid, Image as ImageIcon, FileText, Download, FileCheck, Trophy, PieChart, Users, Check, UserX, Shield, Calendar, Phone, Clock, Award } from 'lucide-react';
import { SubscriptionModal } from './SubscriptionModal';
import { Modal } from './Modal';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

interface DashboardProps {
  credentials: LoginRequest;
  role: Role;
  userName?: string;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ credentials, role, userName, onLogout }) => {
  const { t } = useThemeLanguage();
  
  const [currentView, setCurrentView] = useState<'home' | 'profile'>(() => {
    return (window.history.state?.view === 'profile') ? 'profile' : 'home';
  });

  const [principalStack, setPrincipalStack] = useState<string[]>([]);
  const [teacherStack, setTeacherStack] = useState<string[]>([]);
  const [parentStack, setParentStack] = useState<string[]>([]); 

  // --- GATE ENTRY STATE ---
  const [visitorLogs, setVisitorLogs] = useState<any[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [visitorFilter, setVisitorFilter] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getISTDate());
  const [selectedVisitorLog, setSelectedVisitorLog] = useState<any>(null); // New state for detail view

  useModalBackHandler(
      (role === 'principal' && principalStack.length > 0) || 
      (role === 'teacher' && teacherStack.length > 0) ||
      ((role === 'parent' || role === 'student') && parentStack.length > 0) ||
      !!selectedVisitorLog, 
      () => {
          if (selectedVisitorLog) setSelectedVisitorLog(null);
          else if (role === 'principal') setPrincipalStack(prev => prev.slice(0, -1));
          else if (role === 'teacher') setTeacherStack(prev => prev.slice(0, -1));
          else if (role === 'parent' || role === 'student') setParentStack(prev => prev.slice(0, -1));
      }
  );

  const [data, setData] = useState<DashboardData | null>(null);
  const [isSchoolActive, setIsSchoolActive] = useState(true);
  const [isUserActive, setIsUserActive] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showLockPopup, setShowLockPopup] = useState<string | null>(null);
  const [lockSource, setLockSource] = useState<'school' | 'user' | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [selectedHomework, setSelectedHomework] = useState<ParentHomework | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeMenuModal, setActiveMenuModal] = useState<'settings' | 'about' | 'help' | null>(null);
  const [isNoticeListOpen, setIsNoticeListOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [reportClasses, setReportClasses] = useState<string[]>([]);
  const [isTripActive, setIsTripActive] = useState(false);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<any>(null);
  const lastUpdateTimestamp = useRef<number>(0);
  const [isSchoolDetailOpen, setIsSchoolDetailOpen] = useState(false);
  const [schoolSummary, setSchoolSummary] = useState<SchoolSummary | null>(null);
  const [loadingSchoolSummary, setLoadingSchoolSummary] = useState(false);
  const [schoolSummaryRefreshing, setSchoolSummaryRefreshing] = useState(false);
  const [listCategory, setListCategory] = useState<'teachers' | 'students' | 'drivers' | null>(null);
  const [categoryUserList, setCategoryUserList] = useState<SchoolUser[]>([]);
  const [loadingUserList, setLoadingUserList] = useState(false);

  // NEW: Approval Modal States
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);

  useModalBackHandler(isSchoolDetailOpen || isGalleryOpen || isReportOpen || isExamModalOpen, () => {
    if (isSchoolDetailOpen) {
        if (listCategory) setListCategory(null);
        else setIsSchoolDetailOpen(false);
    } else if (isGalleryOpen) setIsGalleryOpen(false);
    else if (isReportOpen) setIsReportOpen(false);
    else if (isExamModalOpen) setIsExamModalOpen(false);
  });

  // ... (Existing useEffects) ...
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) setCurrentView(e.state.view);
      else setCurrentView('home');
    };
    if (!window.history.state) { try { window.history.replaceState({ view: 'home' }, '', window.location.href); } catch (e) {} }
    window.addEventListener('popstate', handlePopState);
    return () => { window.removeEventListener('popstate', handlePopState); if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); if (wakeLock.current) { try { wakeLock.current.release(); } catch(e) {} } };
  }, []);

  const handleViewChange = (view: 'home' | 'profile') => {
    if (view === currentView) return;
    setPrincipalStack([]); setTeacherStack([]); setParentStack([]);
    if (view === 'home') { if (window.history.state?.view === 'profile') window.history.back(); else setCurrentView('home'); } 
    else { try { window.history.pushState({ view: 'profile' }, '', window.location.href); } catch (e) {} setCurrentView('profile'); }
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

  useEffect(() => { fetchGenericData(selectedStudentId || undefined); }, [fetchGenericData]);

  useEffect(() => {
      if (role === 'principal' && data?.school_db_id) {
          fetchSchoolClasses(data.school_db_id).then(classes => { setReportClasses(classes.map(c => c.class_name)); });
      }
  }, [role, data?.school_db_id]);

  const handleManualRefresh = async () => {
    if (!isSchoolActive) return;
    setIsRefreshing(true);
    await fetchGenericData(selectedStudentId || undefined);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleStudentSwitch = (sId: string) => { if (sId === selectedStudentId) return; setSelectedStudentId(sId); setIsRefreshing(true); fetchGenericData(sId).then(() => setIsRefreshing(false)); };

  const handleStartTrip = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!navigator.geolocation) { alert("GPS not supported."); return; }
    navigator.geolocation.getCurrentPosition(async (initialPos) => {
        setIsTripActive(true);
        if ('wakeLock' in navigator) { try { wakeLock.current = await (navigator as any).wakeLock.request('screen'); } catch (wlErr) {} }
        if (data?.user_id) { setIsSendingLocation(true); await updateVehicleLocation(data.user_id, initialPos.coords.latitude, initialPos.coords.longitude); lastUpdateTimestamp.current = Date.now(); setTimeout(() => setIsSendingLocation(false), 2500); }
        watchId.current = navigator.geolocation.watchPosition(async (pos) => { const now = Date.now(); if (data?.user_id && (now - lastUpdateTimestamp.current >= 60000)) { setIsSendingLocation(true); const ok = await updateVehicleLocation(data.user_id, pos.coords.latitude, pos.coords.longitude); if (ok) lastUpdateTimestamp.current = now; setTimeout(() => setIsSendingLocation(false), 2500); } }, (err) => console.error("GPS error", err), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
      }, (err) => { alert("GPS Permission Denied."); }, { enableHighAccuracy: true });
  };

  const handleStopTrip = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); setIsTripActive(false); setIsSendingLocation(false); lastUpdateTimestamp.current = 0; if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; } if (wakeLock.current) { wakeLock.current.release().catch(() => {}); wakeLock.current = null; } };

  const showLockedFeature = (type: 'school' | 'parent') => { setLockSource(type === 'school' ? 'school' : 'user'); setShowLockPopup(type === 'school' ? t('school_plan_inactive_teacher') : t('parent_plan_required')); };

  const handleSchoolCardClick = async () => { if (!data?.school_db_id) return; setIsSchoolDetailOpen(true); setListCategory(null); setLoadingSchoolSummary(true); const summary = await fetchSchoolSummary(data.school_db_id); if (summary) setSchoolSummary(summary); setLoadingSchoolSummary(false); };
  const handleSyncSchoolSummary = async () => { if (!data?.school_db_id) return; setSchoolSummaryRefreshing(true); const summary = await fetchSchoolSummary(data.school_db_id); if (summary) setSchoolSummary(summary); setSchoolSummaryRefreshing(false); };
  const handleCategoryClick = async (category: 'teachers' | 'students' | 'drivers') => { if (!data?.school_db_id) return; setListCategory(category); setLoadingUserList(true); const users = await fetchSchoolUserList(data.school_db_id, category); setCategoryUserList(users); setLoadingUserList(false); };
  const handlePeriodSubmit = async (pData: PeriodData) => { if (!data) return; const success = await submitPeriodData(credentials.school_id, credentials.mobile, pData, data.user_name, 'submit'); if (success) { setTeacherStack(prev => prev.filter(k => k !== 'edit_period')); handleManualRefresh(); } else alert("Submission Failed!"); };
  const getPeriodsArray = () => { const count = data?.total_periods || 8; return Array.from({ length: count }, (_, i) => i + 1); };
  const isFeatureLocked = (role === 'parent' || role === 'student') ? (!isSchoolActive || !isUserActive) : !isSchoolActive;

  // NEW: Approval Logic
  const handleLoadApprovals = async () => {
      if (!data?.school_db_id) return;
      setIsLoadingApprovals(true);
      const list = await fetchPendingApprovals(data.school_db_id);
      setPendingApprovals(list);
      setIsLoadingApprovals(false);
  };

  const handleApproveAction = async (userId: string, action: 'approved' | 'rejected') => {
      const success = await updateUserApprovalStatus(userId, action);
      if (success) {
          alert(`User ${action} successfully.`);
          handleLoadApprovals();
      } else {
          alert("Action failed.");
      }
  };

  useEffect(() => {
      if (principalStack.includes('approvals')) handleLoadApprovals();
  }, [principalStack]);

  // VISITOR LOGS LOGIC WITH DATE FILTER
  const handleLoadVisitorLogs = async () => {
      if (!data?.school_db_id) return;
      setLoadingVisitors(true);
      
      let startDate = getISTDate();
      let endDate: string | undefined = undefined;

      const today = new Date();
      
      if (visitorFilter === 'yesterday') {
          const y = new Date(today);
          y.setDate(today.getDate() - 1);
          startDate = y.toISOString().split('T')[0];
          endDate = startDate; // Single day
      } else if (visitorFilter === 'week') {
          const w = new Date(today);
          w.setDate(today.getDate() - 7);
          startDate = w.toISOString().split('T')[0];
          endDate = getISTDate();
      } else if (visitorFilter === 'custom') {
          startDate = customDate;
          endDate = customDate;
      }

      const logs = await fetchVisitorEntries(data.school_db_id, startDate, endDate);
      setVisitorLogs(logs);
      setLoadingVisitors(false);
  };

  useEffect(() => {
      if (principalStack.includes('visitor_logs')) handleLoadVisitorLogs();
  }, [principalStack, visitorFilter, customDate]);

  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#F8FAFC] dark:bg-dark-950 flex flex-col overflow-hidden transition-colors">
      <Header onRefresh={handleManualRefresh} onOpenSettings={() => setActiveMenuModal('settings')} onOpenAbout={() => setActiveMenuModal('about')} onOpenHelp={() => setActiveMenuModal('help')} onOpenNotices={() => setIsNoticeListOpen(true)} onLogout={onLogout} currentView={currentView} onChangeView={handleViewChange} />

      <main className="flex-1 w-full flex flex-col overflow-hidden relative" style={{ marginTop: 'calc(5.5rem + env(safe-area-inset-top, 0px))', marginBottom: window.innerWidth < 768 ? 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' : '0' }}>
        {currentView === 'home' ? (
            <>
                <div className="w-full px-4 pt-3 pb-0.5 z-[40] flex-shrink-0">
                    <div className="max-w-4xl md:max-w-7xl mx-auto w-full">
                        {initialLoading && !data ? <SkeletonSchoolCard /> : <SchoolInfoCard schoolName={data?.school_name || ''} schoolCode={data?.school_code || ''} onClick={handleSchoolCardClick} />}
                        <div className="flex items-center justify-between mt-1 mb-2.5 px-1.5"><h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{role === 'parent' || role === 'student' ? t('student_hub') : role === 'teacher' ? t('todays_schedule') : role === 'driver' ? t('bus_route_tracker') : t('principal_portal')}</h3><div className="flex items-center gap-2">{(role === 'parent' && data?.siblings && data.siblings.length > 1) && (<div className="flex gap-1.5">{data.siblings.map(sib => (<button key={sib.id} onClick={() => handleStudentSwitch(sib.id)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedStudentId === sib.id ? 'bg-brand-500 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'}`}>{sib.name.split(' ')[0]}</button>))}</div>)}<button onClick={handleManualRefresh} disabled={isRefreshing || !isSchoolActive} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black transition-all border ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-500 border-rose-100 dark:border-rose-800' : 'bg-brand-500/10 dark:bg-slate-800/40 text-brand-500 border-brand-500/10 active:scale-90 shadow-sm'}`}><RefreshCw size={10} className={isRefreshing ? "animate-spin" : ""} />{isSchoolActive ? t('sync') : 'LOCKED'}</button></div></div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full px-4 pb-4 no-scrollbar">
                    <div className="max-w-4xl md:max-w-7xl mx-auto w-full">
                         <div className={`space-y-3 md:space-y-0 w-full transition-opacity duration-300 pb-10 ${isRefreshing ? 'opacity-40' : 'opacity-100'}`}>
                            {/* ... (All other cards remain same) ... */}
                            {/* PRINCIPAL HUB */}
                            {role === 'principal' && (
                              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 w-full">
                                {[
                                    { key: "approvals", title: "Identity Approvals", subtitle: "Verify New Signups", icon: <Users size={24} /> },
                                    { key: "visitor_logs", title: t('gate_security'), subtitle: t('view_visitors'), icon: <ShieldCheck size={24} /> },
                                    { key: "notice", title: t('publish_notice'), subtitle: 'Global Academic Broadcast', icon: <Megaphone size={24} /> },
                                    { key: "transport", title: t('transport_tracking'), subtitle: 'Live Vehicle Map Engine', icon: <MapPin size={24} /> },
                                    { key: "teacher_analytics", title: t('teacher_report'), subtitle: 'Staff Efficiency Monitor', icon: <BarChart2 size={24} /> },
                                    { key: "parents_analytics", title: t('homework_status'), subtitle: 'Student Task Compliance', icon: <BookOpen size={24} /> },
                                    { key: "leave_management", title: t('leave_portal'), subtitle: 'Administrative Leave Hub', icon: <CalendarRange size={24} /> },
                                    { key: "attendance", title: t('global_attendance'), subtitle: 'Central Attendance Registry', icon: <UserCheck size={24} /> },
                                    // Added New Cards
                                    { key: "exam", title: "Result Center", subtitle: "Marks & Report Cards", icon: <Award size={24} /> },
                                    { key: "gallery", title: "School Gallery", subtitle: "Event & Activity Photos", icon: <ImageIcon size={24} /> },
                                    { key: "report", title: "Download Center", subtitle: "Export PDF/Excel Data", icon: <Download size={24} /> },
                                ].map((item, index) => (
                                  <div 
                                    key={index} 
                                    onClick={() => {
                                        if (!isSchoolActive) {
                                            setShowPayModal(true);
                                            return;
                                        }
                                        // Handle special toggles for the 3 added cards
                                        if (item.key === 'gallery') setIsGalleryOpen(true);
                                        else if (item.key === 'report') setIsReportOpen(true);
                                        else if (item.key === 'exam') setIsExamModalOpen(true);
                                        else setPrincipalStack(prev => [...prev, item.key]);
                                    }} 
                                    className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : ''}`}
                                  >
                                      <div className="flex items-center gap-4 text-left">
                                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-105 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>{item.icon}</div>
                                          <div>
                                              <h3 className={`font-black uppercase text-base leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{item.title}</h3>
                                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.subtitle}</p>
                                          </div>
                                      </div>
                                      {!isSchoolActive ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200 group-hover:text-brand-500 transition-colors" />}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* ... (Other cards) ... */}
                         </div>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 overflow-y-auto px-4 w-full no-scrollbar">
                <div className="max-w-4xl md:max-w-7xl mx-auto w-full pt-4">
                    <ProfileView data={data} isLoading={initialLoading} onLogout={onLogout} credentials={credentials} onOpenSubscription={() => { if ((role === 'parent' || role === 'student') && !isSchoolActive) setShowLockPopup(t('upgrade_school_first')); else setShowPayModal(true); }} onOpenHelp={() => setActiveMenuModal('help')} onOpenAbout={() => setActiveMenuModal('about')} />
                </div>
            </div>
        )}
      </main>

      <BottomNav currentView={currentView} onChangeView={handleViewChange} />
      
      {/* ... (Modals) ... */}
      <Modal isOpen={!!showLockPopup} onClose={() => setShowLockPopup(null)} title="ACCESS RESTRICTED"><div className="text-center py-4 space-y-6"><div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><Lock size={40} /></div><div><h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Services Blocked</h4><p className="text-xs text-slate-400 font-bold uppercase mt-3 px-4 leading-relaxed italic">"{showLockPopup}"</p></div>{((role === 'principal' && lockSource === 'school') || ((role === 'parent' || role === 'student') && lockSource === 'user')) ? (<button onClick={() => { setShowLockPopup(null); setShowPayModal(true); }} className="w-full py-5 rounded-[2rem] bg-emerald-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">{lockSource === 'school' ? 'RENEW SCHOOL PLAN' : 'UNLOCK PREMIUM NOW'} <ChevronRight size={14} /></button>) : (<button onClick={() => setShowLockPopup(null)} className="w-full py-5 rounded-[2rem] bg-slate-900 dark:bg-white/10 text-white font-black uppercase text-xs tracking-widest shadow-xl">Got it</button>)}</div></Modal>
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="PREMIUM UPGRADE"><SubscriptionModal role={role} /></Modal>
      <SettingsModal isOpen={activeMenuModal === 'settings'} onClose={() => setActiveMenuModal(null)} />
      <AboutModal isOpen={activeMenuModal === 'about'} onClose={() => setActiveMenuModal(null)} />
      <HelpModal isOpen={activeMenuModal === 'help'} onClose={() => setActiveMenuModal(null)} />
      <NoticeListModal isOpen={isNoticeListOpen} onClose={() => setIsNoticeListOpen(false)} schoolId={credentials.school_id} role={role} />
      {data && (<GalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} schoolId={data.school_db_id || ''} userId={data.user_id || ''} canUpload={role === 'principal'} />)}
      {data && (<ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} role={role} schoolId={data.school_db_id} userId={data.user_id} classOptions={reportClasses} studentId={data.student_id} studentName={data.student_name} />)}
      {data && (<ExamModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} role={role} schoolId={data.school_db_id || ''} userId={data.user_id || ''} assignedSubject={data.assigned_subject} />)}
      <LeaveRequestModal isOpen={role === 'driver' && isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} userId={data?.user_id || ''} schoolId={data?.school_db_id || ''} />
      
      <Modal isOpen={isSchoolDetailOpen} onClose={() => setIsSchoolDetailOpen(false)} title="INSTITUTION PROFILE"><div className="flex flex-col h-[70vh]">{!listCategory ? (<div className="space-y-6 overflow-y-auto no-scrollbar pb-4 flex-1 relative"><button onClick={handleSyncSchoolSummary} disabled={schoolSummaryRefreshing} className={`absolute top-0 right-0 p-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 z-20 active:scale-90 transition-all ${schoolSummaryRefreshing ? 'animate-spin text-brand-500' : 'hover:text-brand-500'}`}><RefreshCw size={18} /></button><div className="p-6 rounded-[2.5rem] bg-slate-900 dark:bg-slate-800 text-white shadow-xl relative overflow-hidden mt-2"><div className="relative z-10 text-center"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20"><SchoolIcon size={32} /></div><h2 className="text-xl font-black uppercase tracking-tight leading-tight">{schoolSummary?.school_name || (loadingSchoolSummary ? 'Loading...' : 'Unknown')}</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Code: {schoolSummary?.school_code || '---'}</p></div></div><div className="p-5 rounded-[2rem] bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20"><User size={24} /></div><div><p className="text-[9px] font-black text-brand-600 uppercase tracking-widest mb-0.5">Principal</p><h4 className="text-sm font-black text-slate-800 dark:text-white uppercase">{schoolSummary?.principal_name || 'Not Assigned'}</h4></div></div><div className="grid grid-cols-2 gap-3"><div onClick={() => handleCategoryClick('teachers')} className="p-4 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm cursor-pointer active:scale-95 transition-all"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Teaching Staff</p><div className="flex items-end gap-2"><span className="text-3xl font-black text-slate-800 dark:text-white">{schoolSummary?.total_teachers || 0}</span><ChevronRight size={16} className="text-slate-300 mb-1" /></div></div><div onClick={() => handleCategoryClick('drivers')} className="p-4 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm cursor-pointer active:scale-95 transition-all"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Transport</p><div className="flex items-end gap-2"><span className="text-3xl font-black text-slate-800 dark:text-white">{schoolSummary?.total_drivers || 0}</span><ChevronRight size={16} className="text-slate-300 mb-1" /></div></div></div></div>) : (<div className="flex flex-col h-full premium-subview-enter"><button onClick={() => setListCategory(null)} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4 hover:text-brand-500 transition-colors"><ChevronLeft size={14} /> Back to Summary</button><h3 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-4 pl-1">{listCategory} Directory</h3><div className="flex-1 overflow-y-auto pr-1 space-y-3 no-scrollbar">{loadingUserList ? (<div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-brand-500" /></div>) : categoryUserList.length === 0 ? (<div className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-widest">No records found</div>) : (categoryUserList.map((user, i) => (<div key={i} className="p-4 bg-white dark:bg-white/5 rounded-[1.5rem] border border-slate-100 dark:border-white/5 flex items-center gap-3 shadow-sm"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-slate-500 dark:text-slate-300">{user.name.charAt(0)}</div><div><p className="font-black text-sm text-slate-800 dark:text-white uppercase truncate">{user.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.mobile}</p></div></div>)))}</div></div>)}</div></Modal>
      
      {/* ... (Other Stack Modals) ... */}
      <NoticeModal isOpen={principalStack[principalStack.length-1] === 'notice'} onClose={() => setPrincipalStack(prev => prev.slice(0, -1))} credentials={credentials} />
      <TransportTrackerModal isOpen={principalStack[principalStack.length-1] === 'transport'} onClose={() => setPrincipalStack(prev => prev.slice(0, -1))} schoolId={data?.school_db_id || ''} />
      <AnalyticsModal isOpen={principalStack[principalStack.length-1] === 'teacher_analytics'} onClose={() => setPrincipalStack(prev => prev.slice(0, -1))} schoolCode={credentials.school_id} />
      <HomeworkAnalyticsModal isOpen={principalStack[principalStack.length-1] === 'parents_analytics'} onClose={() => setPrincipalStack(prev => prev.slice(0, -1))} schoolCode={credentials.school_id} />
      <StaffLeaveManagementModal isOpen={principalStack[principalStack.length-1] === 'leave_management'} onClose={() => setPrincipalStack(prev => prev.slice(0, -1))} schoolId={data?.school_db_id || ''} />
      <AttendanceModal isOpen={principalStack[principalStack.length-1] === 'attendance'} onClose={() => setPrincipalStack(prev => prev.slice(0, -1))} schoolId={data?.school_db_id || ''} teacherId={data?.user_id || ''} />
      
      {/* UPDATED: VISITOR LOGS MODAL WITH CLICKABLE LIST & DETAIL VIEW */}
      <Modal isOpen={principalStack.includes('visitor_logs')} onClose={() => setPrincipalStack(prev => prev.filter(k => k !== 'visitor_logs'))} title="VISITOR LOGS">
          <div className="flex flex-col h-[75vh]">
              <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl overflow-x-auto no-scrollbar"><button onClick={() => setVisitorFilter('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${visitorFilter === 'today' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>Today</button><button onClick={() => setVisitorFilter('yesterday')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${visitorFilter === 'yesterday' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>Yesterday</button><button onClick={() => setVisitorFilter('week')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${visitorFilter === 'week' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>This Week</button><div className="relative"><input type="date" value={customDate} onChange={(e) => { setCustomDate(e.target.value); setVisitorFilter('custom'); }} className={`w-10 h-9 p-0 border-none outline-none rounded-xl bg-transparent text-transparent cursor-pointer absolute top-0 left-0 z-10 opacity-0`} /><button className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${visitorFilter === 'custom' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-dark-900 text-slate-400 border border-slate-100 dark:border-white/5'}`}><Calendar size={16} /></button></div></div>
              {loadingVisitors ? <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-emerald-500" size={32} /></div> : visitorLogs.length === 0 ? <div className="flex flex-col items-center justify-center h-full opacity-40"><ShieldCheck size={48} className="text-slate-300 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">No entries found</p></div> : (
                  <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pb-4">
                      {visitorLogs.map((v) => (
                          <div key={v.id} onClick={() => setSelectedVisitorLog(v)} className="bg-white dark:bg-dark-900 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4 premium-subview-enter cursor-pointer active:scale-[0.98] transition-all hover:border-emerald-500/30">
                              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">{v.photo_data ? <img src={v.photo_data} alt="Visitor" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={24} /></div>}</div>
                              <div className="flex-1 min-w-0"><div className="flex justify-between items-start"><h4 className="font-black text-slate-800 dark:text-white uppercase text-sm truncate">{v.visitor_name}</h4><div className="text-right"><span className="block text-[8px] font-black text-slate-400 uppercase">{new Date(v.entry_time).toLocaleDateString()}</span><span className="text-[10px] font-bold text-slate-500">{new Date(v.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div></div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{v.visiting_purpose} • {v.visitor_count} Person(s)</p><p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 truncate">Meeting: {v.meet_person || 'Principal'}</p></div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </Modal>

      {/* NEW: VISITOR DETAIL MODAL (PRINCIPAL VIEW) */}
      <Modal isOpen={!!selectedVisitorLog} onClose={() => setSelectedVisitorLog(null)} title="VISITOR DETAILS">
          {selectedVisitorLog && (
              <div className="space-y-6 premium-subview-enter pb-4">
                  <div className="w-full aspect-square bg-slate-100 dark:bg-white/5 rounded-[2.5rem] overflow-hidden border-2 border-white dark:border-white/10 shadow-xl relative">
                      {selectedVisitorLog.photo_data ? <img src={selectedVisitorLog.photo_data} alt="Full Visitor" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={64} /></div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12"><h2 className="text-2xl font-black text-white uppercase leading-none">{selectedVisitorLog.visitor_name}</h2><p className="text-xs font-bold text-white/80 uppercase mt-1">{selectedVisitorLog.village || 'Location Not Provided'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20"><p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Phone size={10} /> Contact</p><p className="text-sm font-black text-slate-800 dark:text-white uppercase">{selectedVisitorLog.mobile}</p></div>
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/20"><p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={10} /> Count</p><p className="text-sm font-black text-slate-800 dark:text-white uppercase">{selectedVisitorLog.visitor_count} Person(s)</p></div>
                  </div>
                  <div className="p-5 bg-white dark:bg-dark-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-white/5"><span className="text-[10px] font-bold text-slate-400 uppercase">Meeting With</span><span className="text-xs font-black text-brand-600 uppercase bg-brand-50 dark:bg-brand-500/10 px-3 py-1 rounded-lg">{selectedVisitorLog.meet_person}</span></div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-white/5"><span className="text-[10px] font-bold text-slate-400 uppercase">Purpose</span><span className="text-xs font-black text-slate-700 dark:text-white uppercase">{selectedVisitorLog.visiting_purpose}</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Entry Time</span><span className="text-xs font-black text-slate-700 dark:text-white uppercase flex items-center gap-1"><Clock size={12} /> {new Date(selectedVisitorLog.entry_time).toLocaleString()}</span></div>
                  </div>
                  <button onClick={() => setSelectedVisitorLog(null)} className="w-full py-4 rounded-[1.8rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-xs tracking-widest shadow-xl">Close Details</button>
              </div>
          )}
      </Modal>

      {/* APPROVAL MODAL */}
      <Modal isOpen={principalStack[principalStack.length-1] === 'approvals'} onClose={() => setPrincipalStack(prev => prev.slice(0, -1))} title="PENDING APPROVALS">
          <div className="flex flex-col h-[70vh]">
              {isLoadingApprovals ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
              ) : pendingApprovals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40">
                      <CheckCircle2 size={48} className="text-slate-400 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">All Clear</p>
                  </div>
              ) : (
                  <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pb-4">
                      {pendingApprovals.map(u => (
                          <div key={u.id} className="bg-white dark:bg-dark-900 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm premium-subview-enter">
                              <div className="flex items-center gap-4 mb-3">
                                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner">{u.name.charAt(0)}</div>
                                  <div>
                                      <h4 className="font-black text-slate-800 dark:text-white uppercase">{u.name}</h4>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role} • {u.mobile}</p>
                                  </div>
                              </div>
                              {/* Show Linked Children Info if Parent */}
                              {u.students && u.students.length > 0 && (
                                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl mb-4 border border-slate-100 dark:border-white/5">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Link Request</p>
                                      {u.students.map((s: any, idx: number) => (
                                          <p key={idx} className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.name} ({s.class_name})</p>
                                      ))}
                                  </div>
                              )}
                              <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => handleApproveAction(u.id, 'rejected')} className="py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-rose-100"><UserX size={14} /> Reject</button>
                                  <button onClick={() => handleApproveAction(u.id, 'approved')} className="py-3 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"><Check size={14} strokeWidth={3} /> Approve</button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </Modal>

      <AttendanceModal isOpen={teacherStack[teacherStack.length-1] === 'attendance'} onClose={() => setTeacherStack(prev => prev.slice(0, -1))} schoolId={data?.school_db_id || ''} teacherId={data?.user_id || ''} />
      <LeaveRequestModal isOpen={teacherStack[teacherStack.length-1] === 'leave'} onClose={() => setTeacherStack(prev => prev.slice(0, -1))} userId={data?.user_id || ''} schoolId={data?.school_db_id || ''} />
      <TeacherHistoryModal isOpen={teacherStack[teacherStack.length-1] === 'history'} onClose={() => setTeacherStack(prev => prev.slice(0, -1))} credentials={credentials} />
      <Modal isOpen={teacherStack.includes('homework')} onClose={() => setTeacherStack(prev => prev.filter(k => k !== 'homework'))} title="TODAY'S PORTAL"><div className="space-y-4 premium-subview-enter"><div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-500/10 p-5 rounded-[2.5rem] border border-brand-100 dark:border-brand-500/20"><div className="w-14 h-14 bg-white dark:bg-dark-900 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm shrink-0"><Sparkles size={28} /></div><div className="text-left"><h4 className="font-black text-slate-800 dark:text-white uppercase leading-tight">Quick Submission</h4><p className="text-[10px] font-black text-slate-400 dark:text-brand-500/60 uppercase tracking-widest">Update {data?.total_periods || 8} sessions</p></div></div><div className="grid grid-cols-2 gap-3 pb-4">{getPeriodsArray().map((num) => { const pData = data?.periods?.find(p => p.period_number === num); const isSubmitted = pData?.status === 'submitted'; return (<div key={num} onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSelectedPeriod(num); setTeacherStack(prev => [...prev, 'edit_period']); }} className={`glass-card p-4 rounded-[2rem] transition-all h-36 flex flex-col justify-between cursor-pointer active:scale-95 ${isSubmitted ? 'border-brand-500/30 bg-brand-50 dark:bg-brand-500/5 shadow-inner' : ''}`}><div className="flex justify-between items-start text-left"><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">P {num}</span>{isSubmitted && <div className="text-brand-500"><CheckCircle2 size={16} /></div>}</div><div className="min-w-0 text-left"><p className="text-sm font-black truncate uppercase text-slate-800 dark:text-white leading-tight">{pData?.subject || 'Waiting'}</p><p className="text-[9px] font-bold text-slate-400 uppercase truncate">{pData?.class_name || 'Empty'}</p></div><button className={`w-full py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest ${isSubmitted ? 'bg-brand-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{isSubmitted ? 'EDIT' : 'SET'}</button></div>); })}</div><button onClick={() => setTeacherStack(prev => prev.slice(0, -1))} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 dark:border-white/5">Close Portal</button></div></Modal>
      <PeriodModal isOpen={teacherStack[teacherStack.length-1] === 'edit_period'} onClose={() => setTeacherStack(prev => prev.slice(0, -1))} periodNumber={selectedPeriod || 1} onSubmit={handlePeriodSubmit} initialData={data?.periods?.find(p => p.period_number === selectedPeriod)} schoolDbId={data?.school_db_id} />
      {data && ( <> <AttendanceHistoryModal isOpen={parentStack[parentStack.length-1] === 'attendance_history'} onClose={() => setParentStack(prev => prev.slice(0, -1))} studentId={data.student_id || ''} studentName={data.student_name || ''} /> <StudentLeaveRequestModal isOpen={parentStack[parentStack.length-1] === 'apply_leave'} onClose={() => setParentStack(prev => prev.slice(0, -1))} parentId={role === 'student' ? (data.linked_parent_id || data.user_id || '') : (data.user_id || '')} studentId={data.student_id || ''} schoolId={data.school_db_id || ''} /> <TransportTrackerModal isOpen={parentStack[parentStack.length-1] === 'live_transport'} onClose={() => setParentStack(prev => prev.slice(0, -1))} schoolId={data.school_db_id || ''} /> <HomeworkListModal isOpen={parentStack.includes('daily_tasks')} onClose={() => setParentStack(prev => prev.filter(k => k !== 'daily_tasks' && k !== 'homework_details'))} dashboardData={data} credentials={credentials} isSubscribed={isUserActive} onLockClick={() => showLockedFeature('parent')} onViewHomework={(hw) => { setSelectedHomework(hw); setParentStack(prev => [...prev, 'homework_details']); }} onRefresh={handleManualRefresh} isRefreshing={isRefreshing} refreshTrigger={refreshTrigger} /> <ParentHomeworkModal isOpen={parentStack[parentStack.length-1] === 'homework_details'} onClose={() => setParentStack(prev => prev.slice(0, -1))} data={selectedHomework} onComplete={async () => { if(selectedHomework) await updateParentHomeworkStatus(credentials.school_id, data.class_name || '', data.section || '', data.student_id || '', credentials.mobile, selectedHomework.period, selectedHomework.subject, getISTDate()); setParentStack(prev => prev.slice(0, -1)); handleManualRefresh(); }} isSubmitting={false} /> </> )}
    </div>
  );
};
