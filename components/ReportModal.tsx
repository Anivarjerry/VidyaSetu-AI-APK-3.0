
import React, { useState } from 'react';
import { Modal } from './Modal';
import { FileText, Download, Loader2, Users, Calendar, BookOpen, CheckCircle2, FileSpreadsheet, Award } from 'lucide-react';
import { Role } from '../types';
import { 
    downloadPrincipalAttendance, 
    downloadPrincipalAttendanceExcel,
    downloadPortalHistory, 
    downloadPortalHistoryExcel,
    downloadLeaveReport, 
    downloadLeaveReportExcel,
    downloadStudentDirectory,
    downloadStudentDirectoryExcel,
    downloadExamResultsExcel,
    downloadStudentReport,
    downloadStudentAttendanceReport
} from '../services/reportService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  schoolId?: string;
  userId?: string;
  schoolName?: string;
  principalName?: string;
  classOptions?: string[];
  studentId?: string;
  studentName?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ 
    isOpen, onClose, role, schoolId, userId, schoolName, principalName, classOptions, studentId, studentName 
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

  const handleDownload = async (action: () => Promise<boolean | {success: boolean, message?: string}>) => {
      setLoading(true);
      const result = await action();
      setLoading(false);
      
      const success = typeof result === 'boolean' ? result : result.success;
      const message = typeof result === 'object' && result.message ? result.message : "Failed to generate report.";

      if (success) {
          if (window.navigator.vibrate) window.navigator.vibrate(50);
      } else {
          alert(message);
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PDF & Excel Formats</p>
            </div>
        </div>

        {/* DATE RANGE FILTER */}
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Period</p>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase">From</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase">To</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase" />
                </div>
            </div>
        </div>

        {/* PRINCIPAL OPTIONS */}
        {role === 'principal' && (
            <div className="space-y-4 premium-subview-enter">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Class</label>
                    <select className="w-full p-3 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-xl text-xs font-bold uppercase" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        <option value="">All Classes</option>
                        {classOptions && classOptions.length > 0 ? (
                            classOptions.map(c => <option key={c} value={c}>{c}</option>)
                        ) : (
                            <option disabled>No Classes Found</option>
                        )}
                    </select>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {[
                        { icon: <Calendar size={20} className="text-blue-500" />, label: "Attendance Log", sub: "Daily Status Record", pdf: () => downloadPrincipalAttendance(schoolId, schoolName || 'School', principalName || 'Principal', selectedClass, startDate, endDate), xls: () => downloadPrincipalAttendanceExcel(schoolId, selectedClass, startDate, endDate) },
                        { icon: <Users size={20} className="text-purple-500" />, label: "Student Directory", sub: "Full Bio-Data & Contact", pdf: () => downloadStudentDirectory(schoolId, schoolName || 'School', principalName || 'Principal', selectedClass), xls: () => downloadStudentDirectoryExcel(schoolId, selectedClass) },
                        { icon: <BookOpen size={20} className="text-orange-500" />, label: "Portal Activity", sub: "Teacher Submissions", pdf: () => downloadPortalHistory(schoolId, schoolName || 'School', principalName || 'Principal', 'principal', userId!, startDate, endDate), xls: () => downloadPortalHistoryExcel(schoolId, 'principal', userId!, startDate, endDate) },
                        { icon: <CheckCircle2 size={20} className="text-rose-500" />, label: "Staff Leave Data", sub: "Requests & Status", pdf: () => downloadLeaveReport(schoolId, schoolName || 'School', principalName || 'Principal', 'principal', userId!, startDate, endDate), xls: () => downloadLeaveReportExcel(schoolId, 'principal', userId!, startDate, endDate) },
                        { icon: <Award size={20} className="text-emerald-500" />, label: "Exam Results", sub: "Detailed Marks & Grades", noPdf: true, xls: () => downloadExamResultsExcel(schoolId, selectedClass, startDate, endDate) }
                    ].map((item, idx) => (
                        <div key={idx} className="p-4 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-[1.5rem] shadow-sm flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl">{item.icon}</div>
                                <div><p className="font-black text-xs uppercase dark:text-white">{item.label}</p><p className="text-[9px] text-slate-400 uppercase tracking-tighter">{item.sub}</p></div>
                            </div>
                            <div className="flex gap-2">
                                {!item.noPdf && (
                                    <button onClick={() => handleDownload(item.pdf!)} disabled={loading} className="flex-1 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:bg-rose-100 transition-colors">
                                        <FileText size={12} /> PDF
                                    </button>
                                )}
                                <button onClick={() => handleDownload(item.xls)} disabled={loading} className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors">
                                    <FileSpreadsheet size={12} /> Excel
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TEACHER OPTIONS */}
        {role === 'teacher' && (
            <div className="space-y-3 premium-subview-enter">
                <button onClick={() => handleDownload(() => downloadPortalHistory(schoolId, schoolName || 'School', principalName || '', 'teacher', userId!, startDate, endDate))} disabled={loading} className="w-full p-5 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><BookOpen size={20} /></div>
                    <div className="text-left">
                        <p className="font-black text-sm uppercase dark:text-white">My Submissions</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Homework & Periods</p>
                    </div>
                    {loading && <Loader2 className="ml-auto animate-spin" size={16} />}
                </button>

                <button onClick={() => handleDownload(() => downloadLeaveReport(schoolId, schoolName || 'School', principalName || '', 'teacher', userId!, startDate, endDate))} disabled={loading} className="w-full p-5 bg-white dark:bg-dark-800 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center"><CheckCircle2 size={20} /></div>
                    <div className="text-left">
                        <p className="font-black text-sm uppercase dark:text-white">My Leaves</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Approval History</p>
                    </div>
                    {loading && <Loader2 className="ml-auto animate-spin" size={16} />}
                </button>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 animate-pulse">Generating Report...</p>
            </div>
        )}

      </div>
    </Modal>
  );
};
