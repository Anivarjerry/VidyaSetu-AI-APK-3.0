
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { X, Check, Loader2, FileText, Download, TrendingUp, Users, RefreshCw, AlertCircle, Save, Plus, Search } from 'lucide-react';
import { fetchSchoolClasses, fetchStudentsForClass, createExamRecord, submitExamResults, fetchExamRecords, fetchExamResultsByRecord } from '../services/dashboardService';
import { downloadStudentReport } from '../services/reportService';
import { Role, ExamRecord, Student, ExamMark } from '../types';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  schoolId: string;
  userId: string;
  assignedSubject?: string;
}

export const ExamModal: React.FC<ExamModalProps> = ({ isOpen, onClose, role, schoolId, userId, assignedSubject }) => {
  // Navigation State
  const [view, setView] = useState<'list' | 'create' | 'details'>('list');
  
  // Data State
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [selectedResults, setSelectedResults] = useState<ExamMark[]>([]);
  
  // Create Form State
  const [formData, setFormData] = useState({
      class_name: '',
      subject: assignedSubject || '',
      exam_title: 'Unit Test 1',
      total_marks: '10',
      exam_date: new Date().toISOString().split('T')[0]
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marksEntry, setMarksEntry] = useState<Record<string, string>>({}); // ID -> Mark
  const [absentEntry, setAbsentEntry] = useState<Record<string, boolean>>({}); // ID -> Is Absent
  
  // Search States
  const [examSearchTerm, setExamSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
      if (isOpen) {
          if (!schoolId) {
              alert("System Error: School ID Missing. Please logout and login.");
              onClose();
              return;
          }
          loadHistory();
          loadClasses();
          setView('list');
          setExamSearchTerm('');
      }
  }, [isOpen]);

  const loadHistory = async () => {
      setLoading(true);
      const data = await fetchExamRecords(schoolId);
      setExams(data);
      setLoading(false);
  };

  const loadClasses = async () => {
      const data = await fetchSchoolClasses(schoolId);
      setClasses(data);
  };

  // --- VIEW 1: EXAM LIST HANDLERS ---
  const handleViewDetails = async (exam: ExamRecord) => {
      setLoading(true);
      setSelectedExam(exam);
      const results = await fetchExamResultsByRecord(exam.id!);
      setSelectedResults(results);
      setStudentSearchTerm(''); // Reset student search
      setView('details');
      setLoading(false);
  };

  // --- VIEW 2: CREATE EXAM HANDLERS ---
  const handleClassChange = async (cls: string) => {
      setFormData(prev => ({...prev, class_name: cls}));
      if (cls) {
          const stList = await fetchStudentsForClass(schoolId, cls);
          setStudents(stList);
          const initialMarks: Record<string, string> = {};
          const initialAbsent: Record<string, boolean> = {};
          stList.forEach(s => {
              initialMarks[s.id] = '';
              initialAbsent[s.id] = false;
          });
          setMarksEntry(initialMarks);
          setAbsentEntry(initialAbsent);
      } else {
          setStudents([]);
      }
  };

  const calculateGrade = (obtained: number, total: number) => {
      const p = (obtained / total) * 100;
      if (p >= 90) return 'A+';
      if (p >= 80) return 'A';
      if (p >= 70) return 'B+';
      if (p >= 60) return 'B';
      if (p >= 50) return 'C';
      if (p >= 33) return 'D';
      return 'F';
  };

  const handleSaveExam = async () => {
      if (!formData.class_name || !formData.subject || !formData.total_marks) {
          alert("Please fill all exam details (Class, Subject, Marks)");
          return;
      }
      if (students.length === 0) {
          alert("No students found in this class.");
          return;
      }

      // 1. Create Parent Record
      setSubmitting(true);
      const recordPayload: ExamRecord = {
          school_id: schoolId,
          ...formData,
          total_marks: parseFloat(formData.total_marks)
      };

      const recordRes = await createExamRecord(recordPayload);
      
      if (recordRes.success && recordRes.id) {
          // 2. Prepare Marks
          const marksPayload: ExamMark[] = [];
          students.forEach(s => {
              const mStr = marksEntry[s.id];
              const isAbsent = absentEntry[s.id];
              
              // Only push if marked absent OR marks entered
              if (isAbsent || (mStr && !isNaN(parseFloat(mStr)))) {
                  const mVal = isAbsent ? 0 : parseFloat(mStr);
                  marksPayload.push({
                      record_id: recordRes.id!,
                      student_id: s.id,
                      student_name: s.name,
                      obtained_marks: mVal,
                      grade: isAbsent ? 'ABS' : calculateGrade(mVal, parseFloat(formData.total_marks)),
                      is_absent: isAbsent
                  });
              }
          });

          if (marksPayload.length > 0) {
              const marksRes = await submitExamResults(marksPayload);
              if (marksRes.success) {
                  alert("Results Saved Successfully!");
                  loadHistory();
                  setView('list');
              } else {
                  alert("Exam Created but Marks Failed: " + marksRes.error);
              }
          } else {
              alert("Exam Created (No marks entered).");
              loadHistory();
              setView('list');
          }
      } else {
          alert("Failed to create exam record: " + recordRes.error);
      }
      setSubmitting(false);
  };

  const handleDownloadReport = async (studentId: string, studentName: string) => {
      setDownloadingId(studentId);
      await downloadStudentReport(schoolId, studentId, studentName);
      setDownloadingId(null);
  };

  const toggleAbsent = (studentId: string) => {
      setAbsentEntry(prev => {
          const newState = !prev[studentId];
          if (newState) {
              // Clear marks if marked absent
              setMarksEntry(m => ({...m, [studentId]: ''}));
          }
          return { ...prev, [studentId]: newState };
      });
  };

  // Filtered Lists
  const filteredExams = useMemo(() => {
      const term = examSearchTerm.toLowerCase();
      return exams.filter(ex => 
          ex.exam_title.toLowerCase().includes(term) || 
          ex.class_name.toLowerCase().includes(term) || 
          ex.subject.toLowerCase().includes(term)
      );
  }, [exams, examSearchTerm]);

  const filteredResults = useMemo(() => {
      const term = studentSearchTerm.toLowerCase();
      return selectedResults.filter(res => 
          res.student_name.toLowerCase().includes(term)
      );
  }, [selectedResults, studentSearchTerm]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="RESULT MANAGEMENT">
      <div className="h-[80vh] flex flex-col">
        
        {/* VIEW 1: HISTORY LIST */}
        {view === 'list' && (
            <>
                <div className="flex justify-between items-center mb-4 px-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Uploads</p>
                    <button onClick={() => setView('create')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2">
                        <Plus size={14} strokeWidth={3} /> New Result
                    </button>
                </div>

                {/* EXAM SEARCH BAR */}
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={16} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search by Class, Subject or Test Name..." 
                        value={examSearchTerm}
                        onChange={(e) => setExamSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                    {loading ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div>
                    ) : filteredExams.length === 0 ? (
                        <div className="text-center py-20 opacity-30 uppercase font-black text-[10px] tracking-widest">No matching results found</div>
                    ) : (
                        filteredExams.map(ex => (
                            <div key={ex.id} onClick={() => handleViewDetails(ex)} className="p-5 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5 rounded-[2rem] shadow-sm active:scale-[0.98] transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">{ex.exam_title}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ex.class_name} • {ex.subject}</p>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500">{ex.exam_date}</div>
                                </div>
                                <div className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1 group-hover:underline">
                                    View Report <FileText size={10} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        )}

        {/* VIEW 2: CREATE EXAM */}
        {view === 'create' && (
            <div className="flex flex-col h-full premium-subview-enter">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 mb-4 space-y-3">
                        <h4 className="font-black uppercase text-xs text-slate-400 tracking-widest mb-2">Exam Configuration</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <select 
                                value={formData.class_name} 
                                onChange={e => handleClassChange(e.target.value)} 
                                className="p-3 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase"
                            >
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
                            </select>
                            
                            <input 
                                type="text" 
                                placeholder="Subject" 
                                value={formData.subject} 
                                onChange={e => setFormData({...formData, subject: e.target.value})} 
                                className="p-3 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase"
                                readOnly={!!assignedSubject}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <select 
                                value={formData.exam_title} 
                                onChange={e => setFormData({...formData, exam_title: e.target.value})} 
                                className="p-3 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase"
                            >
                                <option>Class Test</option>
                                <option>Unit Test 1</option>
                                <option>Unit Test 2</option>
                                <option>Unit Test 3</option>
                                <option>Half Yearly</option>
                                <option>Annual Exam</option>
                            </select>
                            
                            <input 
                                type="number" 
                                placeholder="Max Marks" 
                                value={formData.total_marks} 
                                onChange={e => setFormData({...formData, total_marks: e.target.value})} 
                                className="p-3 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase"
                            />
                        </div>
                    </div>

                    {students.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Student Marks</p>
                            {students.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                    <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-200 truncate flex-1">{s.name}</span>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={absentEntry[s.id]}
                                                onChange={() => toggleAbsent(s.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                                            />
                                            <span className={`text-[9px] font-black uppercase ${absentEntry[s.id] ? 'text-rose-500' : 'text-slate-400'}`}>ABS</span>
                                        </div>
                                        
                                        <input 
                                            type="number" 
                                            placeholder="0" 
                                            value={marksEntry[s.id]} 
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                if (val > parseFloat(formData.total_marks)) return; // Prevent > Max
                                                setMarksEntry({...marksEntry, [s.id]: e.target.value})
                                            }} 
                                            className={`w-16 p-2 rounded-lg border text-center font-bold text-xs transition-all ${absentEntry[s.id] ? 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent cursor-not-allowed' : 'bg-slate-50 dark:bg-dark-950 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'}`}
                                            disabled={absentEntry[s.id]}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-2 flex gap-3">
                    <button onClick={() => setView('list')} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-500">Cancel</button>
                    <button onClick={handleSaveExam} disabled={submitting} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {submitting ? <Loader2 className="animate-spin" /> : <><Save size={14} /> Save Results</>}
                    </button>
                </div>
            </div>
        )}

        {/* VIEW 3: DETAILS */}
        {view === 'details' && selectedExam && (
            <div className="flex flex-col h-full premium-subview-enter">
                <button onClick={() => setView('list')} className="mb-4 text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 hover:text-emerald-500 w-fit"><X size={12} /> Back to List</button>
                
                <div className="p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 mb-4 text-center">
                    <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase">{selectedExam.exam_title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-widest">{selectedExam.class_name} • {selectedExam.subject} • Max: {selectedExam.total_marks}</p>
                </div>

                {/* STUDENT SEARCH BAR */}
                <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={14} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search student..." 
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                    />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                    {filteredResults.length === 0 ? (
                        <div className="text-center py-10 opacity-30 text-[10px] font-black uppercase">No students found</div>
                    ) : (
                        filteredResults.map((res, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white dark:bg-dark-900 rounded-2xl border border-slate-100 dark:border-white/5">
                                <span className="font-bold text-xs uppercase text-slate-700 dark:text-white flex-1">{res.student_name || 'Student'}</span>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-black ${res.is_absent ? 'text-rose-500' : 'text-emerald-600'}`}>{res.is_absent ? 'ABSENT' : res.obtained_marks}</span>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md mr-1 ${res.is_absent ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-500' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>{res.grade}</span>
                                    <button 
                                        onClick={() => handleDownloadReport(res.student_id, res.student_name)} 
                                        disabled={downloadingId === res.student_id}
                                        className="p-2 rounded-xl bg-brand-500/10 text-brand-600 hover:bg-brand-500 hover:text-white transition-colors active:scale-95"
                                        title="Download Full Report"
                                    >
                                        {downloadingId === res.student_id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

      </div>
    </Modal>
  );
};
