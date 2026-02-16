
import React, { useState, useEffect } from 'react';
import { PeriodData } from '../types';
import { Loader2, Sparkles, BookOpen, GraduationCap, Layers, CheckCircle2, Type, History, FileText, LayoutGrid, AlertCircle, ArrowLeft } from 'lucide-react';
import { fetchSchoolClasses, fetchClassSubjects, fetchSubjectLessons, fetchLessonHomework, fetchFullSchoolTimeTable } from '../services/dashboardService';

interface PeriodModalProps {
  onBack: () => void;
  onSubmit: (data: PeriodData) => Promise<void>;
  periodNumber: number;
  initialData?: PeriodData;
  schoolDbId?: string;
  teacherId?: string; // Needed for auto-fill
}

export const PeriodModal: React.FC<PeriodModalProps> = ({ 
  onBack, 
  onSubmit, 
  periodNumber, 
  initialData,
  schoolDbId,
  teacherId
}) => {
  // NOTE: Removed useModalBackHandler here. 
  // The parent component (TeacherDashboard) wraps this in a Modal which already handles the back button.
  // Double registration was causing a race condition on submit.

  const [formData, setFormData] = useState<PeriodData>({
    period_number: periodNumber,
    status: 'pending',
    class_name: '',
    subject: '',
    lesson: '',
    homework: '',
    homework_type: 'Manual Input'
  });

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [assignedHomeworks, setAssignedHomeworks] = useState<any[]>([]);
  
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  // Homework Picker States (Now a sub-view within this component)
  const [view, setView] = useState<'form' | 'picker_options' | 'picker_manual' | 'picker_test' | 'picker_assigned'>('form');
  const [manualText, setManualText] = useState('');
  const [testTopic, setTestTopic] = useState('');
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  useEffect(() => {
    if (schoolDbId) {
      loadClassesAndAutoFill();
    }
  }, [schoolDbId, periodNumber]);

  useEffect(() => {
    if (initialData && initialData.status === 'submitted') {
      setFormData(initialData);
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  }, [initialData]);

  const loadClassesAndAutoFill = async () => {
    setLoadingClasses(true);
    try {
        // 1. Load All Classes
        const classData = await fetchSchoolClasses(schoolDbId!);
        setClasses(classData);

        // 2. If it's NEW entry (not edit), try to Auto-Fill from Time Table
        if (!initialData || initialData.status !== 'submitted') {
            if (teacherId) {
                setAutoFillLoading(true);
                const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                // Fetch ALL allocations for today
                const allAllocations = await fetchFullSchoolTimeTable(schoolDbId!, todayDay);
                
                // Find match for this teacher & period
                const match = allAllocations.find((a: any) => a.period_number === periodNumber && a.teacher_id === teacherId);
                
                if (match) {
                    setFormData(prev => ({ 
                        ...prev, 
                        class_name: match.class_name, 
                        subject: match.subject 
                    }));
                    
                    // Trigger subject load for this class so user can change it if needed
                    const matchedClassObj = classData.find((c: any) => c.class_name === match.class_name);
                    if (matchedClassObj) {
                        loadSubjects(matchedClassObj.id); 
                    }
                }
                setAutoFillLoading(false);
            }
        } else if (initialData && initialData.class_name) {
            // If editing, load subjects for the existing class
            const matchedClassObj = classData.find((c: any) => c.class_name === initialData.class_name);
            if (matchedClassObj) loadSubjects(matchedClassObj.id);
        }

    } catch(e) {}
    setLoadingClasses(false);
  };

  const loadSubjects = async (classId: string) => {
      setLoadingSubjects(true);
      try {
          const data = await fetchClassSubjects(classId);
          setSubjects(data);
          // If editing and we have a subject, try to load lessons
          if (formData.subject || initialData?.subject) {
              const subName = formData.subject || initialData?.subject;
              const foundSub = data.find((s: any) => s.subject_name === subName);
              if (foundSub) loadLessons(foundSub.id);
          }
      } catch(e) {}
      setLoadingSubjects(false);
  };

  const loadLessons = async (subjectId: string) => {
      setLoadingLessons(true);
      try {
          const data = await fetchSubjectLessons(subjectId);
          setLessons(data);
      } catch(e) {}
      setLoadingLessons(false);
  };

  const loadAssignedHomework = async () => {
      const selectedLessonObj = lessons.find(l => l.lesson_name === formData.lesson);
      if (!selectedLessonObj) return;
      setLoadingAssigned(true);
      try {
          const data = await fetchLessonHomework(selectedLessonObj.id);
          setAssignedHomeworks(data);
          setView('picker_assigned');
      } catch(e) {}
      setLoadingAssigned(false);
  };

  const handleClassChange = (className: string) => {
    setFormData(prev => ({ ...prev, class_name: className, subject: '', lesson: '', homework: '' }));
    setSubjects([]); setLessons([]);
    const obj = classes.find(c => c.class_name === className);
    if (obj) loadSubjects(obj.id);
  };

  const handleSubjectChange = (subjectName: string) => {
    setFormData(prev => ({ ...prev, subject: subjectName, lesson: '', homework: '' }));
    setLessons([]);
    const obj = subjects.find(s => s.subject_name === subjectName);
    if (obj) loadLessons(obj.id);
  };

  const handleHomeworkSelect = (text: string, type: string) => {
      setFormData(prev => ({ ...prev, homework: text, homework_type: type }));
      setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class_name || !formData.subject || !formData.lesson) {
        alert("Please select Class, Subject and Lesson.");
        return;
    }
    if (!formData.homework) {
        alert("Please set homework content first.");
        return;
    }
    setIsSubmitting(true);
    await onSubmit({ ...formData, status: 'submitted' });
    setIsSubmitting(false);
  };

  // --- RENDER HELPERS ---

  // 1. HOMEWORK PICKER SUB-VIEWS
  if (view !== 'form') {
      return (
          <div className="flex flex-col h-full premium-subview-enter bg-slate-50 dark:bg-dark-900/50">
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-dark-900">
                  <div className="flex items-center gap-3">
                      <button onClick={() => {
                          if (view === 'picker_options') setView('form');
                          else setView('picker_options');
                      }} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl shadow-sm"><ArrowLeft size={18} /></button>
                      <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest">
                          {view === 'picker_options' ? 'Select Type' : view.replace('picker_', '').toUpperCase()}
                      </h4>
                  </div>
              </div>

              <div className="p-6 space-y-3 flex-1 overflow-y-auto no-scrollbar">
                  {view === 'picker_options' && (
                      <div className="grid gap-3 premium-subview-enter">
                          <button onClick={() => { setManualText(formData.homework || ''); setView('picker_manual'); }} className="p-5 bg-white dark:bg-dark-900 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center gap-4 active:scale-95 transition-all text-left group">
                              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all"><Type size={24} /></div>
                              <div><p className="font-black text-xs uppercase dark:text-white">Manual Input</p><p className="text-[10px] text-slate-400 font-bold uppercase">Type custom text</p></div>
                          </button>
                          <button onClick={() => handleHomeworkSelect("Complete yesterday's homework and submit tomorrow.", "Yesterday's Task")} className="p-5 bg-white dark:bg-dark-900 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center gap-4 active:scale-95 transition-all text-left group">
                              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all"><History size={24} /></div>
                              <div><p className="font-black text-xs uppercase dark:text-white">Fixed: Yesterday's</p><p className="text-[10px] text-slate-400 font-bold uppercase">Set standard reminder</p></div>
                          </button>
                          <button onClick={() => { setTestTopic(''); setView('picker_test'); }} className="p-5 bg-white dark:bg-dark-900 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center gap-4 active:scale-95 transition-all text-left group">
                              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all"><FileText size={24} /></div>
                              <div><p className="font-black text-xs uppercase dark:text-white">Fixed: Test Notice</p><p className="text-[10px] text-slate-400 font-bold uppercase">Announce upcoming test</p></div>
                          </button>
                          <button onClick={loadAssignedHomework} className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4 active:scale-95 transition-all text-left group">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all"><BookOpen size={24} /></div>
                              <div><p className="font-black text-xs uppercase dark:text-emerald-500">Assigned Templates</p><p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-tight">Admin pre-sets</p></div>
                          </button>
                      </div>
                  )}

                  {view === 'picker_manual' && (
                      <div className="space-y-4 premium-subview-enter">
                          <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Type homework here..." rows={5} className="w-full p-6 bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 rounded-[2rem] text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none shadow-inner" />
                          <button onClick={() => handleHomeworkSelect(manualText, "Manual Input")} disabled={!manualText.trim()} className="w-full py-5 rounded-[1.8rem] bg-emerald-500 text-white font-black uppercase text-xs tracking-widest disabled:opacity-40 shadow-lg shadow-emerald-500/20">Apply Content</button>
                      </div>
                  )}

                  {view === 'picker_test' && (
                      <div className="space-y-4 premium-subview-enter">
                          <div className="bg-rose-50 dark:bg-rose-500/10 p-5 rounded-3xl border border-rose-100 dark:border-rose-500/20 flex items-center gap-3">
                              <AlertCircle size={20} className="text-rose-500" />
                              <p className="text-[10px] font-black uppercase text-rose-600">Testing Protocol</p>
                          </div>
                          <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Topic Name</label><input type="text" value={testTopic} onChange={e => setTestTopic(e.target.value)} placeholder="e.g. Chapter 5 Basics" className="w-full p-5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-rose-500 shadow-sm" /></div>
                          <button onClick={() => handleHomeworkSelect(`Test Announcement: Preparation required for "${testTopic}" tomorrow.`, "Test Notice")} disabled={!testTopic.trim()} className="w-full py-5 rounded-[1.8rem] bg-rose-500 text-white font-black uppercase text-xs tracking-widest disabled:opacity-40 shadow-lg shadow-rose-500/20">Set Test Homework</button>
                      </div>
                  )}

                  {view === 'picker_assigned' && (
                      <div className="space-y-3 premium-subview-enter">
                          {loadingAssigned ? (
                              <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div>
                          ) : assignedHomeworks.length === 0 ? (
                              <div className="text-center py-12 px-4 opacity-40 uppercase text-[9px] font-black tracking-[0.2em] italic">No assigned tasks found for this lesson in Admin Panel.</div>
                          ) : (
                              <div className="space-y-2">
                                  {assignedHomeworks.map(h => (
                                      <div key={h.id} onClick={() => handleHomeworkSelect(h.homework_template, "Assigned Template")} className="p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/10 active:scale-95 transition-all text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer uppercase tracking-tight shadow-sm hover:border-emerald-400">{h.homework_template}</div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // 2. MAIN FORM VIEW
  return (
    <div className="flex flex-col h-full premium-subview-enter">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 bg-white dark:bg-white/5 rounded-xl shadow-sm"><ArrowLeft size={18} /></button>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  {isEditMode ? `Edit P-${periodNumber}` : `P-${periodNumber} Entry`}
                </h3>
            </div>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1 pl-11">
              <Sparkles size={10} /> {autoFillLoading ? 'Checking TimeTable...' : 'Smart Portal'}
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><GraduationCap size={12} /> Class</label>
              <select value={formData.class_name} onChange={(e) => handleClassChange(e.target.value)} className="w-full p-4 bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase" required disabled={loadingClasses}>
                <option value="">{loadingClasses ? 'Loading...' : 'Select Class'}</option>
                {classes.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><BookOpen size={12} /> Subject</label>
              <select value={formData.subject} onChange={(e) => handleSubjectChange(e.target.value)} className="w-full p-4 bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase" required disabled={!formData.class_name || loadingSubjects}>
                <option value="">{loadingSubjects ? 'Wait...' : 'Select Subject'}</option>
                {subjects.map(s => <option key={s.id} value={s.subject_name}>{s.subject_name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Layers size={12} /> Lesson / Topic</label>
            <select value={formData.lesson} onChange={(e) => setFormData(prev => ({ ...prev, lesson: e.target.value, homework: '' }))} className="w-full p-4 bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase" required disabled={!formData.subject || loadingLessons}>
              <option value="">{loadingLessons ? 'Wait...' : 'Select Lesson'}</option>
              {lessons.map(l => <option key={l.id} value={l.lesson_name}>{l.lesson_name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Homework Details</label>
            <div 
                onClick={(e) => { 
                    e.preventDefault();
                    if(formData.lesson) setView('picker_options'); 
                    else alert("Please select Class, Subject and Lesson first."); 
                }}
                className={`w-full p-6 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 min-h-[120px] cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${formData.homework ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-dark-950 border-slate-200 dark:border-white/10'}`}
            >
              {formData.homework ? (
                  <div className="text-center w-full px-2">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1.5">
                        <CheckCircle2 size={14} />
                        <p className="text-[10px] uppercase font-black tracking-widest">{formData.homework_type?.toUpperCase() || 'CONTENT'} SELECTED</p>
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-3 uppercase tracking-tighter">"{formData.homework}"</p>
                      <p className="text-[8px] text-emerald-500 font-black mt-2 underline">CLICK TO CHANGE</p>
                  </div>
              ) : (
                  <>
                    <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl shadow-sm flex items-center justify-center text-emerald-500 mb-1">
                        <LayoutGrid size={24} />
                    </div>
                    <span className="uppercase tracking-widest text-[10px] font-black text-slate-400">SET HOMEWORK CONTENT</span>
                  </>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isSubmitting || !formData.homework} className="w-full py-5 rounded-[1.8rem] flex justify-center items-center gap-3 bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all font-black text-xs tracking-[0.2em] uppercase border-none glossy-btn disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" /> : (isEditMode ? 'Update Session' : 'Save Session')}
            </button>
          </div>
        </form>
    </div>
  );
};
