
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { StaffPayroll } from '../types';
import { fetchStaffPayroll } from '../services/dashboardService';
import { Loader2, FileText, Download, Calendar, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';

interface SalarySlipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  schoolId: string;
}

export const SalarySlipsModal: React.FC<SalarySlipsModalProps> = ({ isOpen, onClose, userId, schoolId }) => {
  const { t } = useThemeLanguage();
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState<StaffPayroll[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isOpen && userId && schoolId) {
      loadSlips();
    }
  }, [isOpen, userId, schoolId, year]);

  const loadSlips = async () => {
    setLoading(true);
    // We fetch for all months of the selected year
    const allSlips: StaffPayroll[] = [];
    for (let m = 1; m <= 12; m++) {
      const data = await fetchStaffPayroll(schoolId, m, year);
      const userSlip = data.find(p => p.user_id === userId);
      if (userSlip) allSlips.push(userSlip);
    }
    setSlips(allSlips.sort((a, b) => b.month - a.month));
    setLoading(false);
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MY SALARY SLIPS">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-100 dark:bg-white/5 p-3 rounded-2xl mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-brand-500" />
            <span className="text-[10px] font-black uppercase tracking-widest dark:text-white">Select Year</span>
          </div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent text-xs font-black uppercase outline-none dark:text-white">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto no-scrollbar pr-1">
          {loading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-brand-500" /></div>
          ) : slips.length === 0 ? (
            <div className="py-20 text-center space-y-4 opacity-30">
              <FileText size={48} className="mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-widest">No salary slips found for {year}</p>
            </div>
          ) : slips.map(s => (
            <div key={s.id} className="p-5 bg-white dark:bg-dark-950 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">{months[s.month - 1]}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{year}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600 leading-none">₹{s.final_salary}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Net Payable</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-50 dark:border-white/5">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Base Salary</p>
                  <p className="text-xs font-black dark:text-white">₹{s.base_salary}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Deductions</p>
                  <p className="text-xs font-black text-rose-500">₹{s.deduction_amount + s.advance_deduction}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black uppercase text-slate-500">Paid via Bank/Cash</span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
                  <Download size={14} /> Slip
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
