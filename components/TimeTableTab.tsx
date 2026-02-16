
import React, { useState, useEffect } from 'react';
import { fetchSchoolClasses, fetchClassSubjects, fetchTeachersForTimeTable, fetchTimeTable, saveTimeTableEntry, copyTimeTableDay, fetchFullSchoolTimeTable, fetchTeacherProfiles } from '../services/dashboardService';
import { generateClassSchedule } from '../services/aiService';
import { downloadTimeTablePDF } from '../services/reportService';
import { TimeTableEntry, TeacherProfile } from '../types';
import { Loader2, Plus, FileText, Calendar, GraduationCap, Save, Copy, X, Sparkles, BrainCircuit, Wand2 } from 'lucide-react';

interface TimeTableTabProps {
    schoolId: string;
    schoolName: string;
    principalName: string;
    totalPeriods: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TimeTableTab: React.FC<TimeTableTabProps> = ({ schoolId, schoolName, principalName, totalPeriods }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedDay, setSelectedDay] = useState('Monday');
    
    // Data
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]); // Basic user data
    const [teacherProfiles, setTeacherProfiles] = useState<TeacherProfile[]>([]); // Rich profile data
    const [entries, setEntries] = useState<TimeTableEntry[]>([]);
    const [allAllocations, setAllAllocations] = useState<TimeTableEntry[]>([]);
    
    // Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ subject: '', teacher_id: '' });
    
    // Loaders
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copying, setCopying] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);

    // Smart Suggestions
    const [suggestions, setSuggestions] = useState<{ teacher: any, score: number, reason: string }[]>([]);

    useEffect(() => {
        loadInitialData();
    }, [schoolId]);

    useEffect(() => {
        if (schoolId && selectedDay) {
            loadAllAllocations();
        }
        if (selectedClass && selectedDay) {
            loadEntries();
        }
    }, [selectedClass, selectedDay, schoolId]);

    useEffect(() => {
        if (selectedClass) {
            const cls = classes.find(c => c.class_name === selectedClass);
            if(cls) loadSubjects(cls.id);
        }
    }, [selectedClass]);

    // Recalculate suggestions when edit form changes
    useEffect(() => {
        if (isEditOpen && editForm.subject) {
            calculateSuggestions();
        }
    }, [editForm.subject, allAllocations]);

    const loadInitialData = async () => {
        setLoading(true);
        const [clsData, teachData, profiles] = await Promise.all([
            fetchSchoolClasses(schoolId),
            fetchTeachersForTimeTable(schoolId),
            fetchTeacherProfiles(schoolId)
        ]);
        setClasses(clsData);
        setTeachers(teachData);
        setTeacherProfiles(profiles);
        setLoading(false);
    };

    const loadAllAllocations = async () => {
        const data = await fetchFullSchoolTimeTable(schoolId, selectedDay);
        setAllAllocations(data);
    };

    const loadSubjects = async (classId: string) => {
        const subData = await fetchClassSubjects(classId);
        setSubjects(subData);
    };

    const loadEntries = async () => {
        setLoading(true);
        const data = await fetchTimeTable(schoolId, selectedClass, selectedDay);
        setEntries(data);
        setLoading(false);
    };

    const handleEditClick = (periodNum: number) => {
        const existing = entries.find(e => e.period_number === periodNum);
        setEditingPeriod(periodNum);
        setEditForm({
            subject: existing?.subject || '',
            teacher_id: existing?.teacher_id || ''
        });
        setIsEditOpen(true);
    };

    // --- SMART LOGIC ---
    const calculateSuggestions = () => {
        if (!editForm.subject) { setSuggestions([]); return; }
        
        const subj = editForm.subject.toLowerCase();
        
        const ranked = teachers.map(t => {
            let score = 0;
            let reason = '';
            
            // 1. Availability Check
            const isBusy = allAllocations.some(a => a.teacher_id === t.id && a.period_number === editingPeriod && a.class_name !== selectedClass);
            if (isBusy) return { teacher: t, score: -1, reason: 'Busy' };

            // 2. Profile Matching
            const profile = teacherProfiles.find(p => p.user_id === t.id);
            if (profile) {
                if (profile.primary_subjects.some(s => s.toLowerCase().includes(subj))) {
                    score += 10;
                    reason = 'Primary Skill';
                } else if (profile.secondary_subjects.some(s => s.toLowerCase().includes(subj))) {
                    score += 5;
                    reason = 'Secondary Skill';
                } else if (profile.is_floater) {
                    score += 2;
                    reason = 'Floater';
                }

                // Tier Bonus for high classes
                // Assuming Class 9-12 needs Expert
                const isHighClass = parseInt(selectedClass.replace(/\D/g, '')) >= 9;
                if (isHighClass && profile.teacher_tier === 'Expert') score += 3;
                if (!isHighClass && profile.teacher_tier === 'Associate') score += 1; // Good for lower classes
            }

            return { teacher: t, score, reason };
        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

        setSuggestions(ranked);
    };

    const handleSaveEntry = async () => {
        if (editingPeriod === null) return;
        setSaving(true);
        
        const payload: TimeTableEntry = {
            school_id: schoolId,
            class_name: selectedClass,
            day_of_week: selectedDay,
            period_number: editingPeriod,
            subject: editForm.subject,
            teacher_id: editForm.teacher_id || undefined
        };

        const success = await saveTimeTableEntry(payload);
        if (success) {
            await Promise.all([loadEntries(), loadAllAllocations()]);
            setIsEditOpen(false);
        } else {
            alert("Failed to save entry. Check DB permissions.");
        }
        setSaving(false);
    };

    const handleCopyDay = async () => {
        if(!confirm(`Copy ${selectedDay}'s schedule to all other days for ${selectedClass}?`)) return;
        setCopying(true);
        const success = await copyTimeTableDay(schoolId, selectedClass, selectedDay, DAYS);
        if (success) alert("Schedule copied successfully!");
        else alert("Failed to copy schedule.");
        setCopying(false);
    };

    const handleAIGenerate = async () => {
        if (!selectedClass) { alert("Please select a class first."); return; }
        if (entries.length > 0 && !confirm("This will overwrite the current day's schedule. Continue?")) return;
        
        setAiGenerating(true);
        
        // Prepare context for AI
        const subNames = subjects.map(s => s.subject_name);
        const teacherContext = teacherProfiles.map(p => ({
            name: p.name || 'Teacher',
            tier: p.teacher_tier,
            skills: [...p.primary_subjects, ...p.secondary_subjects]
        }));

        try {
            const aiSchedule = await generateClassSchedule(selectedClass, subNames, teacherContext);
            
            if (aiSchedule && aiSchedule.length > 0) {
                // Filter only for the current selected day
                const daySchedule = aiSchedule.filter((s: any) => s.day === selectedDay);
                
                // Map names back to IDs
                for (const item of daySchedule) {
                    // Fuzzy match teacher name
                    const tObj = teachers.find(t => t.name.toLowerCase().includes(item.teacher_name.toLowerCase().split(' ')[0]));
                    
                    const payload: TimeTableEntry = {
                        school_id: schoolId,
                        class_name: selectedClass,
                        day_of_week: selectedDay,
                        period_number: item.period,
                        subject: item.subject,
                        teacher_id: tObj?.id // If undefined, saves as null
                    };
                    await saveTimeTableEntry(payload);
                }
                
                await Promise.all([loadEntries(), loadAllAllocations()]);
                alert("AI Schedule Generated Successfully!");
            } else {
                alert("AI could not generate a valid schedule. Please try adding more teacher profiles.");
            }
        } catch(e) {
            alert("AI Error. Please try again.");
        }
        setAiGenerating(false);
    };

    const handleDownload = () => {
        if (!selectedClass) return;
        downloadTimeTablePDF(entries, schoolName, principalName, selectedClass, selectedDay);
    };

    const getTeacherBusyInfo = (teacherId: string) => {
        if (editingPeriod === null) return null;
        const conflict = allAllocations.find(a => 
            a.teacher_id === teacherId && 
            a.period_number === editingPeriod &&
            a.class_name !== selectedClass
        );
        return conflict ? `(Busy in ${conflict.class_name})` : null;
    };

    const displayPeriods = (totalPeriods && totalPeriods > 0) ? totalPeriods : 8;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-950">
            {/* Header Controls */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl p-4 space-y-4 shadow-sm">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {DAYS.map(day => (
                        <button 
                            key={day} 
                            onClick={() => setSelectedDay(day)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${selectedDay === day ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400'}`}
                        >
                            {day}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select 
                            value={selectedClass} 
                            onChange={(e) => setSelectedClass(e.target.value)} 
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold uppercase outline-none text-slate-800 dark:text-white"
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
                        </select>
                    </div>
                    {/* AI GENERATE BUTTON */}
                    {selectedClass && (
                        <button 
                            onClick={handleAIGenerate}
                            disabled={aiGenerating}
                            className="w-12 h-12 flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-2xl border border-purple-100 dark:border-purple-500/20 shadow-sm active:scale-95 transition-all"
                            title="Generate with AI"
                        >
                            {aiGenerating ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                        </button>
                    )}
                    {selectedClass && (
                        <button 
                            onClick={handleCopyDay}
                            disabled={copying}
                            className="w-12 h-12 flex items-center justify-center bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-100 dark:border-orange-500/20 shadow-sm active:scale-95"
                            title="Copy to All Days"
                        >
                            {copying ? <Loader2 className="animate-spin" size={20} /> : <Copy size={20} />}
                        </button>
                    )}
                    <button 
                        onClick={handleDownload} 
                        disabled={!selectedClass}
                        className="w-12 h-12 flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 disabled:opacity-50"
                    >
                        <FileText size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40">
                {!selectedClass ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 opacity-50">
                        <Calendar size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Select a class to manage</p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div>
                ) : (
                    Array.from({ length: displayPeriods }).map((_, i) => {
                        const pNum = i + 1;
                        const entry = entries.find(e => e.period_number === pNum);
                        
                        return (
                            <div 
                                key={pNum} 
                                onClick={() => handleEditClick(pNum)}
                                className={`p-4 rounded-[1.8rem] border transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between shadow-sm ${entry ? 'bg-white dark:bg-dark-900 border-emerald-100 dark:border-white/10' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner ${entry ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                                        {pNum}
                                    </div>
                                    <div>
                                        <h4 className={`font-black text-sm uppercase ${entry ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                                            {entry?.subject || 'Empty Period'}
                                        </h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {entry?.teacher_name || 'No Teacher Assigned'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-full ${entry ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-300'}`}>
                                    {entry ? <FileText size={16} /> : <Plus size={16} />}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Edit Modal Overlay */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-dark-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 border border-white/10 max-h-[80vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">Edit Period {editingPeriod}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedClass} • {selectedDay}</p>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full"><X size={18} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Subject</label>
                                <select 
                                    value={editForm.subject}
                                    onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold uppercase outline-none"
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s.id} value={s.subject_name}>{s.subject_name}</option>)}
                                    <option value="Free">Free Period</option>
                                    <option value="Break">Lunch Break</option>
                                    <option value="Sports">Sports</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">Assign Teacher</label>
                                    {suggestions.length > 0 && <span className="text-[8px] font-black text-emerald-500 flex items-center gap-1"><Sparkles size={8} /> SMART MATCH</span>}
                                </div>
                                <select 
                                    value={editForm.teacher_id}
                                    onChange={(e) => setEditForm({...editForm, teacher_id: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold uppercase outline-none"
                                >
                                    <option value="">Select Teacher</option>
                                    {/* Smart Suggestions at Top */}
                                    {suggestions.map(s => (
                                        <option key={s.teacher.id} value={s.teacher.id} className="text-emerald-600 font-bold">
                                            ⭐ {s.teacher.name} ({s.reason})
                                        </option>
                                    ))}
                                    <option disabled>──────────</option>
                                    {/* All Teachers */}
                                    {teachers.map(t => {
                                        const busyInfo = getTeacherBusyInfo(t.id);
                                        const isCurrent = editForm.teacher_id === t.id;
                                        const isDisabled = !!busyInfo && !isCurrent;
                                        // Skip if already in suggestions to avoid duplicate keys in some browsers, but keeping simple for now
                                        return (
                                            <option key={t.id} value={t.id} disabled={isDisabled} className={isDisabled ? 'text-slate-400' : ''}>
                                                {t.name} {t.assigned_subject ? `(${t.assigned_subject})` : ''} {isDisabled ? busyInfo : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <button 
                                onClick={handleSaveEntry} 
                                disabled={saving} 
                                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={16} /> Save Allocation</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
