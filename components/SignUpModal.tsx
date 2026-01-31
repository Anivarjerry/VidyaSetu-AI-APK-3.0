
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { School, CheckCircle2, User, ChevronRight, Smartphone, Key, Lock, ArrowLeft, Loader2, MessageCircle, HelpCircle } from 'lucide-react';
import { fetchSchoolsList } from '../services/dashboardService';
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
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
      name: '',
      mobile: '',
      password: '',
      subject: '', // For teacher
      address: '', // For parent
      class_name: '', // For student/parent
      student_name: '', // For student father name / parent child name
      child_dob: '',
      mother_name: '',
      father_mobile: '' // To link student to parent
  });

  useEffect(() => {
      if (isOpen) {
          loadSchools();
          setStep('school');
          setFormData({ name: '', mobile: '', password: '', subject: '', address: '', class_name: '', student_name: '', child_dob: '', mother_name: '', father_mobile: '' });
      }
  }, [isOpen]);

  const loadSchools = async () => {
      setLoading(true);
      const data = await fetchSchoolsList();
      setSchools(data);
      setLoading(false);
  };

  const handleSchoolVerify = () => {
      if (!selectedSchool) { alert("Please select a school."); return; }
      if (schoolCodeInput.trim().toUpperCase() !== selectedSchool.school_code) {
          alert("Incorrect School Code. Please ask your school admin.");
          return;
      }
      setStep('role');
  };

  const handleRoleSelect = (r: string) => {
      setRole(r);
      setStep('form');
  };

  const handleManualHelp = () => {
      // Pre-fill message for WhatsApp
      const text = `*New Registration Request*%0A%0AHello Admin, I am facing issues signing up.%0A%0A*Name:* ${formData.name || 'N/A'}%0A*Mobile:* ${formData.mobile || 'N/A'}%0A*Role:* ${role.toUpperCase() || 'N/A'}%0A*School:* ${selectedSchool?.name || 'N/A'}%0A%0APlease register me manually.`;
      
      // Open WhatsApp with Support Number
      window.open(`https://wa.me/918005833036?text=${text}`, '_blank');
  };

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!/^\d{10}$/.test(formData.mobile)) { alert("Enter valid 10-digit mobile."); return; }
      
      setLoading(true);
      try {
          // 1. Check if user already exists
          const { data: existing } = await supabase.from('users').select('id').eq('mobile', formData.mobile).maybeSingle();
          if (existing) {
              alert("User already exists with this mobile number.");
              setLoading(false);
              return;
          }

          // 2. Insert User with 7 Days Trial
          const subscriptionEnd = new Date();
          subscriptionEnd.setDate(subscriptionEnd.getDate() + 7);
          
          const userPayload: any = {
              school_id: selectedSchool.id,
              name: formData.name,
              mobile: formData.mobile,
              password: formData.password,
              role: role,
              subscription_end_date: subscriptionEnd.toISOString().split('T')[0]
          };

          if (role === 'teacher') userPayload.assigned_subject = formData.subject;
          if (role === 'parent') userPayload.address = formData.address;

          const { data: newUser, error } = await supabase.from('users').insert([userPayload]).select().single();
          
          if (error) throw error;

          // 3. Handle Extra Tables (Students)
          if (role === 'parent') {
              await supabase.from('students').insert([{
                  school_id: selectedSchool.id,
                  name: formData.student_name,
                  class_name: formData.class_name,
                  parent_user_id: newUser.id,
                  dob: formData.child_dob,
                  mother_name: formData.mother_name
              }]);
          } else if (role === 'student') {
              // Try to find parent by father's mobile
              let parentId = null;
              if (formData.father_mobile) {
                  const { data: p } = await supabase.from('users').select('id').eq('mobile', formData.father_mobile).eq('role', 'parent').maybeSingle();
                  parentId = p?.id;
              }
              
              await supabase.from('students').insert([{
                  school_id: selectedSchool.id,
                  name: formData.name,
                  class_name: formData.class_name,
                  student_user_id: newUser.id,
                  father_name: formData.student_name,
                  parent_user_id: parentId
              }]);
          }

          setSignupSuccess(true);
          setStep('success');

      } catch (err: any) {
          alert("Signup Failed: " + (err.message || "Unknown error"));
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
                    <select 
                        value={selectedSchool?.id || ''} 
                        onChange={e => setSelectedSchool(schools.find(s => s.id === e.target.value))} 
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs uppercase outline-none text-slate-800 dark:text-white"
                    >
                        <option value="">Select School Name</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Enter School Code" 
                            value={schoolCodeInput} 
                            onChange={e => setSchoolCodeInput(e.target.value)} 
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs uppercase outline-none text-slate-800 dark:text-white"
                        />
                    </div>
                </div>

                <Button onClick={handleSchoolVerify} fullWidth disabled={!selectedSchool || !schoolCodeInput} className="py-4 rounded-2xl font-black uppercase text-xs">Verify & Next</Button>
            </div>
        )}

        {step === 'role' && (
            <div className="space-y-4 premium-subview-enter">
                <button onClick={() => setStep('school')} className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase"><ArrowLeft size={12} /> Back</button>
                <div className="text-center mb-2">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase text-lg">Select Your Role</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">For {selectedSchool?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['teacher', 'parent', 'student', 'driver'].map(r => (
                        <button key={r} onClick={() => handleRoleSelect(r)} className="p-5 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-[2rem] shadow-sm active:scale-95 transition-all hover:border-brand-500 group">
                            <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 transition-colors">
                                <User size={20} />
                            </div>
                            <span className="font-black text-xs uppercase text-slate-700 dark:text-white">{r}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {step === 'form' && (
            <form onSubmit={handleSignup} className="flex flex-col h-full premium-subview-enter">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-4 space-y-3">
                    <button type="button" onClick={() => setStep('role')} className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase mb-2"><ArrowLeft size={12} /> Change Role</button>
                    
                    <div className="bg-brand-50/50 dark:bg-brand-500/5 p-4 rounded-2xl border border-brand-100 dark:border-brand-500/10 mb-4">
                        <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Registering as {role.toUpperCase()}</p>
                    </div>

                    <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                    <input type="text" placeholder="Mobile Number (10 Digits)" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                    <input type="text" placeholder="Create Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />

                    {role === 'teacher' && (
                        <input type="text" placeholder="Teaching Subject" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" />
                    )}

                    {role === 'parent' && (
                        <>
                            <input type="text" placeholder="Address/Village" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" />
                            <p className="text-[10px] font-black uppercase text-slate-400 mt-2 pl-1">Child Details</p>
                            <input type="text" placeholder="Child Name" value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                            <input type="text" placeholder="Child Class (e.g. Class 5)" value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                        </>
                    )}

                    {role === 'student' && (
                        <>
                            <input type="text" placeholder="Class (e.g. Class 10)" value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                            <input type="text" placeholder="Father's Name" value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" required />
                            <input type="text" placeholder="Father's Mobile (For Linking)" value={formData.father_mobile} onChange={e => setFormData({...formData, father_mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-white outline-none" />
                        </>
                    )}
                </div>

                <div className="pt-2 space-y-3">
                    <Button type="submit" fullWidth disabled={loading} className="py-4 rounded-2xl font-black uppercase text-xs shadow-xl">
                        {loading ? <Loader2 className="animate-spin" /> : 'Complete Registration'}
                    </Button>
                    
                    {/* HELP BUTTON FOR MANUAL SIGNUP */}
                    <button 
                        type="button" 
                        onClick={handleManualHelp} 
                        className="w-full py-3 bg-brand-50 dark:bg-brand-500/5 text-brand-600 dark:text-brand-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 border border-brand-200 dark:border-brand-500/20 active:scale-95 transition-all"
                    >
                        <MessageCircle size={14} /> Help me Register (Send Data to Admin)
                    </button>
                </div>
            </form>
        )}

        {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 premium-subview-enter text-center p-4">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 animate-in zoom-in duration-300">
                    <CheckCircle2 size={40} strokeWidth={3} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Welcome!</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Registration Successful</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 w-full">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Trial Activated</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                        You have been granted a <span className="text-emerald-500">7-Day Free Premium Trial</span>. Explore all features now!
                    </p>
                </div>
                <Button onClick={onClose} fullWidth className="py-4 rounded-2xl font-black uppercase text-xs">Login Now</Button>
            </div>
        )}

      </div>
    </Modal>
  );
};
