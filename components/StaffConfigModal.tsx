
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { TeacherProfile } from '../types';
import { fetchTeacherProfiles, upsertTeacherProfile } from '../services/dashboardService';
import { Loader2, User, Star, BookOpen, Save, Check } from 'lucide-react';

interface StaffConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
}

const COMMON_SUBJECTS = ['Maths', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'History', 'Geography', 'Computer', 'Arts', 'Sports', 'Library'];

export const StaffConfigModal: React.FC<StaffConfigModalProps> = ({ isOpen, onClose, schoolId }) => {
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [tier, setTier] = useState<'Expert' | 'Senior' | 'Associate'>('Associate');
  const [primSubs, setPrimSubs] = useState<string[]>([]);
  const [secSubs, setSecSubs] = useState<string[]>([]);
  const [isFloater, setIsFloater] = useState(false);

  useEffect(() => {
    if (isOpen && schoolId) {
        loadData();
    }
  }, [isOpen, schoolId]);

  const loadData = async () => {
      setLoading(true);
      const data = await fetchTeacherProfiles(schoolId);
      setProfiles(data);
      setLoading(false);
  };

  const handleSelectTeacher = (p: TeacherProfile) => {
      setSelectedTeacher(p);
      setTier(p.teacher_tier);
      setPrimSubs(p.primary_subjects || []);
      setSecSubs(p.secondary_subjects || []);
      setIsFloater(p.is_floater);
  };

  const toggleSubject = (sub: string, type: 'primary' | 'secondary') => {
      if (type === 'primary') {
          setPrimSubs(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);
          // Remove from secondary if added to primary
          setSecSubs(prev => prev.filter(s => s !== sub));
      } else {
          setSecSubs(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);
          // Remove from primary if added to secondary
          setPrimSubs(prev => prev.filter(s => s !== sub));
      }
  };

  const handleSave = async () => {
      if (!selectedTeacher) return;
      setSaving(true);
      const updated: TeacherProfile = {
          ...selectedTeacher,
          teacher_tier: tier,
          primary_subjects: primSubs,
          secondary_subjects: secSubs,
          is_floater: isFloater
      };
      
      const success = await upsertTeacherProfile(updated);
      if (success) {
          // Update local list
          setProfiles(prev => prev.map(p => p.user_id === updated.user_id ? updated : p));
          setSelectedTeacher(null); // Go back to list
      } else {
          alert("Failed to save profile.");
      }
      setSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="STAFF CONFIGURATION">
        <div className="flex flex-col h-[70vh]">
            {!selectedTeacher ? (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 p-1">
                    {loading ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-brand-500" /></div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-20 opacity-40 font-black text-xs uppercase">No teachers found</div>
                    ) : (
                        profiles.map(p => (
                            <div key={p.user_id} onClick={() => handleSelectTeacher(p)} className="p-4 bg-white dark:bg-dark-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${p.teacher_tier === 'Expert' ? 'bg-purple-100 text-purple-600' : p.teacher_tier === 'Senior' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {p.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">{p.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.teacher_tier} • {p.primary_subjects.join(', ') || 'No Skills'}</p>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl"><User size={16} className="text-slate-400" /></div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="flex-col h-full premium-subview-enter overflow-y-auto no-scrollbar pb-4 space-y-5">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => setSelectedTeacher(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-brand-500">Back</button>
                        <h3 className="font-black text-lg uppercase text-slate-800 dark:text-white">{selectedTeacher.name}</h3>
                    </div>

                    {/* Tier Selection */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Star size={10} /> Professional Tier</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Expert', 'Senior', 'Associate'].map((t) => (
                                <button 
                                    key={t} 
                                    onClick={() => setTier(t as any)}
                                    className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${tier === t ? 'bg-brand-500 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Skills Selection */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><BookOpen size={10} /> Primary Skills (Main)</label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_SUBJECTS.map(sub => (
                                <button 
                                    key={sub} 
                                    onClick={() => toggleSubject(sub, 'primary')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${primSubs.includes(sub) ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-100 dark:border-white/10'}`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><BookOpen size={10} /> Secondary Skills (Backup)</label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_SUBJECTS.map(sub => (
                                <button 
                                    key={sub} 
                                    onClick={() => toggleSubject(sub, 'secondary')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${secSubs.includes(sub) ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-100 dark:border-white/10'}`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Floater Toggle */}
                    <div 
                        onClick={() => setIsFloater(!isFloater)}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${isFloater ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 text-emerald-600' : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-white/10 text-slate-400'}`}
                    >
                        <div>
                            <p className="font-black text-xs uppercase">Floater / Substitute</p>
                            <p className="text-[9px] font-bold opacity-70">Can take any free period?</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isFloater ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                            {isFloater && <Check size={12} strokeWidth={4} />}
                        </div>
                    </div>

                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <><Save size={16} /> Update Profile</>}
                    </button>
                </div>
            )}
        </div>
    </Modal>
  );
};
