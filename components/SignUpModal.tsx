
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { School, CheckCircle2, User, ChevronRight, Key, ArrowLeft, Loader2, MessageCircle, Plus, Trash2, GraduationCap } from 'lucide-react';
import { fetchSchoolsList, fetchPublicParents } from '../services/dashboardService';
import { supabase } from '../services/supabaseClient';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose }) => {
  useModalBackHandler(isOpen, onClose);

  const [step, setStep] = useState<'school' | 'role' | 'form' | 'success'>('school');
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [parentOptions, setParentOptions] = useState<any[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
      name: '',
      mobile: '',
      password: '', // Kept for backend compatibility, but OTP is primary
      address: '', 
      dob: '', 
      class_name: '', 
      student_name: '',
      selected_parent_id: '',
  });

  const [childrenList, setChildrenList] = useState([{ name: '', class_name: '', dob: '', mother_name: '' }]);

  useEffect(() => {
      if (isOpen) {
          loadSchools();
          setStep('school');
          setFormData({ name: '', mobile: '', password: '', address: '', dob: '', class_name: '', student_name: '', selected_parent_id: '' });
          setChildrenList([{ name: '', class_name: '', dob: '', mother_name: '' }]);
      }
  }, [isOpen]);

  useEffect(() => {
      if (step === 'form' && role === 'student' && selectedSchool?.id) {
          loadParentsForSchool(selectedSchool.id);
      }
  }, [step, role, selectedSchool]);

  const loadSchools = async () => {
      setLoading(true);
      const data = await fetchSchoolsList();
      setSchools(data);
      setLoading(false);
  };

  const loadParentsForSchool = async (schoolId: string) => {
      setLoadingParents(true);
      const data = await fetchPublicParents(schoolId);
      setParentOptions(data);
      setLoadingParents(false);
  };

  const handleSchoolVerify = () => {
      if (!selectedSchool) { alert("Please select a school."); return; }
      if (schoolCodeInput.trim().toUpperCase() !== selectedSchool.school_code) {
          alert("Incorrect School Code.");
          return;
      }
      setStep('role');
  };

  const handleRoleSelect = (r: string) => {
      setRole(r);
      setStep('form');
  };

  // Child Management
  const handleAddChild = () => setChildrenList([...childrenList, { name: '', class_name: '', dob: '', mother_name: '' }]);
  const handleRemoveChild = (index: number) => { const l = [...childrenList]; l.splice(index, 1); setChildrenList(l); };
  const updateChild = (index: number, f: string, v: string) => { const l = [...childrenList]; (l[index] as any)[f] = v; setChildrenList(l); };

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!/^\d{10}$/.test(formData.mobile)) { alert("Enter valid 10-digit mobile."); return; }
      
      setLoading(true);
      try {
          // Check existing
          const { data: existing } = await supabase.from('users').select('id').eq('mobile', formData.mobile).maybeSingle();
          if (existing) { alert("Mobile already registered."); setLoading(false); return; }

          const subscriptionEnd = new Date();
          subscriptionEnd.setDate(subscriptionEnd.getDate() + 7);
          
          const userPayload: any = {
              school_id: selectedSchool.id,
              name: formData.name,
              mobile: formData.mobile,
              password: formData.password || '123456', // Default dummy password since OTP handles login
              role: role,
              subscription_end_date: subscriptionEnd.toISOString().split('T')[0],
              approval_status: 'pending' // IMPORTANT: Set to Pending for Approval System
          };

          if (role === 'parent') {
              userPayload.address = formData.address;
              if (formData.dob) userPayload.dob = formData.dob;
          }

          const { data: newUser, error } = await supabase.from('users').insert([userPayload]).select().single();
          if (error) throw error;

          if (role === 'parent') {
              for (const child of childrenList) {
                  if (child.name && child.class_name) {
                      await supabase.from('students').insert([{
                          school_id: selectedSchool.id,
                          name: child.name,
                          class_name: child.class_name,
                          parent_user_id: newUser.id,
                          dob: child.dob,
                          mother_name: child.mother_name,
                          father_name: formData.name
                      }]);
                  }
              }
          } else if (role === 'student') {
              if (!formData.selected_parent_id) throw new Error("Parent linking required.");
              await supabase.from('students').insert([{
                  school_id: selectedSchool.id,
                  name: formData.name,
                  class_name: formData.class_name,
                  student_user_id: newUser.id,
                  parent_user_id: formData.selected_parent_id,
                  father_name: formData.student_name
              }]);
          }

          setStep('success');

      } catch (err: any) {
          alert("Error: " + (err.message || "Signup failed"));
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="NEW REGISTRATION">
      <div className="flex flex-col h-full min-h-[60vh] max-h-[85vh]">
        
        {step === 'school' && (
            <div className="space-y-6 premium-subview-enter">
                <div className="p-5 bg-brand-50 dark:bg-brand-500/10 rounded-[2rem] border border-brand-100 dark:border-brand-500/20 text-center">
                    <School size={32} className="mx-auto text-brand-600 mb-2" />
                    <h3 className="font-black text-slate-800 dark:text-white uppercase">Find Your School</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Step 1 of 3</p>
                </div>
                <div className="space-y-3">
                    <select value={selectedSchool?.id || ''} onChange={e => setSelectedSchool(schools.find(s => s.id === e.target.value))} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs uppercase outline-none text-slate-800 dark:text-white">
                        <option value="">Select School Name</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Enter School Code" value={schoolCodeInput} onChange={e => setSchoolCodeInput(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs uppercase outline-none text-slate-800 dark:text-white"/></div>
                </div>
                <Button onClick={handleSchoolVerify} fullWidth disabled={!selectedSchool || !schoolCodeInput} className="py-4 rounded-2xl font-black uppercase text-xs">Verify & Next</Button>
            </div>
        )}

        {step === 'role' && (
            <div className="space-y-4 premium-subview-enter">
                <button onClick={() => setStep('school')} className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase"><ArrowLeft size={12} /> Back</button>
                <div className="text-center mb-2">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase text-lg">Select Your Role</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public Registration</p>
                </div>
                {/* RESTRICTED TO PARENT AND STUDENT ONLY */}
                <div className="grid grid-cols-2 gap-3">
                    {['parent', 'student'].map(r => (
                        <button key={r} onClick={() => handleRoleSelect(r)} className="p-5 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-[2rem] shadow-sm active:scale-95 transition-all hover:border-brand-500 group">
                            <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 transition-colors">
                                <User size={20} />
                            </div>
                            <span className="font-black text-xs uppercase text-slate-700 dark:text-white">{r}</span>
                        </button>
                    ))}
                </div>
                <div className="bg-orange-50 dark:bg-orange-500/10 p-3 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase leading-tight">Teachers & Drivers must be registered by Admin.</p>
                </div>
            </div>
        )}

        {step === 'form' && (
            <form onSubmit={handleSignup} className="flex flex-col h-full premium-subview-enter">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-4 space-y-3">
                    <button type="button" onClick={() => setStep('role')} className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase mb-2"><ArrowLeft size={12} /> Change Role</button>
                    <div className="bg-brand-50/50 dark:bg-brand-500/5 p-4 rounded-2xl border border-brand-100 dark:border-brand-500/10 mb-4"><p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Registering as {role.toUpperCase()}</p></div>

                    <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                    <input type="text" placeholder="Mobile Number (10 Digits)" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                    
                    {role === 'parent' && (
                        <>
                            <input type="text" placeholder="Village/Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase text-slate-400 pl-1">Children Details</p><button type="button" onClick={handleAddChild} className="text-[9px] font-black text-brand-600 flex items-center gap-1 uppercase bg-brand-50 dark:bg-brand-500/10 px-2 py-1 rounded-lg"><Plus size={10} /> Add Child</button></div>
                                {childrenList.map((child, index) => (
                                    <div key={index} className="p-4 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl space-y-3 relative group">
                                        {childrenList.length > 1 && <button type="button" onClick={() => handleRemoveChild(index)} className="absolute top-2 right-2 p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>}
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="Student Name" value={child.name} onChange={e => updateChild(index, 'name', e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs outline-none" required />
                                            <input type="text" placeholder="Class (e.g. 5)" value={child.class_name} onChange={e => updateChild(index, 'class_name', e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs outline-none" required />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {role === 'student' && (
                        <div className="space-y-4 pt-2">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-white/10 space-y-3">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><GraduationCap size={16} /><p className="text-[10px] font-black uppercase tracking-widest">Link to Parent ID</p></div>
                                <select value={formData.selected_parent_id} onChange={e => setFormData({...formData, selected_parent_id: e.target.value})} className="w-full p-4 rounded-2xl bg-white dark:bg-dark-900 border border-indigo-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" disabled={loadingParents} required>
                                    <option value="">{loadingParents ? 'Loading...' : 'Select Parent Name'}</option>
                                    {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name} ({p.mobile})</option>)}
                                </select>
                            </div>
                            <input type="text" placeholder="Class (e.g. 10)" value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                            <input type="text" placeholder="Father's Name" value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                        </div>
                    )}
                </div>
                <div className="pt-2 space-y-3">
                    <Button type="submit" fullWidth disabled={loading || (role === 'student' && !formData.selected_parent_id)} className="py-4 rounded-2xl font-black uppercase text-xs shadow-xl">{loading ? <Loader2 className="animate-spin" /> : 'Register & Wait for Approval'}</Button>
                </div>
            </form>
        )}

        {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 premium-subview-enter text-center p-4">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-500/40 animate-in zoom-in duration-300"><CheckCircle2 size={40} strokeWidth={3} /></div>
                <div><h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Success!</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Registration Sent</p></div>
                <div className="bg-orange-50 dark:bg-orange-500/10 p-6 rounded-[2rem] border border-orange-100 dark:border-orange-500/20 w-full">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Approval Pending</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">Your account has been created. Please wait for the Principal to approve your request before you can login via OTP.</p>
                </div>
                <Button onClick={onClose} fullWidth className="py-4 rounded-2xl font-black uppercase text-xs">Return to Login</Button>
            </div>
        )}
      </div>
    </Modal>
  );
};
