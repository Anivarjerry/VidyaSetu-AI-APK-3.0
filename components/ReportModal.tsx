
import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FileText, Download, Loader2, Users, Calendar, BookOpen, CheckCircle2 } from 'lucide-react';
import { Role } from '../types';
import { 
    downloadPrincipalAttendance, 
    downloadPortalHistory, 
    downloadLeaveReport, 
    downloadStudentDirectory,
    downloadStudentReport,
    downloadStudentAttendanceReport
} from '../services/reportService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  schoolId?: string;
  userId?: string;
  classOptions?: string[]; // For Principal to filter
  studentId?: string;      // For Parent
  studentName?: string;    // For Parent
}

export const ReportModal: React.FC<ReportModalProps> = ({ 
    isOpen, onClose, role, schoolId, userId, classOptions, studentId, studentName 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  
  // Date State
  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen || !schoolId) return null;

  const handleDownload = async (action: () => Promise<boolean>) => {
      setLoading(true);
      const success = await action();
      setLoading(false);
      if (success) {
          if (window.navigator.vibrate) window.navigator.vibrate(50);
      } else {
          alert("Failed to generate report. Please try again.");
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DOWNLOAD CENTER">
      <div className="space-y-6">
        
        <div className="flex items-center gap-3 p-4 bg-brand-50 dark:bg-brand-500/10 rounded-2xl border border-brand-100 dark:border-brand-500/20">
            <div className="w-12 h-12 bg-white dark:bg-dark-900 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
                <FileText size={24} />
            </div>
            <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">Official Reports</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PDF Format • Excel-Ready</p>
            </div>
        </div>

        {/* DATE RANGE FILTER (For all users except Student Directory) */}
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Period</p>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase">From</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase">To</label>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase"
                    />
                </div>
            </div>
        </div>

        {/* PRINCIPAL OPTIONS */}
        {role === 'principal' && (
            <div className="space-y-3 premium-subview-enter">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Class (Optional)</label>
                    <select 
                        className="w-full p-3 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-xl text-xs font-bold uppercase"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="">All Classes</option>
                        {classOptions?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleDownload(() => downloadPrincipalAttendance(schoolId, selectedClass, startDate, endDate))} disabled={loading} className="p-4 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm active:scale-95 transition-all text-left group hover:border-brand-500">
                        <Calendar className="text-blue-500 mb-2" size={20} />
                        <p className="font-black text-xs uppercase dark:text-white">Attendance</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Detailed Logs</p>
                    </button>
                    <button onClick={() => handleDownload(() => downloadStudentDirectory(schoolId, selectedClass))} disabled={loading} className="p-4 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm active:scale-95 transition-all text-left group hover:border-brand-500">
                        <Users className="text-purple-500 mb-2" size={20} />
                        <p className="font-black text-xs uppercase dark:text-white">Students</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Complete Directory</p>
                    </button>
                    <button onClick={() => handleDownload(() => downloadPortalHistory(schoolId, 'principal', userId!, startDate, endDate))} disabled={loading} className="p-4 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm active:scale-95 transition-all text-left group hover:border-brand-500">
                        <BookOpen className="text-orange-500 mb-2" size={20} />
                        <p className="font-black text-xs uppercase dark:text-white">Portal Log</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Teacher Activity</p>
                    </button>
                    <button onClick={() => handleDownload(() => downloadLeaveReport(schoolId, 'principal', userId!, startDate, endDate))} disabled={loading} className="p-4 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm active:scale-95 transition-all text-left group hover:border-brand-500">
                        <CheckCircle2 className="text-rose-500 mb-2" size={20} />
                        <p className="font-black text-xs uppercase dark:text-white">Leave Data</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Staff History</p>
                    </button>
                </div>
            </div>
        )}

        {/* TEACHER OPTIONS */}
        {role === 'teacher' && (
            <div className="space-y-3 premium-subview-enter">
                <button onClick={() => handleDownload(() => downloadPortalHistory(schoolId, 'teacher', userId!, startDate, endDate))} disabled={loading} className="w-full p-5 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><BookOpen size={20} /></div>
                    <div className="text-left">
                        <p className="font-black text-sm uppercase dark:text-white">My Submissions</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Homework & Periods</p>
                    </div>
                    {loading && <Loader2 className="ml-auto animate-spin" size={16} />}
                </button>

                <button onClick={() => handleDownload(() => downloadLeaveReport(schoolId, 'teacher', userId!, startDate, endDate))} disabled={loading} className="w-full p-5 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center"><CheckCircle2 size={20} /></div>
                    <div className="text-left">
                        <p className="font-black text-sm uppercase dark:text-white">My Leaves</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Approval History</p>
                    </div>
                    {loading && <Loader2 className="ml-auto animate-spin" size={16} />}
                </button>
                
                <p className="text-[9px] text-center text-slate-400 font-black uppercase opacity-60 pt-2">* Attendance reports are restricted to Principal access.</p>
            </div>
        )}

        {/* PARENT/STUDENT OPTIONS */}
        {(role === 'parent' || role === 'student') && (
            <div className="space-y-3 premium-subview-enter">
                {/* Full Report Button */}
                <button onClick={() => handleDownload(() => downloadStudentReport(schoolId, studentId!, studentName!, startDate, endDate))} disabled={loading} className="w-full p-6 bg-brand-500 text-white rounded-[2rem] shadow-xl shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md"><Download size={24} /></div>
                        <div className="text-left">
                            <p className="font-black text-lg uppercase leading-none">Full Report Card</p>
                            <p className="text-[10px] text-brand-100 uppercase tracking-widest mt-1">Exams, Tasks & Attendance</p>
                        </div>
                    </div>
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <FileText size={24} />}
                </button>

                {/* Attendance Only Report */}
                <button onClick={() => handleDownload(() => downloadStudentAttendanceReport(studentId!, studentName!, startDate, endDate))} disabled={loading} className="w-full p-5 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-[2rem] shadow-sm active:scale-95 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner"><Calendar size={20} /></div>
                        <div className="text-left">
                            <p className="font-black text-sm uppercase dark:text-white">Attendance Log</p>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest">Selected Period PDF</p>
                        </div>
                    </div>
                    <Download size={18} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                </button>
            </div>
        )}

        {loading && (
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 animate-pulse">Generating PDF...</p>
            </div>
        )}

      </div>
    </Modal>
  );
};
