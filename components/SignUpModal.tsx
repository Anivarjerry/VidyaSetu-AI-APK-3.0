
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { School, CheckCircle2, User, ChevronRight, Key, ArrowLeft, Loader2, MessageCircle, Plus, Trash2, GraduationCap, Calendar, Lock, BookOpen } from 'lucide-react';
import { fetchSchoolsList, fetchPublicParents, fetchStudentOptionsForParent } from '../services/dashboardService';
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
  
  // Student Specific State
  const [parentOptions, setParentOptions] = useState<any[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form Data - Generalized
  const [formData, setFormData] = useState({
      name: '',
      mobile: '',
      password: '', 
      address: '', 
      parent_dob: '', // Parent DOB
      
      // Student Specific
      selected_parent_id: '',
      selected_student_id: '', // The exact student record ID to link
  });

  // Parent Child List
  const [childrenList, setChildrenList] = useState([{ name: '', class_val: '', dob: '', mother_name: '' }]);

  useEffect(() => {
      if (isOpen) {
          loadSchools();
          setStep('school');
          setFormData({ name: '', mobile: '', password: '', address: '', parent_dob: '', selected_parent_id: '', selected_student_id: '' });
          setChildrenList([{ name: '', class_val: '', dob: '', mother_name: '' }]);
      }
  }, [isOpen]);

  useEffect(() => {
      if (step === 'form' && role === 'student' && selectedSchool?.id) {
          loadParentsForSchool(selectedSchool.id);
      }
  }, [step, role, selectedSchool]);

  useEffect(() => {
      if (formData.selected_parent_id) {
          loadStudentsForParent(formData.selected_parent_id);
      } else {
          setStudentOptions([]);
      }
  }, [formData.selected_parent_id]);

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

  const loadStudentsForParent = async (parentId: string) => {
      setLoadingStudents(true);
      const data = await fetchStudentOptionsForParent(parentId);
      setStudentOptions(data);
      setLoadingStudents(false);
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

  // Parent: Child Management
  const handleAddChild = () => setChildrenList([...childrenList, { name: '', class_val: '', dob: '', mother_name: '' }]);
  const handleRemoveChild = (index: number) => { const l = [...childrenList]; l.splice(index, 1); setChildrenList(l); };
  
  const updateChild = (index: number, f: string, v: string) => { 
      const l = [...childrenList]; 
      (l[index] as any)[f] = v; 
      setChildrenList(l); 
  };

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Basic Validation
      if (!/^\d{10}$/.test(formData.mobile)) { alert("Enter valid 10-digit mobile."); return; }
      if (!formData.password || formData.password.length < 4) { alert("Password must be at least 4 characters."); return; }

      setLoading(true);
      try {
          // Check existing
          const { data: existing } = await supabase.from('users').select('id').eq('mobile', formData.mobile).maybeSingle();
          if (existing) { alert("Mobile number already registered."); setLoading(false); return; }

          const subscriptionEnd = new Date();
          subscriptionEnd.setDate(subscriptionEnd.getDate() + 7);
          
          const userPayload: any = {
              school_id: selectedSchool.id,
              mobile: formData.mobile,
              password: formData.password,
              role: role,
              subscription_end_date: subscriptionEnd.toISOString().split('T')[0],
              approval_status: 'pending' // IMPORTANT: Set to Pending for Approval System
          };

          // --- PARENT LOGIC ---
          if (role === 'parent') {
              if (!formData.name) throw new Error("Name is required.");
              userPayload.name = formData.name;
              userPayload.address = formData.address;
              if (formData.parent_dob) userPayload.dob = formData.parent_dob;

              // Create Parent User
              const { data: newUser, error } = await supabase.from('users').insert([userPayload]).select().single();
              if (error) throw error;

              // Insert Children
              for (const child of childrenList) {
                  if (child.name && child.class_val) {
                      // Logic: Ensure Class is saved as "Class X"
                      const formattedClass = child.class_val.toLowerCase().startsWith('class') ? child.class_val : `Class ${child.class_val}`;
                      
                      await supabase.from('students').insert([{
                          school_id: selectedSchool.id,
                          name: child.name,
                          class_name: formattedClass,
                          parent_user_id: newUser.id,
                          dob: child.dob || null,
                          mother_name: child.mother_name || null,
                          father_name: formData.name
                      }]);
                  }
              }
          } 
          // --- STUDENT LOGIC (NEW) ---
          else if (role === 'student') {
              if (!formData.selected_parent_id || !formData.selected_student_id) throw new Error("Please select Parent and your Name.");
              
              // Get selected student details to verify name match or just use it
              const selectedStudent = studentOptions.find(s => s.id === formData.selected_student_id);
              if (!selectedStudent) throw new Error("Invalid student selection.");

              // User Name will match the student record name
              userPayload.name = selectedStudent.name;

              // Create Student User Account
              const { data: newUser, error } = await supabase.from('users').insert([userPayload]).select().single();
              if (error) throw error;

              // UPDATE existing student record to link this user account
              const { error: linkError } = await supabase
                  .from('students')
                  .update({ student_user_id: newUser.id })
                  .eq('id', formData.selected_student_id);
              
              if (linkError) throw linkError;
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
                <div className="grid grid-cols-2 gap-3">
                    {['parent', 'student'].map(r => (
                        <button key={r} onClick={() => handleRoleSelect(r)} className="p-5 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-[2rem] shadow-sm active:scale-95 transition-all hover:border-brand-500 group">
                            <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 transition-colors">
                                {r === 'parent' ? <User size={20} /> : <GraduationCap size={20} />}
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
                    <div className="bg-brand-50/50 dark:bg-brand-500/5 p-4 rounded-2xl border border-brand-100 dark:border-brand-500/10 mb-4 flex items-center justify-between">
                        <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Registering as {role.toUpperCase()}</p>
                        <p className="text-[9px] font-bold text-slate-400">{selectedSchool.name}</p>
                    </div>

                    {/* --- PARENT FORM --- */}
                    {role === 'parent' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-3">
                                <input type="text" placeholder="Parent Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="date" 
                                        value={formData.parent_dob} 
                                        onChange={e => setFormData({...formData, parent_dob: e.target.value})} 
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none uppercase" 
                                        required 
                                        placeholder="DOB"
                                    />
                                </div>
                            </div>
                            
                            <input type="text" placeholder="Village / Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                            
                            <div className="grid grid-cols-2 gap-3">
                                <input type="tel" placeholder="Mobile (10 Digits)" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                                <input type="text" placeholder="Set Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black uppercase text-slate-400 pl-1">Student Details</p>
                                    <button type="button" onClick={handleAddChild} className="text-[9px] font-black text-brand-600 flex items-center gap-1 uppercase bg-brand-50 dark:bg-brand-500/10 px-2 py-1 rounded-lg hover:bg-brand-100"><Plus size={10} /> Add Student</button>
                                </div>
                                {childrenList.map((child, index) => (
                                    <div key={index} className="p-4 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl space-y-3 relative group mb-3 shadow-sm">
                                        {childrenList.length > 1 && <button type="button" onClick={() => handleRemoveChild(index)} className="absolute top-2 right-2 p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>}
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="Student Name" value={child.name} onChange={e => updateChild(index, 'name', e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs outline-none" required />
                                            {/* Numeric Class Input Only */}
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Class</span>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="12" 
                                                    placeholder="5" 
                                                    value={child.class_val} 
                                                    onChange={e => updateChild(index, 'class_val', e.target.value)} 
                                                    className="w-full pl-12 pr-3 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs outline-none" 
                                                    required 
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="date" value={child.dob} onChange={e => updateChild(index, 'dob', e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs outline-none uppercase" required />
                                            <input type="text" placeholder="Mother's Name" value={child.mother_name} onChange={e => updateChild(index, 'mother_name', e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs outline-none" required />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- STUDENT FORM (NEW LOGIC) --- */}
                    {role === 'student' && (
                        <div className="space-y-4">
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-center">
                                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase leading-tight">Find your profile created by your parent to link your account.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Step 1: Select Parent</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                    <select 
                                        value={formData.selected_parent_id} 
                                        onChange={e => setFormData({...formData, selected_parent_id: e.target.value, selected_student_id: ''})} 
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none uppercase" 
                                        disabled={loadingParents} 
                                        required
                                    >
                                        <option value="">{loadingParents ? 'Loading Parents...' : 'Select Parent Name'}</option>
                                        {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name} ({p.mobile})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Step 2: Select Your Name</label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                    <select 
                                        value={formData.selected_student_id} 
                                        onChange={e => setFormData({...formData, selected_student_id: e.target.value})} 
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none uppercase" 
                                        disabled={!formData.selected_parent_id || loadingStudents} 
                                        required
                                    >
                                        <option value="">{loadingStudents ? 'Loading Students...' : 'Select Your Name'}</option>
                                        {studentOptions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class_name})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-white/5 my-2"></div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Step 3: Create Login</label>
                                <div className="grid grid-cols-1 gap-3">
                                    <input 
                                        type="tel" 
                                        placeholder="Your Personal Mobile (10 Digits)" 
                                        value={formData.mobile} 
                                        onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} 
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" 
                                        required 
                                    />
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Create Password" 
                                            value={formData.password} 
                                            onChange={e => setFormData({...formData, password: e.target.value})} 
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" 
                                            required 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="pt-2 space-y-3">
                    <Button type="submit" fullWidth disabled={loading || (role === 'student' && !formData.selected_student_id)} className="py-4 rounded-2xl font-black uppercase text-xs shadow-xl">
                        {loading ? <Loader2 className="animate-spin" /> : 'Register Account'}
                    </Button>
                </div>
            </form>
        )}

        {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 premium-subview-enter text-center p-4">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-500/40 animate-in zoom-in duration-300"><CheckCircle2 size={40} strokeWidth={3} /></div>
                <div><h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Success!</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Request Sent</p></div>
                <div className="bg-orange-50 dark:bg-orange-500/10 p-6 rounded-[2rem] border border-orange-100 dark:border-orange-500/20 w-full">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Approval Pending</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">Your account has been created. Please wait for the Principal to approve your request before you can login.</p>
                </div>
                <Button onClick={onClose} fullWidth className="py-4 rounded-2xl font-black uppercase text-xs">Return to Login</Button>
            </div>
        )}
      </div>
    </Modal>
  );
};
