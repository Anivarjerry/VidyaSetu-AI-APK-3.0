
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Plus, History, Camera, User, Phone, MapPin, Users, Target, Save, X, Loader2, ShieldCheck, Sparkles, School, CalendarRange, ChevronRight, Calendar } from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { fetchVisitorEntries, addVisitorEntry, getISTDate, fetchDashboardData } from '../services/dashboardService';
import { VisitorEntry, DashboardData } from '../types';
import { Modal } from './Modal';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SchoolInfoCard } from './SchoolInfoCard';
import { ProfileView } from './ProfileView';
import { LeaveRequestModal } from './LeaveModals';
import { SettingsModal, AboutModal, HelpModal } from './MenuModals';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';

interface GatekeeperDashboardProps {
  onLogout: () => void;
  schoolId: string;
  userId: string;
}

export const GatekeeperDashboard: React.FC<GatekeeperDashboardProps> = ({ onLogout, schoolId, userId }) => {
  const { t } = useThemeLanguage();
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'profile'>('home');
  const [modalStack, setModalStack] = useState<string[]>([]); // 'entry', 'history', 'leave'

  // Data State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // History Filter State
  const [historyFilter, setHistoryFilter] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getISTDate());

  // Menu State
  const [activeMenuModal, setActiveMenuModal] = useState<'settings' | 'about' | 'help' | null>(null);

  // Entry Form State
  const [formData, setFormData] = useState({
      visitor_name: '',
      mobile: '',
      village: '',
      visitor_count: 1,
      visiting_purpose: 'Principal/Enquiry',
      meet_person: 'Principal'
  });
  const [photoData, setPhotoData] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Back Handler
  useModalBackHandler(
      modalStack.length > 0 || !!activeMenuModal, 
      () => {
          if (activeMenuModal) setActiveMenuModal(null);
          else setModalStack(prev => prev.slice(0, -1));
      }
  );

  useEffect(() => {
      loadInitialData();
  }, []);

  // Fetch Full Dashboard Data for Profile & School Info
  const loadInitialData = async () => {
      // We need to fetch basic user info to populate the ProfileView properly.
      // Since gatekeeper login creates basic local storage, we try to fetch extended details.
      // Re-using fetchDashboardData but specific to gatekeeper context
      const storedMobile = JSON.parse(localStorage.getItem('vidyasetu_creds') || '{}').mobile;
      if (storedMobile) {
          const data = await fetchDashboardData(schoolId, storedMobile, 'gatekeeper'); 
          if(data) setDashboardData(data);
      }
      loadVisitors();
  };

  const loadVisitors = async () => {
      setLoading(true);
      
      let startDate = getISTDate();
      let endDate: string | undefined = undefined;
      const today = new Date();

      if (historyFilter === 'yesterday') {
          const y = new Date(today);
          y.setDate(today.getDate() - 1);
          startDate = y.toISOString().split('T')[0];
          endDate = startDate;
      } else if (historyFilter === 'week') {
          const w = new Date(today);
          w.setDate(today.getDate() - 7);
          startDate = w.toISOString().split('T')[0];
          endDate = getISTDate();
      } else if (historyFilter === 'custom') {
          startDate = customDate;
          endDate = customDate;
      }

      const data = await fetchVisitorEntries(schoolId, startDate, endDate);
      setVisitors(data);
      setLoading(false);
  };

  // Reload visitors when filter changes
  useEffect(() => {
      if (modalStack.includes('history')) {
          loadVisitors();
      }
  }, [historyFilter, customDate, modalStack]);

  const handleRefresh = () => {
      loadInitialData();
  };

  const handleViewChange = (view: 'home' | 'profile') => {
      if (view === currentView) return;
      setModalStack([]);
      setCurrentView(view);
  };

  // Image Compression Utility
  const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  const MAX_DIMENSION = 800; 
                  
                  if (width > height) {
                      if (width > MAX_DIMENSION) {
                          height *= MAX_DIMENSION / width;
                          width = MAX_DIMENSION;
                      }
                  } else {
                      if (height > MAX_DIMENSION) {
                          width *= MAX_DIMENSION / height;
                          height = MAX_DIMENSION;
                      }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                      resolve(dataUrl);
                  } else reject(new Error("Compression failed"));
              };
          };
      });
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const compressed = await compressImage(e.target.files[0]);
              setPhotoData(compressed);
          } catch (err) {
              alert("Failed to process photo");
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!photoData) {
          alert("Visitor photo is mandatory for security.");
          return;
      }
      setSubmitting(true);
      const payload: VisitorEntry = {
          school_id: schoolId,
          gatekeeper_id: userId,
          ...formData,
          photo_data: photoData
      };
      
      const success = await addVisitorEntry(payload);
      if (success) {
          alert("Entry Logged Successfully");
          setFormData({
              visitor_name: '',
              mobile: '',
              village: '',
              visitor_count: 1,
              visiting_purpose: 'Principal/Enquiry',
              meet_person: 'Principal'
          });
          setPhotoData('');
          setModalStack([]); // Close modal
      } else {
          alert("Failed to log entry. Please check internet or contact admin.");
      }
      setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] dark:bg-dark-950 flex flex-col h-full w-full transition-colors">
        
        {/* SHARED HEADER */}
        <Header 
            onRefresh={handleRefresh}
            onOpenSettings={() => setActiveMenuModal('settings')}
            onOpenAbout={() => setActiveMenuModal('about')}
            onOpenHelp={() => setActiveMenuModal('help')}
            onLogout={onLogout}
            currentView={currentView}
            onChangeView={handleViewChange}
        />

        <main className="flex-1 w-full flex flex-col overflow-hidden relative" style={{ marginTop: 'calc(5.5rem + env(safe-area-inset-top, 0px))', marginBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
            
            {currentView === 'home' ? (
                <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
                    <div className="max-w-4xl mx-auto w-full pt-3">
                        
                        {/* 1. School Info Card */}
                        <SchoolInfoCard schoolName={dashboardData?.school_name || 'My School'} schoolCode={dashboardData?.school_code || '---'} />

                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Gate Operations</h3>
                            <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                            </div>
                        </div>

                        <div className="space-y-4 pb-10">
                            {/* 2. Leave Portal Card */}
                            <div onClick={() => setModalStack(prev => [...prev, 'leave'])} className="glass-card p-5 rounded-[2.5rem] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm border-slate-100 dark:border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-brand-500/10 text-brand-600">
                                        <CalendarRange size={28} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-black uppercase text-base leading-tight text-slate-800 dark:text-white">Apply Leave</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Staff Request Portal</p>
                                    </div>
                                </div>
                                <ChevronRight size={22} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                            </div>

                            {/* 3. New Entry Card (Large, Highlighted) */}
                            <div 
                                onClick={() => setModalStack(prev => [...prev, 'entry'])}
                                className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-between cursor-pointer active:scale-95 transition-all relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10">
                                        <Plus size={32} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase leading-tight">New Visitor</h2>
                                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-90 flex items-center gap-1">
                                            <Sparkles size={10} /> Log Entry
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 4. History Card */}
                            <div onClick={() => setModalStack(prev => [...prev, 'history'])} className="glass-card p-5 rounded-[2.5rem] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm border-slate-100 dark:border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-slate-100 dark:bg-white/5 text-slate-500">
                                        <History size={28} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-black uppercase text-base leading-tight text-slate-800 dark:text-white">Visitor Logs</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">View Past Records</p>
                                    </div>
                                </div>
                                <ChevronRight size={22} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 w-full no-scrollbar">
                    <div className="max-w-4xl mx-auto w-full pt-4">
                        <ProfileView 
                            data={dashboardData} 
                            isLoading={!dashboardData} 
                            onLogout={onLogout} 
                            onOpenHelp={() => setActiveMenuModal('help')}
                            onOpenAbout={() => setActiveMenuModal('about')}
                        />
                    </div>
                </div>
            )}
        </main>

        <BottomNav currentView={currentView} onChangeView={handleViewChange} />

        {/* --- MODALS --- */}

        {/* 1. ENTRY MODAL */}
        <Modal isOpen={modalStack[modalStack.length-1] === 'entry'} onClose={() => setModalStack(prev => prev.slice(0, -1))} title="VISITOR ENTRY">
            <form onSubmit={handleSubmit} className="flex flex-col h-[75vh]">
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
                    <div className="flex justify-center mb-2">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-36 h-36 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative shadow-sm transition-all active:scale-95 group ${photoData ? 'border-emerald-500' : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                        >
                            {photoData ? (
                                <img src={photoData} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Camera size={32} className="text-slate-400 mb-2 group-hover:text-emerald-500 transition-colors" />
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Take Photo</span>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} accept="image/*" capture="user" onChange={handlePhotoCapture} className="hidden" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Phone size={10} /> Mobile Number</label>
                        <input type="tel" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase tracking-widest" placeholder="10-DIGIT NUMBER" required />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><User size={10} /> Visitor Name</label>
                        <input type="text" value={formData.visitor_name} onChange={e => setFormData({...formData, visitor_name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase" placeholder="FULL NAME" required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><MapPin size={10} /> Village/Area</label>
                            <input type="text" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 uppercase" placeholder="LOCATION" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Users size={10} /> Count</label>
                            <input type="number" min="1" value={formData.visitor_count} onChange={e => setFormData({...formData, visitor_count: parseInt(e.target.value) || 1})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Target size={10} /> Purpose</label>
                        <select value={formData.visiting_purpose} onChange={e => setFormData({...formData, visiting_purpose: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 uppercase">
                            <option>Admission Enquiry</option>
                            <option>Fee Payment</option>
                            <option>Meeting (Principal)</option>
                            <option>Meeting (Teacher)</option>
                            <option>Pick Up Student</option>
                            <option>Vendor/Supply</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                <div className="pt-2">
                    <button type="submit" disabled={submitting} className="w-full py-5 bg-emerald-500 text-white rounded-[1.8rem] font-black uppercase text-xs shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {submitting ? <Loader2 className="animate-spin" /> : <><Save size={16} /> Save Entry Log</>}
                    </button>
                </div>
            </form>
        </Modal>

        {/* 2. HISTORY MODAL WITH FILTERS */}
        <Modal isOpen={modalStack[modalStack.length-1] === 'history'} onClose={() => setModalStack(prev => prev.slice(0, -1))} title="VISITOR HISTORY">
            <div className="flex flex-col h-[75vh]">
                {/* Filter Bar */}
                <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl overflow-x-auto no-scrollbar">
                    <button onClick={() => setHistoryFilter('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${historyFilter === 'today' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>Today</button>
                    <button onClick={() => setHistoryFilter('yesterday')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${historyFilter === 'yesterday' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>Yesterday</button>
                    <button onClick={() => setHistoryFilter('week')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${historyFilter === 'week' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5'}`}>Last 7 Days</button>
                    
                    <div className="relative">
                        <input type="date" value={customDate} onChange={(e) => { setCustomDate(e.target.value); setHistoryFilter('custom'); }} className={`w-10 h-9 p-0 border-none outline-none rounded-xl bg-transparent text-transparent cursor-pointer absolute top-0 left-0 z-10 opacity-0`} />
                        <button className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${historyFilter === 'custom' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-dark-900 text-slate-400 border border-slate-100 dark:border-white/5'}`}><Calendar size={16} /></button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
                ) : visitors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <ShieldCheck size={48} className="text-slate-300 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No entries found</p>
                    </div>
                ) : (
                    <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pb-4">
                        {visitors.map((v) => (
                            <div key={v.id} className="bg-white dark:bg-dark-900 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4 premium-subview-enter">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                                    {v.photo_data ? <img src={v.photo_data} alt="Visitor" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={24} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm truncate">{v.visitor_name}</h4>
                                        <div className="text-right">
                                            <span className="block text-[8px] font-black text-slate-400 uppercase">{new Date(v.entry_time).toLocaleDateString()}</span>
                                            <span className="text-[10px] font-bold text-slate-500">{new Date(v.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{v.visiting_purpose} • {v.visitor_count} Person(s)</p>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 truncate">Meeting: {v.meet_person || 'Principal'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>

        {/* 3. LEAVE MODAL */}
        <LeaveRequestModal isOpen={modalStack[modalStack.length-1] === 'leave'} onClose={() => setModalStack(prev => prev.slice(0, -1))} userId={userId} schoolId={schoolId} />

        {/* MENU MODALS */}
        <SettingsModal isOpen={activeMenuModal === 'settings'} onClose={() => setActiveMenuModal(null)} />
        <AboutModal isOpen={activeMenuModal === 'about'} onClose={() => setActiveMenuModal(null)} />
        <HelpModal isOpen={activeMenuModal === 'help'} onClose={() => setActiveMenuModal(null)} />
    </div>
  );
};
