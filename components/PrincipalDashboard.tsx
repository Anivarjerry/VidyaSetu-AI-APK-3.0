
import React, { useState, useEffect } from 'react';
import { DashboardData, LoginRequest, SearchPerson, FullHistory } from '../types';
import { Megaphone, MapPin, BarChart2, BookOpen, CalendarRange, UserCheck, Award, Image as ImageIcon, Download, Lock, ChevronRight, Users, ShieldCheck, Search, Filter, FileText, Loader2, User, Check, UserX, Phone, CheckCircle2, RefreshCw, Calendar, ListFilter } from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { Modal } from './Modal';
import { NoticeModal } from './NoticeModal';
import { TransportTrackerModal } from './TransportTrackerModal';
import { AnalyticsModal } from './AnalyticsModal';
import { HomeworkAnalyticsModal } from './HomeworkAnalyticsModal';
import { StaffLeaveManagementModal } from './LeaveModals';
import { AttendanceModal } from './AttendanceModal';
import { ExamModal } from './ExamModal';
import { GalleryModal } from './GalleryModal';
import { ReportModal } from './ReportModal';
import { fetchPendingApprovals, updateUserApprovalStatus } from '../services/authService';
import { fetchVisitorEntries, searchPeople, fetchRecentPeople, fetchStudentFullHistory, fetchStaffFullHistory, fetchSchoolClasses } from '../services/dashboardService';
import { generate360Report } from '../services/reportService';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { TimeTableTab } from './TimeTableTab';

interface PrincipalDashboardProps {
  data: DashboardData;
  credentials: LoginRequest;
  isSchoolActive: boolean;
  onShowPayModal: () => void;
  onRefresh: () => void;
  viewMode: 'home' | 'action' | 'manage' | 'profile'; 
}

export const PrincipalDashboard: React.FC<PrincipalDashboardProps> = ({ 
  data, 
  credentials, 
  isSchoolActive, 
  onShowPayModal,
  onRefresh,
  viewMode
}) => {
  const { t } = useThemeLanguage();
  const [stack, setStack] = useState<string[]>([]);
  
  // Specific Modal States
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  
  // Approvals & Visitors
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [visitorLogs, setVisitorLogs] = useState<any[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [visitorFilter, setVisitorFilter] = useState<'today' | 'yesterday' | 'week'>('today');
  const [selectedVisitorLog, setSelectedVisitorLog] = useState<any>(null);

  // --- ACTION TAB STATES ---
  const [searchRole, setSearchRole] = useState<'student' | 'staff'>('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPerson[]>([]);
  const [recentList, setRecentList] = useState<SearchPerson[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);

  useModalBackHandler(stack.length > 0 || isGalleryOpen || isReportOpen || isExamModalOpen || !!selectedVisitorLog || !!selectedPersonId, () => {
      if (selectedPersonId) setSelectedPersonId(null);
      else if (selectedVisitorLog) setSelectedVisitorLog(null);
      else if (isGalleryOpen) setIsGalleryOpen(false);
      else if (isReportOpen) setIsReportOpen(false);
      else if (isExamModalOpen) setIsExamModalOpen(false);
      else setStack(prev => prev.slice(0, -1));
  });

  // --- LOAD INITIAL DATA (Classes needed for Report Modal Filter) ---
  useEffect(() => {
      if (data.school_db_id) {
          loadClasses(); // Load classes immediately for filters
          if (viewMode === 'action') {
              loadRecentPeople();
          }
      }
  }, [viewMode, searchRole, filterClass, data.school_db_id]); 

  const loadClasses = async () => {
      if (!data.school_db_id) return;
      const cls = await fetchSchoolClasses(data.school_db_id);
      setSchoolClasses(cls);
  };

  const loadRecentPeople = async () => {
      setLoadingRecent(true);
      const list = await fetchRecentPeople(data.school_db_id!, searchRole, filterClass);
      setRecentList(list);
      setLoadingRecent(false);
  };

  // Search Logic
  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchTerm.length >= 2 && data.school_db_id) {
              setIsSearching(true);
              const results = await searchPeople(data.school_db_id, searchTerm, searchRole);
              setSearchResults(results);
              setIsSearching(false);
          } else {
              setSearchResults([]);
          }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchRole, data.school_db_id]);

  const handleGenerate360 = async (person: SearchPerson) => {
      if (!data.school_db_id) return;
      setLoadingHistory(true);
      setSelectedPersonId(person.id);
      
      let fullData: FullHistory | null = null;
      try {
          if (person.role === 'student') {
              fullData = await fetchStudentFullHistory(person.id);
          } else {
              fullData = await fetchStaffFullHistory(person.id);
          }

          if (fullData) {
              generate360Report(fullData, data.school_name, data.user_name, "All Time Record"); 
          } else {
              alert("Could not fetch full data. Please check if the user profile is linked correctly.");
          }
      } catch(e) {
          alert("Error generating report.");
      }
      
      setLoadingHistory(false);
      setSelectedPersonId(null);
  };

  // Loaders
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

  const handleLoadVisitorLogs = async () => {
      if (!data?.school_db_id) return;
      setLoadingVisitors(true);
      const today = new Date();
      let startDate = today.toISOString().split('T')[0];
      let endDate: string | undefined = undefined;

      if (visitorFilter === 'yesterday') {
          const y = new Date(today);
          y.setDate(today.getDate() - 1);
          startDate = y.toISOString().split('T')[0];
          endDate = startDate;
      } else if (visitorFilter === 'week') {
          const w = new Date(today);
          w.setDate(today.getDate() - 7);
          startDate = w.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
      }

      const logs = await fetchVisitorEntries(data.school_db_id, startDate, endDate);
      setVisitorLogs(logs);
      setLoadingVisitors(false);
  };

  // Effects to load data when stack changes
  React.useEffect(() => {
      if (stack.includes('approvals')) handleLoadApprovals();
      if (stack.includes('visitor_logs')) handleLoadVisitorLogs();
  }, [stack, visitorFilter]);

  const cards = [
    { key: "approvals", title: "Identity Approvals", subtitle: "Verify New Signups", icon: <Users size={24} /> },
    { key: "visitor_logs", title: t('gate_security'), subtitle: t('view_visitors'), icon: <ShieldCheck size={24} /> },
    { key: "notice", title: t('publish_notice'), subtitle: 'Global Academic Broadcast', icon: <Megaphone size={24} /> },
    { key: "transport", title: t('transport_tracking'), subtitle: 'Live Vehicle Map Engine', icon: <MapPin size={24} /> },
    { key: "teacher_analytics", title: t('teacher_report'), subtitle: 'Staff Efficiency Monitor', icon: <BarChart2 size={24} /> },
    { key: "parents_analytics", title: t('homework_status'), subtitle: 'Student Task Compliance', icon: <BookOpen size={24} /> },
    { key: "leave_management", title: t('leave_portal'), subtitle: 'Administrative Leave Hub', icon: <CalendarRange size={24} /> },
    { key: "attendance", title: t('global_attendance'), subtitle: 'Central Attendance Registry', icon: <UserCheck size={24} /> },
    { key: "exam", title: "Result Center", subtitle: "Marks & Report Cards", icon: <Award size={24} /> },
    { key: "gallery", title: "School Gallery", subtitle: "Event & Activity Photos", icon: <ImageIcon size={24} /> },
    { key: "report", title: "Download Center", subtitle: "Export PDF/Excel Data", icon: <Download size={24} /> },
  ];

  return (
    <div className="pb-10 h-full flex flex-col">
      
      {/* 1. HOME VIEW */}
      {viewMode === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 w-full animate-in fade-in zoom-in-95 duration-300">
            {cards.map((item, index) => (
              <div 
                key={index} 
                onClick={() => {
                    if (!isSchoolActive) {
                        onShowPayModal();
                        return;
                    }
                    if (item.key === 'gallery') setIsGalleryOpen(true);
                    else if (item.key === 'report') setIsReportOpen(true);
                    else if (item.key === 'exam') setIsExamModalOpen(true);
                    else setStack(prev => [...prev, item.key]);
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

      {/* 2. ACTION VIEW (SEARCH & REPORTS) */}
      {viewMode === 'action' && (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
              <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 dark:bg-dark-950/90 backdrop-blur-xl pb-4">
                  {/* ROLE SWITCHER */}
                  <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-[2rem] border border-slate-200 dark:border-white/10 mb-4 shadow-inner">
                      <button onClick={() => { setSearchRole('student'); setSearchTerm(''); }} className={`flex-1 py-3.5 rounded-[1.6rem] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${searchRole === 'student' ? 'bg-white dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-100 dark:border-white/5' : 'text-slate-400'}`}>
                          <Award size={14} /> Student Search
                      </button>
                      <button onClick={() => { setSearchRole('staff'); setSearchTerm(''); }} className={`flex-1 py-3.5 rounded-[1.6rem] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${searchRole === 'staff' ? 'bg-white dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-100 dark:border-white/5' : 'text-slate-400'}`}>
                          <UserCheck size={14} /> Staff Search
                      </button>
                  </div>

                  {/* SEARCH BAR & FILTER TOGGLE & REFRESH */}
                  <div className="flex gap-2 items-center mb-4">
                      <div className="relative flex-1">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                              type="text" 
                              placeholder={searchRole === 'student' ? "Name, Father's Name..." : "Name, Mobile Number..."}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-12 pr-10 py-4 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-[2rem] outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-bold text-slate-800 dark:text-white shadow-sm transition-all uppercase tracking-widest"
                          />
                          {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-brand-500" size={16} /></div>}
                      </div>
                      
                      <button 
                          onClick={() => setShowFilters(!showFilters)} 
                          className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center transition-all active:scale-95 ${showFilters ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 text-slate-400'}`}
                      >
                          <ListFilter size={20} />
                      </button>

                      <button 
                          onClick={() => { loadRecentPeople(); setSearchTerm(''); }} 
                          className="w-14 h-14 rounded-[1.8rem] bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-500 active:scale-95 transition-all shadow-sm"
                      >
                          <RefreshCw size={20} className={loadingRecent ? 'animate-spin' : ''} />
                      </button>
                  </div>

                  {/* FILTER PANEL */}
                  {showFilters && (
                      <div className="p-4 bg-white dark:bg-dark-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm mb-4 animate-in slide-in-from-top-2">
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-2 ml-1">Smart Filters</p>
                          <div className="flex gap-3">
                              {searchRole === 'student' && (
                                  <select 
                                      value={filterClass} 
                                      onChange={(e) => setFilterClass(e.target.value)} 
                                      className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-xs font-bold uppercase outline-none text-slate-800 dark:text-white"
                                  >
                                      <option value="">All Classes</option>
                                      {schoolClasses.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
                                  </select>
                              )}
                              <select className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-xs font-bold uppercase outline-none text-slate-400 cursor-not-allowed" disabled>
                                  <option>Session 2024-25</option>
                              </select>
                          </div>
                      </div>
                  )}
              </div>

              {/* LIST VIEW */}
              <div className="flex-1 overflow-y-auto no-scrollbar pb-20 space-y-3">
                  {/* CASE 1: SEARCHING ACTIVE */}
                  {searchTerm.length >= 2 ? (
                      searchResults.length === 0 && !isSearching ? (
                          <div className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">No matching records</div>
                      ) : (
                          searchResults.map((person) => (
                              <PersonCard key={person.id} person={person} onAction={handleGenerate360} loading={loadingHistory && selectedPersonId === person.id} />
                          ))
                      )
                  ) : (
                      /* CASE 2: DEFAULT RECENT LIST (Shows when not searching) */
                      loadingRecent ? (
                          <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-brand-500" /></div>
                      ) : recentList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-64 opacity-40 text-center space-y-4">
                              <Filter size={48} className="text-slate-300 dark:text-slate-600" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No recent records found</p>
                          </div>
                      ) : (
                          <>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-2 mb-2">Recently Added / Viewed</p>
                              {recentList.map((person) => (
                                  <PersonCard key={person.id} person={person} onAction={handleGenerate360} loading={loadingHistory && selectedPersonId === person.id} />
                              ))}
                          </>
                      )
                  )}
              </div>
          </div>
      )}

      {/* 3. MANAGE VIEW (TIME TABLE) */}
      {viewMode === 'manage' && (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
              <TimeTableTab 
                  schoolId={data.school_db_id || ''} 
                  schoolName={data.school_name} 
                  principalName={data.user_name}
                  totalPeriods={data.total_periods || 8}
              />
          </div>
      )}

      {/* MODALS */}
      <NoticeModal isOpen={stack[stack.length-1] === 'notice'} onClose={() => setStack(prev => prev.slice(0, -1))} credentials={credentials} />
      <TransportTrackerModal isOpen={stack[stack.length-1] === 'transport'} onClose={() => setStack(prev => prev.slice(0, -1))} schoolId={data.school_db_id || ''} />
      <AnalyticsModal isOpen={stack[stack.length-1] === 'teacher_analytics'} onClose={() => setStack(prev => prev.slice(0, -1))} schoolCode={credentials.school_id} />
      <HomeworkAnalyticsModal isOpen={stack[stack.length-1] === 'parents_analytics'} onClose={() => setStack(prev => prev.slice(0, -1))} schoolCode={credentials.school_id} />
      <StaffLeaveManagementModal isOpen={stack[stack.length-1] === 'leave_management'} onClose={() => setStack(prev => prev.slice(0, -1))} schoolId={data.school_db_id || ''} />
      <AttendanceModal isOpen={stack[stack.length-1] === 'attendance'} onClose={() => setStack(prev => prev.slice(0, -1))} schoolId={data.school_db_id || ''} teacherId={data.user_id || ''} />
      
      {data && (<GalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} schoolId={data.school_db_id || ''} userId={data.user_id || ''} canUpload={true} />)}
      {/* Updated ReportModal to include classOptions from schoolClasses state */}
      {data && (<ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} role='principal' schoolId={data.school_db_id} userId={data.user_id} schoolName={data.school_name} principalName={data.user_name} classOptions={schoolClasses.map(c => c.class_name)} />)}
      {data && (<ExamModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} role='principal' schoolId={data.school_db_id || ''} userId={data.user_id || ''} />)}

      {/* APPROVAL MODAL */}
      <Modal isOpen={stack.includes('approvals')} onClose={() => setStack(prev => prev.filter(k => k !== 'approvals'))} title="PENDING APPROVALS">
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

      {/* VISITOR LOGS MODAL */}
      <Modal isOpen={stack.includes('visitor_logs')} onClose={() => setStack(prev => prev.filter(k => k !== 'visitor_logs'))} title="VISITOR LOGS">
          <div className="flex flex-col h-[75vh]">
              <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl overflow-x-auto no-scrollbar">
                  <button onClick={() => setVisitorFilter('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${visitorFilter === 'today' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>Today</button>
                  <button onClick={() => setVisitorFilter('yesterday')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${visitorFilter === 'yesterday' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>Yesterday</button>
                  <button onClick={() => setVisitorFilter('week')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${visitorFilter === 'week' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>This Week</button>
              </div>
              {loadingVisitors ? <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-emerald-500" size={32} /></div> : visitorLogs.length === 0 ? <div className="flex flex-col items-center justify-center h-full opacity-40"><ShieldCheck size={48} className="text-slate-300 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">No entries found</p></div> : (
                  <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pb-4">
                      {visitorLogs.map((v) => (
                          <div key={v.id} onClick={() => setSelectedVisitorLog(v)} className="bg-white dark:bg-dark-900 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4 premium-subview-enter cursor-pointer active:scale-[0.98] transition-all hover:border-emerald-500/30">
                              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">{v.photo_data ? <img src={v.photo_data} alt="Visitor" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Users size={24} /></div>}</div>
                              <div className="flex-1 min-w-0"><div className="flex justify-between items-start"><h4 className="font-black text-slate-800 dark:text-white uppercase text-sm truncate">{v.visitor_name}</h4><div className="text-right"><span className="block text-[8px] font-black text-slate-400 uppercase">{new Date(v.entry_time).toLocaleDateString()}</span><span className="text-[10px] font-bold text-slate-500">{new Date(v.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div></div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{v.visiting_purpose} • {v.visitor_count} Person(s)</p><p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 truncate">Meeting: {v.meet_person || 'Principal'}</p></div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </Modal>

      {/* VISITOR DETAIL MODAL */}
      <Modal isOpen={!!selectedVisitorLog} onClose={() => setSelectedVisitorLog(null)} title="VISITOR DETAILS">
          {selectedVisitorLog && (
              <div className="space-y-6 premium-subview-enter pb-4">
                  <div className="w-full aspect-square bg-slate-100 dark:bg-white/5 rounded-[2.5rem] overflow-hidden border-2 border-white dark:border-white/10 shadow-xl relative">
                      {selectedVisitorLog.photo_data ? <img src={selectedVisitorLog.photo_data} alt="Full Visitor" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Users size={64} /></div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12"><h2 className="text-2xl font-black text-white uppercase leading-none">{selectedVisitorLog.visitor_name}</h2><p className="text-xs font-bold text-white/80 uppercase mt-1">{selectedVisitorLog.village || 'Location Not Provided'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20"><p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Phone size={10} /> Contact</p><p className="text-sm font-black text-slate-800 dark:text-white uppercase">{selectedVisitorLog.mobile}</p></div>
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/20"><p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={10} /> Count</p><p className="text-sm font-black text-slate-800 dark:text-white uppercase">{selectedVisitorLog.visitor_count} Person(s)</p></div>
                  </div>
                  <button onClick={() => setSelectedVisitorLog(null)} className="w-full py-4 rounded-[1.8rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-xs tracking-widest shadow-xl">Close Details</button>
              </div>
          )}
      </Modal>
    </div>
  );
};

interface PersonCardProps {
  person: SearchPerson;
  onAction: (p: SearchPerson) => void;
  loading: boolean;
}

// Reusable Person Card
const PersonCard: React.FC<PersonCardProps> = ({ person, onAction, loading }) => (
    <div className="p-5 bg-white dark:bg-dark-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg">
                {person.name.charAt(0)}
            </div>
            <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm leading-tight">{person.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{person.sub_text}</p>
                {person.father_name && <p className="text-[9px] text-slate-400">F: {person.father_name}</p>}
            </div>
        </div>
        <button 
            onClick={() => onAction(person)}
            disabled={loading}
            className="p-3 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl active:scale-90 transition-all hover:bg-brand-100 dark:hover:bg-brand-500/20"
        >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
        </button>
    </div>
);
