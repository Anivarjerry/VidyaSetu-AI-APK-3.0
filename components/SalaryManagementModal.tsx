
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { StaffSalaryConfig, StaffAdvance, StaffPayroll, SchoolUser } from '../types';
import { fetchStaffSalaryConfig, updateStaffSalaryConfig, fetchStaffAdvances, addStaffAdvance, fetchStaffPayroll, generateMonthlyPayroll, fetchSchoolUsers } from '../services/dashboardService';
import { Loader2, Wallet, Plus, Calendar, ChevronRight, ArrowLeft, Save, History, FileText, Download, AlertCircle, CheckCircle2, IndianRupee, User, Search } from 'lucide-react';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

interface SalaryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
}

export const SalaryManagementModal: React.FC<SalaryManagementModalProps> = ({ isOpen, onClose, schoolId }) => {
  const { t } = useThemeLanguage();
  const [view, setView] = useState<'menu' | 'config' | 'advances' | 'payroll'>('menu');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<SchoolUser[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<StaffSalaryConfig[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<SchoolUser | null>(null);
  
  // Payroll States
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrollData, setPayrollData] = useState<StaffPayroll[]>([]);
  const [advances, setAdvances] = useState<StaffAdvance[]>([]);

  // Form States
  const [configForm, setConfigForm] = useState({ base_salary: 0, allowed_leaves: 2, deduction_per_day: 0 });
  const [advanceForm, setAdvanceForm] = useState({ amount: 0, reason: '' });

  useModalBackHandler(view !== 'menu' && isOpen, () => {
    if (selectedStaff) setSelectedStaff(null);
    else setView('menu');
  });

  useEffect(() => {
    if (isOpen && schoolId) {
      loadStaff();
    }
  }, [isOpen, schoolId]);

  const loadStaff = async () => {
    setLoading(true);
    const users = await fetchSchoolUsers(schoolId);
    setStaffList(users.filter(u => ['teacher', 'driver', 'gatekeeper'].includes(u.role)));
    const configs = await fetchStaffSalaryConfig(schoolId);
    setSalaryConfigs(configs);
    setLoading(false);
  };

  const handleSelectStaff = (staff: SchoolUser) => {
    setSelectedStaff(staff);
    const config = salaryConfigs.find(c => c.user_id === staff.id);
    if (config) {
      setConfigForm({ base_salary: config.base_salary, allowed_leaves: config.allowed_leaves, deduction_per_day: config.deduction_per_day });
    } else {
      setConfigForm({ base_salary: 0, allowed_leaves: 2, deduction_per_day: 0 });
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedStaff) return;
    setSubmitting(true);
    const success = await updateStaffSalaryConfig({
      user_id: selectedStaff.id,
      school_id: schoolId,
      ...configForm
    });
    if (success) {
      loadStaff();
      setSelectedStaff(null);
    } else alert("Error saving configuration");
    setSubmitting(false);
  };

  const handleAddAdvance = async () => {
    if (!selectedStaff || advanceForm.amount <= 0) return;
    setSubmitting(true);
    const success = await addStaffAdvance({
      user_id: selectedStaff.id,
      school_id: schoolId,
      amount: advanceForm.amount,
      reason: advanceForm.reason,
      date: new Date().toISOString().split('T')[0]
    });
    if (success) {
      setAdvanceForm({ amount: 0, reason: '' });
      setSelectedStaff(null);
      alert("Advance payment recorded successfully.");
    } else alert("Error recording advance");
    setSubmitting(false);
  };

  const handleGeneratePayroll = async () => {
    setSubmitting(true);
    const success = await generateMonthlyPayroll(schoolId, month, year);
    if (success) {
      loadPayroll();
    } else alert("Error generating payroll. Ensure salary configs are set for all staff.");
    setSubmitting(false);
  };

  const loadPayroll = async () => {
    setLoading(true);
    const data = await fetchStaffPayroll(schoolId, month, year);
    setPayrollData(data);
    setLoading(false);
  };

  const loadAdvances = async () => {
    setLoading(true);
    const data = await fetchStaffAdvances(schoolId, month, year);
    setAdvances(data);
    setLoading(false);
  };

  useEffect(() => {
    if (view === 'payroll') loadPayroll();
    if (view === 'advances' && !selectedStaff) loadAdvances();
  }, [view, month, year]);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SALARY MANAGEMENT">
      <div className="space-y-4">
        {view === 'menu' && (
          <div className="grid grid-cols-1 gap-4 py-2 premium-subview-enter">
            <button onClick={() => setView('config')} className="p-6 rounded-[2.5rem] bg-indigo-500 text-white shadow-xl flex items-center justify-between active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><Wallet size={24} /></div>
                <div className="text-left">
                  <h4 className="font-black uppercase text-sm">Salary Setup</h4>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Set Base Salary & Leave Limits</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setView('advances')} className="p-6 rounded-[2.5rem] bg-emerald-500 text-white shadow-xl flex items-center justify-between active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><IndianRupee size={24} /></div>
                <div className="text-left">
                  <h4 className="font-black uppercase text-sm">Advances (Khatabook)</h4>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Record Mid-month Payments</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setView('payroll')} className="p-6 rounded-[2.5rem] bg-brand-600 text-white shadow-xl flex items-center justify-between active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><FileText size={24} /></div>
                <div className="text-left">
                  <h4 className="font-black uppercase text-sm">Monthly Payroll</h4>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Generate & View Salary Slips</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {view === 'config' && (
          <div className="space-y-4 premium-subview-enter">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { if(selectedStaff) setSelectedStaff(null); else setView('menu'); }} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl"><ArrowLeft size={18} /></button>
              <h3 className="font-black text-lg uppercase dark:text-white">{selectedStaff ? 'Edit Config' : 'Select Staff'}</h3>
            </div>

            {!selectedStaff ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                {staffList.map(s => {
                  const hasConfig = salaryConfigs.some(c => c.user_id === s.id);
                  return (
                    <div key={s.id} onClick={() => handleSelectStaff(s)} className="p-4 bg-white dark:bg-dark-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 font-black">{s.name.charAt(0)}</div>
                        <div>
                          <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs">{s.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.role}</p>
                        </div>
                      </div>
                      {hasConfig ? <CheckCircle2 size={18} className="text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-5 p-1">
                <div className="p-5 bg-brand-500/5 rounded-3xl border border-brand-500/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black text-xl">{selectedStaff.name.charAt(0)}</div>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white uppercase">{selectedStaff.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedStaff.role}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Base Salary (₹)</label>
                    <input type="number" value={configForm.base_salary} onChange={e => setConfigForm({...configForm, base_salary: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-brand-500/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Allowed Leaves</label>
                      <input type="number" value={configForm.allowed_leaves} onChange={e => setConfigForm({...configForm, allowed_leaves: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-brand-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Per Day Deduction (₹)</label>
                      <input type="number" value={configForm.deduction_per_day} onChange={e => setConfigForm({...configForm, deduction_per_day: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-brand-500/10" />
                    </div>
                  </div>
                </div>

                <button onClick={handleSaveConfig} disabled={submitting} className="w-full py-5 bg-brand-500 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Configuration</>}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'advances' && (
          <div className="space-y-4 premium-subview-enter">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button onClick={() => { if(selectedStaff) setSelectedStaff(null); else setView('menu'); }} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl"><ArrowLeft size={18} /></button>
                <h3 className="font-black text-lg uppercase dark:text-white">{selectedStaff ? 'Add Advance' : 'Advances History'}</h3>
              </div>
              {!selectedStaff && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                  <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none dark:text-white">
                    {months.map((m, i) => <option key={m} value={i+1}>{m.slice(0,3)}</option>)}
                  </select>
                </div>
              )}
            </div>

            {!selectedStaff ? (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                  {loading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-brand-500" /></div> : advances.length === 0 ? <div className="text-center py-10 opacity-30 font-black text-[10px] uppercase tracking-widest">No advances recorded</div> : advances.map(a => (
                    <div key={a.id} className="p-4 bg-white dark:bg-dark-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><IndianRupee size={18} /></div>
                        <div>
                          <h4 className="font-black text-slate-800 dark:text-white uppercase text-[11px]">{a.user_name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{a.reason || 'No reason'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 text-sm">₹{a.amount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{a.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setView('advances')} className="hidden" /> {/* Dummy to force re-render if needed */}
                <div className="pt-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Select staff to record new advance</p>
                  <div className="grid grid-cols-1 gap-2 max-h-[20vh] overflow-y-auto no-scrollbar">
                    {staffList.map(s => (
                      <button key={s.id} onClick={() => setSelectedStaff(s)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5 active:scale-95 transition-all">{s.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-1">
                <div className="p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl">{selectedStaff.name.charAt(0)}</div>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white uppercase">{selectedStaff.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Record Advance Payment</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                    <input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({...advanceForm, amount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason / Note</label>
                    <textarea value={advanceForm.reason} onChange={e => setAdvanceForm({...advanceForm, reason: e.target.value})} placeholder="e.g. Personal emergency, Medical..." rows={3} className="w-full p-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/10 resize-none" />
                  </div>
                </div>

                <button onClick={handleAddAdvance} disabled={submitting} className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" /> : <><Plus size={18} /> Record Payment</>}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'payroll' && (
          <div className="space-y-4 premium-subview-enter">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setView('menu')} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl"><ArrowLeft size={18} /></button>
                <h3 className="font-black text-lg uppercase dark:text-white">Monthly Payroll</h3>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-2 rounded-xl">
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none dark:text-white">
                  {months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none dark:text-white">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <button onClick={handleGeneratePayroll} disabled={submitting} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : <><RefreshCw size={14} /> Generate Payroll</>}
                </button>
                <button className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl border border-slate-200 dark:border-white/5 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Download size={14} /> Export All
                </button>
              </div>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto no-scrollbar pr-1">
                {loading ? <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-brand-500" /></div> : payrollData.length === 0 ? (
                  <div className="py-20 text-center space-y-4 opacity-40">
                    <FileText size={48} className="mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No payroll data for this month.<br/>Click 'Generate' to calculate.</p>
                  </div>
                ) : payrollData.map(p => (
                  <div key={p.id} className="p-5 bg-white dark:bg-dark-950 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-black">{p.user_name?.charAt(0)}</div>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs">{p.user_name}</h4>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase rounded-lg border border-emerald-500/20">Generated</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-50 dark:border-white/5">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Base</p>
                        <p className="text-[11px] font-black text-slate-800 dark:text-white">₹{p.base_salary}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Leaves</p>
                        <p className="text-[11px] font-black text-rose-500">-{p.deduction_amount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Advance</p>
                        <p className="text-[11px] font-black text-rose-500">-{p.advance_deduction}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Final Salary</p>
                        <p className="text-lg font-black text-emerald-600">₹{p.final_salary}</p>
                      </div>
                      <button className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 text-brand-500 active:scale-90 transition-all"><Download size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
