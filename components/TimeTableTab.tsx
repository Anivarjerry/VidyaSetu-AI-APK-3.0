
import React, { useState, useEffect } from 'react';
import { fetchSchoolClasses, fetchClassSubjects, fetchTeachersForTimeTable, fetchTimeTable, saveTimeTableEntry, copyTimeTableDay } from '../services/dashboardService';
import { downloadTimeTablePDF } from '../services/reportService';
import { TimeTableEntry, DashboardData } from '../types';
import { Loader2, Plus, FileText, Calendar, GraduationCap, Save, Copy, X, Check, RefreshCw } from 'lucide-react';

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
    const [teachers, setTeachers] = useState<any[]>([]);
    const [entries, setEntries] = useState<TimeTableEntry[]>([]);
    
    // Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ subject: '', teacher_id: '' });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, [schoolId]);

    useEffect(() => {
        if (selectedClass && selectedDay) {
            loadEntries();
        }
    }, [selectedClass, selectedDay]);

    useEffect(() => {
        if (selectedClass) {
            const cls = classes.find(c => c.class_name === selectedClass);
            if(cls) loadSubjects(cls.id);
        }
    }, [selectedClass]);

    const loadInitialData = async () => {
        setLoading(true);
        const [clsData, teachData] = await Promise.all([
            fetchSchoolClasses(schoolId),
            fetchTeachersForTimeTable(schoolId)
        ]);
        setClasses(clsData);
        setTeachers(teachData);
        setLoading(false);
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
            await loadEntries();
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

    const handleDownload = () => {
        if (!selectedClass) return;
        downloadTimeTablePDF(entries, schoolName, principalName, selectedClass, selectedDay);
    };

    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Unknown';

    // Ensure we show at least 8 periods if totalPeriods is 0 or low
    const displayPeriods = (totalPeriods && totalPeriods > 0) ? totalPeriods : 8;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-950 pb-20">
            {/* Header Controls */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl p-4 space-y-4 shadow-sm">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {DAYS.map(day => (
                        <button 
                            key={day} 
                            onClick={() => setSelectedDay(day)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${selectedDay === day ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400'}`}
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
                    {/* COPY BUTTON */}
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
                        className="w-12 h-12 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 disabled:opacity-50"
                    >
                        <FileText size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!selectedClass ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 opacity-50">
                        <Calendar size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Select a class to manage</p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>
                ) : (
                    Array.from({ length: displayPeriods }).map((_, i) => {
                        const pNum = i + 1;
                        const entry = entries.find(e => e.period_number === pNum);
                        
                        return (
                            <div 
                                key={pNum} 
                                onClick={() => handleEditClick(pNum)}
                                className={`p-4 rounded-[1.8rem] border transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between shadow-sm ${entry ? 'bg-white dark:bg-dark-900 border-indigo-100 dark:border-white/10' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner ${entry ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
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
                                <div className={`p-2 rounded-full ${entry ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-300'}`}>
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
                    <div className="bg-white dark:bg-dark-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 border border-white/10">
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
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Assign Teacher</label>
                                <select 
                                    value={editForm.teacher_id}
                                    onChange={(e) => setEditForm({...editForm, teacher_id: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold uppercase outline-none"
                                >
                                    <option value="">Select Teacher</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} {t.assigned_subject ? `(${t.assigned_subject})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                onClick={handleSaveEntry} 
                                disabled={saving} 
                                className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
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
