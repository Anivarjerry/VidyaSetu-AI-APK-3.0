
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Role } from '../types';

// Helper to get Past Date
const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

// --- EXCEL HELPER ---
const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

interface ReportConfig {
    title: string;
    subTitle: string;
    summary: { label: string; value: string | number; color?: string }[];
    headers: string[];
    data: any[][];
    orientation?: 'p' | 'l'; // Portrait or Landscape
    studentDetails?: {
        father: string;
        mother: string;
        dob: string;
        mobile: string;
    };
}

const generatePDF = (config: ReportConfig) => {
    // Initialize PDF with orientation support
    const doc = new jsPDF({
        orientation: config.orientation || 'p',
        unit: 'mm',
        format: 'a4'
    });

    const { title, subTitle, summary, headers, data, studentDetails } = config;
    const pageWidth = doc.internal.pageSize.width;

    // 1. Header Section
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, pageWidth, 40, 'F'); // Increased height for details
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subTitle, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 50, 15);

    // Student Extra Details in Header
    if (studentDetails) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Father: ${studentDetails.father}`, 14, 30);
        doc.text(`Mother: ${studentDetails.mother}`, 80, 30);
        doc.text(`DOB: ${studentDetails.dob}`, 140, 30);
        doc.text(`Contact: ${studentDetails.mobile}`, 14, 36);
    }

    // 2. Graphical Summary (Boxes)
    let startY = 50; // Pushed down
    const boxWidth = 45;
    const boxHeight = 25;
    const gap = 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Executive Summary", 14, startY - 2);

    summary.forEach((item, index) => {
        const x = 14 + (index * (boxWidth + gap));
        
        // Prevent drawing off-screen in portrait
        if (x + boxWidth < pageWidth) {
            // Box BG
            doc.setFillColor(245, 247, 250); // Light Grey
            doc.setDrawColor(220, 220, 220);
            doc.roundedRect(x, startY, boxWidth, boxHeight, 3, 3, 'FD');

            // Value
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(item.color || "#10b981"); // Default Emerald
            doc.text(String(item.value), x + boxWidth / 2, startY + 10, { align: 'center' });

            // Label
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text(item.label.toUpperCase(), x + boxWidth / 2, startY + 18, { align: 'center' });
        }
    });

    // 3. Table
    const tableStartY = startY + boxHeight + 10;
    
    autoTable(doc, {
        head: [headers],
        body: data,
        startY: tableStartY,
        theme: 'grid',
        headStyles: { 
            fillColor: [16, 185, 129], 
            textColor: 255,
            fontSize: config.orientation === 'l' ? 9 : 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            fontSize: config.orientation === 'l' ? 9 : 8,
            textColor: 50
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        styles: {
            cellPadding: 3,
            valign: 'middle',
            overflow: 'linebreak'
        },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerY = doc.internal.pageSize.height - 10;
        doc.text(`Page ${i} of ${pageCount} - VidyaSetu AI Official Report`, pageWidth / 2, footerY, { align: 'center' });
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

// --- API ACTIONS ---

// 1. PRINCIPAL: Attendance
const fetchAttendanceData = async (schoolId: string, className?: string, startDate?: string, endDate?: string) => {
    let query = supabase.from('attendance')
        .select('date, status, students(name, class_name, roll_number, father_name)')
        .eq('school_id', schoolId)
        .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    else query = query.gte('date', getPastDate(60));

    const { data, error } = await query;
    if(error || !data) throw new Error("Fetch failed");
    return className ? data.filter((d: any) => d.students?.class_name === className) : data;
};

export const downloadPrincipalAttendance = async (schoolId: string, className?: string, startDate?: string, endDate?: string) => {
    try {
        const filtered = await fetchAttendanceData(schoolId, className, startDate, endDate);
        const summary = [
            { label: 'Records', value: filtered.length },
            { label: 'Present', value: filtered.filter((r:any) => r.status === 'present').length, color: '#10b981' },
            { label: 'Absent', value: filtered.filter((r:any) => r.status === 'absent').length, color: '#ef4444' },
            { label: 'Leaves', value: filtered.filter((r:any) => r.status === 'leave').length, color: '#f59e0b' }
        ];
        const rows = filtered.map((r: any) => [
            r.date, r.students?.name || 'Unknown', r.students?.roll_number || '-', r.students?.class_name || 'N/A', r.status.toUpperCase()
        ]);
        generatePDF({
            title: "Student Attendance History",
            subTitle: `${startDate} to ${endDate} | Class: ${className || 'All'}`,
            summary,
            headers: ["Date", "Student Name", "Roll No", "Class", "Status"],
            data: rows
        });
        return true;
    } catch(e) { return false; }
};

export const downloadPrincipalAttendanceExcel = async (schoolId: string, className?: string, startDate?: string, endDate?: string) => {
    try {
        const data = await fetchAttendanceData(schoolId, className, startDate, endDate);
        const excelData = data.map((r: any, index: number) => ({
            "S.No": index + 1,
            "Date": r.date,
            "Student Name": r.students?.name || 'Unknown',
            "Class": r.students?.class_name || 'N/A',
            "Roll No": r.students?.roll_number || '-',
            "Father Name": r.students?.father_name || '-',
            "Status": r.status.toUpperCase()
        }));
        exportToExcel(excelData, "Attendance_Report");
        return true;
    } catch(e) { return false; }
};

// 2. PRINCIPAL & TEACHER: Portal History
const fetchPortalData = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    let query = supabase.from('daily_periods')
        .select('date, period_number, class_name, subject, homework, homework_type, lesson, users(name, mobile)')
        .eq('school_id', schoolId)
        .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if(role === 'teacher') query = query.eq('teacher_user_id', userId);

    const { data, error } = await query;
    if(error || !data) throw new Error("Fetch failed");
    return data;
};

export const downloadPortalHistory = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        const data = await fetchPortalData(schoolId, role, userId, startDate, endDate);
        const summary = [
            { label: 'Total Periods', value: data.length },
            { label: 'Subjects', value: new Set(data.map((d:any) => d.subject)).size, color: '#3b82f6' }
        ];
        const rows = data.map((r: any) => [
            r.date,
            `${r.users?.name || 'Teacher'}`,
            `Period ${r.period_number}`,
            `${r.class_name} - ${r.subject}`,
            (r.homework || '').substring(0, 50)
        ]);
        generatePDF({
            title: "Portal Submission Report",
            subTitle: `${startDate} to ${endDate}`,
            summary,
            headers: ["Date", "Teacher", "Period", "Class/Subject", "Homework Snippet"],
            data: rows,
            orientation: 'l'
        });
        return true;
    } catch(e) { return false; }
};

export const downloadPortalHistoryExcel = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        const data = await fetchPortalData(schoolId, role, userId, startDate, endDate);
        const excelData = data.map((r: any, index: number) => ({
            "S.No": index + 1,
            "Date": r.date,
            "Teacher Name": r.users?.name || 'Unknown',
            "Teacher Mobile": r.users?.mobile || '-',
            "Period": r.period_number,
            "Class": r.class_name,
            "Subject": r.subject,
            "Lesson/Topic": r.lesson || '-',
            "Homework Type": r.homework_type || 'Manual',
            "Homework Content": r.homework
        }));
        exportToExcel(excelData, "Portal_Activity_Log");
        return true;
    } catch(e) { return false; }
};

// 3. LEAVE REPORT
const fetchLeaveData = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    let staffQuery = supabase.from('staff_leaves')
        .select('leave_type, start_date, end_date, status, reason, principal_comment, users(name, mobile)')
        .eq('school_id', schoolId);

    if (startDate) staffQuery = staffQuery.gte('created_at', startDate);
    if (endDate) staffQuery = staffQuery.lte('created_at', endDate);
    if(role === 'teacher') staffQuery = staffQuery.eq('user_id', userId);

    const { data } = await staffQuery;
    return data || [];
};

export const downloadLeaveReport = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        const leaves = await fetchLeaveData(schoolId, role, userId, startDate, endDate);
        const summary = [
            { label: 'Total', value: leaves.length },
            { label: 'Approved', value: leaves.filter((l:any) => l.status === 'approved').length, color: '#10b981' }
        ];
        const rows = leaves.map((r: any) => [
            r.users?.name || 'Staff', r.users?.mobile || '-', r.leave_type, `${r.start_date} to ${r.end_date}`, r.reason, r.status.toUpperCase()
        ]);
        generatePDF({
            title: "Leave History Report",
            subTitle: `${startDate} to ${endDate}`,
            summary,
            headers: ["Name", "Contact", "Type", "Duration", "Reason", "Status"],
            data: rows
        });
        return true;
    } catch(e) { return false; }
};

export const downloadLeaveReportExcel = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        const leaves = await fetchLeaveData(schoolId, role, userId, startDate, endDate);
        const excelData = leaves.map((r: any, index: number) => ({
            "S.No": index + 1,
            "Staff Name": r.users?.name || 'Unknown',
            "Mobile": r.users?.mobile || '-',
            "Leave Type": r.leave_type,
            "From Date": r.start_date,
            "To Date": r.end_date,
            "Reason": r.reason,
            "Status": r.status.toUpperCase(),
            "Principal Comment": r.principal_comment || '-'
        }));
        exportToExcel(excelData, "Leave_Report");
        return true;
    } catch(e) { return false; }
};

// 4. STUDENT DIRECTORY
const fetchStudentData = async (schoolId: string, className?: string) => {
    let query = supabase.from('students')
        .select('name, class_name, roll_number, father_name, mother_name, dob, users!parent_user_id(name, mobile, address)')
        .eq('school_id', schoolId)
        .order('class_name');

    if(className) query = query.eq('class_name', className);
    const { data } = await query;
    return data || [];
};

export const downloadStudentDirectory = async (schoolId: string, className?: string) => {
    try {
        const data = await fetchStudentData(schoolId, className);
        const summary = [
            { label: 'Students', value: data.length },
            { label: 'Classes', value: new Set(data.map((d:any) => d.class_name)).size }
        ];
        const rows = data.map((r: any) => [
            r.name, r.class_name, r.roll_number || '-', r.dob ? new Date(r.dob).toLocaleDateString() : '-', r.users?.name || r.father_name || 'N/A', r.mother_name || '-', r.users?.mobile || '-', r.users?.address || '-'
        ]);
        generatePDF({
            title: "Student Directory",
            subTitle: className ? `Class ${className}` : "All Classes",
            summary,
            headers: ["Name", "Class", "Roll", "DOB", "Father", "Mother", "Mobile", "Address"],
            data: rows,
            orientation: 'l'
        });
        return true;
    } catch(e) { return false; }
};

export const downloadStudentDirectoryExcel = async (schoolId: string, className?: string) => {
    try {
        const data = await fetchStudentData(schoolId, className);
        const excelData = data.map((r: any, index: number) => ({
            "S.No": index + 1,
            "Student Name": r.name,
            "Class": r.class_name,
            "Roll No": r.roll_number || '-',
            "DOB": r.dob || '-',
            "Father Name": r.users?.name || r.father_name || '-',
            "Mother Name": r.mother_name || '-',
            "Parent Mobile": r.users?.mobile || '-',
            "Address/Village": r.users?.address || '-'
        }));
        exportToExcel(excelData, "Student_Directory_Full");
        return true;
    } catch(e) { return false; }
};

// 5. EXAM RESULTS (NEW - Excel Only mainly)
export const downloadExamResultsExcel = async (schoolId: string, className?: string, startDate?: string, endDate?: string) => {
    try {
        // Fetch Exam Records
        let query = supabase.from('exam_records')
            .select('id, exam_title, class_name, subject, total_marks, exam_date')
            .eq('school_id', schoolId)
            .order('exam_date', { ascending: false });

        if (className) query = query.eq('class_name', className);
        if (startDate) query = query.gte('exam_date', startDate);
        if (endDate) query = query.lte('exam_date', endDate);

        const { data: records, error } = await query;
        if (error || !records || records.length === 0) return false;

        const recordIds = records.map(r => r.id);

        // Fetch Marks
        const { data: marks } = await supabase.from('exam_marks')
            .select('record_id, student_name, obtained_marks, grade, is_absent, students(roll_number, father_name)')
            .in('record_id', recordIds);

        if (!marks) return false;

        // Merge Data
        const excelData = marks.map((m: any) => {
            const exam = records.find(r => r.id === m.record_id);
            return {
                "Exam Date": exam?.exam_date,
                "Exam Name": exam?.exam_title,
                "Class": exam?.class_name,
                "Subject": exam?.subject,
                "Student Name": m.student_name,
                "Roll No": m.students?.roll_number || '-',
                "Father Name": m.students?.father_name || '-',
                "Total Marks": exam?.total_marks,
                "Obtained Marks": m.is_absent ? 'Absent' : m.obtained_marks,
                "Grade": m.grade,
                "Status": m.is_absent ? 'Absent' : 'Present'
            };
        });

        // Sort by Date then Class then Name
        excelData.sort((a: any, b: any) => new Date(b["Exam Date"]).getTime() - new Date(a["Exam Date"]).getTime() || a["Class"].localeCompare(b["Class"]) || a["Student Name"].localeCompare(b["Student Name"]));

        exportToExcel(excelData, "Exam_Results_Full");
        return true;
    } catch(e) { return false; }
};

// Parent Reports (Existing)
export const downloadStudentReport = async (schoolId: string, studentId: string, studentName: string, startDate?: string, endDate?: string) => {
    try {
        const { data: st } = await supabase.from('students').select('class_name, roll_number, father_name, mother_name, dob, users!parent_user_id(name, mobile)').eq('id', studentId).single();
        const className = st?.class_name || 'Unknown';
        const fatherName = st?.father_name || st?.users?.name || 'N/A';
        const studentProfile = { father: fatherName, mother: st?.mother_name || 'N/A', dob: st?.dob ? new Date(st.dob).toLocaleDateString() : 'N/A', mobile: st?.users?.mobile || 'N/A' };

        let examQuery = supabase.from('exam_marks').select('obtained_marks, grade, is_absent, exam_records!inner(exam_title, subject, total_marks, exam_date)').eq('student_id', studentId).order('created_at', { ascending: false });
        const { data: exams } = await examQuery;
        
        let examList = exams || [];
        if (startDate && endDate) examList = examList.filter((e: any) => { const d = e.exam_records?.exam_date; return d >= startDate && d <= endDate; });

        const rows: any[] = [];
        examList.forEach((e: any) => {
            rows.push([e.exam_records?.exam_date || '-', `EXAM: ${e.exam_records?.exam_title}`, `${e.exam_records?.subject}: ${e.is_absent ? "ABS" : e.obtained_marks}/${e.exam_records?.total_marks} (${e.grade})`]);
        });

        let hwQuery = supabase.from('daily_periods').select('date, subject, homework').eq('school_id', schoolId).eq('class_name', className).order('date', { ascending: false });
        if (startDate) hwQuery = hwQuery.gte('date', startDate);
        if (endDate) hwQuery = hwQuery.lte('date', endDate);
        else hwQuery = hwQuery.gte('date', getPastDate(7));
        const { data: hw } = await hwQuery;
        (hw || []).forEach((h: any) => { rows.push([h.date, `HOMEWORK: ${h.subject}`, h.homework ? h.homework.substring(0, 60) : 'Task Assigned']); });

        generatePDF({ title: "STUDENT PROGRESS CARD", subTitle: `${studentName} | Class: ${className}`, summary: [{ label: 'Exams', value: examList.length, color: '#8b5cf6' }], headers: ["Date", "Category", "Details"], data: rows, studentDetails: studentProfile });
        return true;
    } catch(e) { return false; }
};

export const downloadStudentAttendanceReport = async (studentId: string, studentName: string, startDate?: string, endDate?: string) => {
    try {
        const { data: st } = await supabase.from('students').select('class_name, father_name, mother_name, dob, users!parent_user_id(name, mobile)').eq('id', studentId).single();
        const studentProfile = { father: st?.father_name || st?.users?.name || 'N/A', mother: st?.mother_name || 'N/A', dob: st?.dob || 'N/A', mobile: st?.users?.mobile || 'N/A' };

        let query = supabase.from('attendance').select('date, status').eq('student_id', studentId).order('date', { ascending: false });
        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        else query = query.gte('date', getPastDate(30));

        const { data: att } = await query;
        const attList = att || [];
        const summary = [{ label: 'Present', value: attList.filter((a:any) => a.status === 'present').length, color: '#10b981' }, { label: 'Absent', value: attList.filter((a:any) => a.status === 'absent').length, color: '#ef4444' }];
        const rows = attList.map((a: any) => [new Date(a.date).toLocaleDateString(), new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' }), a.status.toUpperCase()]);

        generatePDF({ title: "ATTENDANCE REPORT", subTitle: `${studentName}`, summary, headers: ["Date", "Day", "Status"], data: rows, studentDetails: studentProfile });
        return true;
    } catch(e) { return false; }
};
