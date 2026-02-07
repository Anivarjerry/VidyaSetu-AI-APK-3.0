
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Plus, History, Camera, User, Phone, MapPin, Users, Target, Save, X, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { fetchVisitorEntries, addVisitorEntry, getISTDate } from '../services/dashboardService';
import { VisitorEntry } from '../types';
import { Modal } from './Modal';
import { Header } from './Header';
import { SettingsModal, AboutModal, HelpModal } from './MenuModals';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';

interface GatekeeperDashboardProps {
  onLogout: () => void;
  schoolId: string;
  userId: string;
}

export const GatekeeperDashboard: React.FC<GatekeeperDashboardProps> = ({ onLogout, schoolId, userId }) => {
  const { t } = useThemeLanguage();
  const [view, setView] = useState<'home' | 'entry'>('home');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
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

  useModalBackHandler(view === 'entry', () => setView('home'));
  useModalBackHandler(!!activeMenuModal, () => setActiveMenuModal(null));

  useEffect(() => {
      loadTodaysVisitors();
  }, []);

  const loadTodaysVisitors = async () => {
      setLoading(true);
      const data = await fetchVisitorEntries(schoolId, getISTDate());
      setVisitors(data);
      setLoading(false);
  };

  const handleRefresh = () => {
      loadTodaysVisitors();
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
          setView('home');
          loadTodaysVisitors();
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
        />

        <main className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar" style={{ marginTop: 'calc(5.5rem + env(safe-area-inset-top, 0px))' }}>
            
            {/* WELCOME / STATUS CARD */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Gate Security</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Visitor Management System</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                    <ShieldCheck size={20} />
                </div>
            </div>

            {/* ACTION CARD (GLOSSY GREEN) */}
            <div 
                onClick={() => setView('entry')}
                className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-between cursor-pointer active:scale-95 transition-all relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10">
                        <Plus size={32} strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase leading-tight">New Entry</h2>
                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-90 flex items-center gap-1">
                            <Sparkles size={10} /> Log Incoming Visitor
                        </p>
                    </div>
                </div>
            </div>

            {/* HISTORY SECTION */}
            <div className="space-y-4 pb-20">
                <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-200 dark:border-white/5">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                        <History size={12} /> Today's Log
                    </h3>
                    <span className="text-[10px] font-black bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg text-slate-500 dark:text-slate-300">{visitors.length} Entries</span>
                </div>

                {loading ? (
                    <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div>
                ) : visitors.length === 0 ? (
                    <div className="text-center py-12 opacity-40">
                        <Shield size={48} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">No visitors recorded today</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visitors.map((v) => (
                            <div key={v.id} className="bg-white dark:bg-dark-900 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 shadow-inner">
                                    {v.photo_data ? (
                                        <img src={v.photo_data} alt="Visitor" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={24} /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm truncate">{v.visitor_name}</h4>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-lg">{new Date(v.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate mt-0.5">{v.visiting_purpose} • {v.visitor_count} Person(s)</p>
                                    <p className="text-[9px] font-black text-emerald-600 uppercase mt-1 truncate bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md w-fit">To Meet: {v.meet_person || 'Principal'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>

        {/* ENTRY MODAL */}
        <Modal isOpen={view === 'entry'} onClose={() => setView('home')} title="VISITOR ENTRY">
            <form onSubmit={handleSubmit} className="flex flex-col h-[75vh]">
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
                    
                    {/* PHOTO CAPTURE */}
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
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept="image/*" 
                                capture="user" // Force camera on mobile
                                onChange={handlePhotoCapture} 
                                className="hidden" 
                            />
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

        {/* MENU MODALS */}
        <SettingsModal isOpen={activeMenuModal === 'settings'} onClose={() => setActiveMenuModal(null)} />
        <AboutModal isOpen={activeMenuModal === 'about'} onClose={() => setActiveMenuModal(null)} />
        <HelpModal isOpen={activeMenuModal === 'help'} onClose={() => setActiveMenuModal(null)} />
    </div>
  );
};
