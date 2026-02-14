
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Role, FullHistory } from '../types';

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
    schoolName?: string;
    principalName?: string;
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
    const doc = new jsPDF({
        orientation: config.orientation || 'p',
        unit: 'mm',
        format: 'a4'
    });

    const { title, subTitle, summary, headers, data, studentDetails, schoolName, principalName } = config;
    const pageWidth = doc.internal.pageSize.width;

    // Header Section
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, pageWidth, 50, 'F'); // Increased height for branding
    
    doc.setTextColor(255, 255, 255);
    
    let currentY = 15;

    // School Branding (If Provided)
    if (schoolName) {
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(schoolName.toUpperCase(), 14, currentY);
        currentY += 7;

        if (principalName) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Principal: ${principalName}`, 14, currentY);
            currentY += 8;
        } else {
            currentY += 5;
        }
    } else {
        currentY = 15;
    }

    // Report Title
    doc.setFontSize(schoolName ? 14 : 18);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 14, currentY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subTitle, 14, currentY + 6);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 50, 15);

    if (studentDetails) {
        const detailY = currentY + 14;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Father: ${studentDetails.father}`, 14, detailY);
        doc.text(`Mother: ${studentDetails.mother}`, 80, detailY);
        doc.text(`DOB: ${studentDetails.dob}`, 140, detailY);
        doc.text(`Contact: ${studentDetails.mobile}`, 14, detailY + 6);
    }

    // Graphical Summary
    let startY = 60;
    const boxWidth = 45;
    const boxHeight = 25;
    const gap = 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Executive Summary", 14, startY - 2);

    summary.forEach((item, index) => {
        const x = 14 + (index * (boxWidth + gap));
        if (x + boxWidth < pageWidth) {
            doc.setFillColor(245, 247, 250);
            doc.setDrawColor(220, 220, 220);
            doc.roundedRect(x, startY, boxWidth, boxHeight, 3, 3, 'FD');

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(item.color || "#10b981");
            doc.text(String(item.value), x + boxWidth / 2, startY + 10, { align: 'center' });

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100, 116, 139);
            doc.text(item.label.toUpperCase(), x + boxWidth / 2, startY + 18, { align: 'center' });
        }
    });

    // Table
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

export const downloadPrincipalAttendance = async (schoolId: string, schoolName: string, principalName: string, className?: string, startDate?: string, endDate?: string) => {
    try {
        let query = supabase.from('attendance')
            .select('date, status, students(name, class_name, roll_number, father_name)')
            .eq('school_id', schoolId)
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        else query = query.gte('date', getPastDate(60));

        const { data, error } = await query;
        if(error || !data) throw new Error("Fetch failed");
        
        const filtered = className ? data.filter((d: any) => d.students?.class_name === className) : data;
        
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
            schoolName,
            principalName,
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
        let query = supabase.from('attendance')
            .select('date, status, students(name, class_name, roll_number, father_name)')
            .eq('school_id', schoolId)
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data } = await query;
        if (!data) return false;
        
        const filtered = className ? data.filter((d: any) => d.students?.class_name === className) : data;

        const excelData = filtered.map((r: any, index: number) => ({
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

export const downloadPortalHistory = async (schoolId: string, schoolName: string, principalName: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        let query = supabase.from('daily_periods')
            .select('date, period_number, class_name, subject, homework, homework_type, lesson, users(name, mobile)')
            .eq('school_id', schoolId)
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if(role === 'teacher') query = query.eq('teacher_user_id', userId);

        const { data } = await query;
        if(!data) throw new Error("No data");

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
            schoolName,
            principalName: role === 'principal' ? principalName : undefined, // Only show principal name if principal is downloading
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
        let query = supabase.from('daily_periods')
            .select('date, period_number, class_name, subject, homework, homework_type, lesson, users(name, mobile)')
            .eq('school_id', schoolId)
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if(role === 'teacher') query = query.eq('teacher_user_id', userId);

        const { data } = await query;
        if(!data) return false;

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

export const downloadLeaveReport = async (schoolId: string, schoolName: string, principalName: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        let staffQuery = supabase.from('staff_leaves')
            .select('leave_type, start_date, end_date, status, reason, principal_comment, users(name, mobile)')
            .eq('school_id', schoolId);

        if (startDate) staffQuery = staffQuery.gte('created_at', startDate);
        if (endDate) staffQuery = staffQuery.lte('created_at', endDate);
        if(role === 'teacher') staffQuery = staffQuery.eq('user_id', userId);

        const { data: leaves } = await staffQuery;
        if(!leaves) return false;

        const summary = [
            { label: 'Total', value: leaves.length },
            { label: 'Approved', value: leaves.filter((l:any) => l.status === 'approved').length, color: '#10b981' }
        ];
        const rows = leaves.map((r: any) => [
            r.users?.name || 'Staff', r.users?.mobile || '-', r.leave_type, `${r.start_date} to ${r.end_date}`, r.status.toUpperCase()
        ]);
        generatePDF({
            schoolName,
            principalName: role === 'principal' ? principalName : undefined,
            title: "Staff Leave Report",
            subTitle: `${startDate} to ${endDate}`,
            summary,
            headers: ["Staff Name", "Mobile", "Type", "Duration", "Status"],
            data: rows
        });
        return true;
    } catch(e) { return false; }
};

export const downloadLeaveReportExcel = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        let staffQuery = supabase.from('staff_leaves')
            .select('leave_type, start_date, end_date, status, reason, principal_comment, users(name, mobile)')
            .eq('school_id', schoolId);

        if (startDate) staffQuery = staffQuery.gte('created_at', startDate);
        if (endDate) staffQuery = staffQuery.lte('created_at', endDate);
        if(role === 'teacher') staffQuery = staffQuery.eq('user_id', userId);

        const { data: leaves } = await staffQuery;
        if(!leaves) return false;

        const excelData = leaves.map((r: any, index: number) => ({
            "S.No": index + 1,
            "Staff Name": r.users?.name || 'Staff',
            "Mobile": r.users?.mobile || '-',
            "Leave Type": r.leave_type,
            "Start Date": r.start_date,
            "End Date": r.end_date,
            "Status": r.status.toUpperCase(),
            "Reason": r.reason,
            "Principal Comment": r.principal_comment || '-'
        }));
        exportToExcel(excelData, "Staff_Leave_Data");
        return true;
    } catch(e) { return false; }
};

export const downloadStudentDirectory = async (schoolId: string, schoolName: string, principalName: string, className?: string) => {
    try {
        let query = supabase.from('students')
            .select('name, class_name, section, roll_number, father_name, mother_name, dob, users(mobile, address)')
            .eq('school_id', schoolId)
            .order('class_name', { ascending: true });
        
        if (className) query = query.eq('class_name', className);
        
        const { data, error } = await query;
        if(error || !data) return false;

        const summary = [
            { label: 'Total Students', value: data.length },
            { label: 'Classes', value: new Set(data.map((s:any) => s.class_name)).size, color: '#8b5cf6' }
        ];
        const rows = data.map((s: any) => [
            s.name, s.class_name, s.father_name, s.users?.mobile || '-', s.users?.address || '-'
        ]);
        generatePDF({
            schoolName,
            principalName,
            title: "Student Directory",
            subTitle: className ? `Class: ${className}` : "All Classes",
            summary,
            headers: ["Name", "Class", "Father Name", "Contact", "Address"],
            data: rows
        });
        return true;
    } catch(e) { return false; }
};

export const downloadStudentDirectoryExcel = async (schoolId: string, className?: string) => {
    try {
        let query = supabase.from('students')
            .select('name, class_name, section, roll_number, father_name, mother_name, dob, users(mobile, address)')
            .eq('school_id', schoolId)
            .order('class_name', { ascending: true });
        
        if (className) query = query.eq('class_name', className);
        
        const { data, error } = await query;
        if(error || !data) return false;

        const excelData = data.map((s: any, index: number) => ({
            "S.No": index + 1,
            "Student Name": s.name,
            "Class": s.class_name,
            "Section": s.section || '-',
            "Roll No": s.roll_number || '-',
            "Father Name": s.father_name || '-',
            "Mother Name": s.mother_name || '-',
            "DOB": s.dob || '-',
            "Contact Mobile": s.users?.mobile || '-',
            "Address": s.users?.address || '-'
        }));
        exportToExcel(excelData, "Student_Directory");
        return true;
    } catch(e) { return false; }
};

export const downloadExamResultsExcel = async (schoolId: string, className?: string, startDate?: string, endDate?: string, recordId?: string) => {
    try {
        let query = supabase.from('exam_marks')
            .select(`
                student_name, 
                obtained_marks, 
                grade, 
                is_absent, 
                exam_records!inner(title:exam_title, subject, class_name, date:exam_date, max:total_marks, school_id)
            `)
            .eq('exam_records.school_id', schoolId);

        if (recordId) {
            query = query.eq('record_id', recordId);
        } else {
            if (className) query = query.eq('exam_records.class_name', className);
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) return false;

        const excelData = data.map((r: any, index: number) => ({
            "S.No": index + 1,
            "Student Name": r.student_name,
            "Class": r.exam_records?.class_name,
            "Exam Title": r.exam_records?.title,
            "Subject": r.exam_records?.subject,
            "Date": r.exam_records?.date,
            "Max Marks": r.exam_records?.max,
            "Obtained": r.is_absent ? 'ABSENT' : r.obtained_marks,
            "Grade": r.grade
        }));

        exportToExcel(excelData, recordId ? `Result_${data[0]?.exam_records?.subject}` : "All_Exam_Results");
        return true;
    } catch(e) { return false; }
};

// 6. SINGLE STUDENT REPORT (PDF) - BASIC
export const downloadStudentReport = async (schoolId: string, studentId: string, studentName: string, startDate?: string, endDate?: string) => {
    try {
        const { data: student } = await supabase.from('students').select('father_name, mother_name, dob, class_name, users(mobile)').eq('id', studentId).single();
        if(!student) return false;

        const { data: att } = await supabase.from('attendance').select('status').eq('student_id', studentId);
        const present = att?.filter((a:any) => a.status === 'present').length || 0;
        const totalAtt = att?.length || 0;
        const attPercentage = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0;

        const { data: exams } = await supabase.from('exam_marks').select('obtained_marks, grade, is_absent, exam_records(exam_title, subject, total_marks, exam_date)').eq('student_id', studentId).order('created_at', { ascending: false });
        
        const summary = [
            { label: 'Attendance', value: `${attPercentage}%`, color: attPercentage < 75 ? '#ef4444' : '#10b981' },
            { label: 'Exams Taken', value: exams?.length || 0 },
            { label: 'Average Grade', value: 'B+' } 
        ];

        const examRows = (exams || []).map((e: any) => [
            e.exam_records?.exam_date,
            e.exam_records?.exam_title,
            e.exam_records?.subject,
            `${e.is_absent ? 'ABS' : e.obtained_marks} / ${e.exam_records?.total_marks}`,
            e.grade
        ]);

        generatePDF({
            title: `PROGRESS REPORT: ${studentName}`,
            subTitle: `Class: ${student.class_name} | Session 2024-25`,
            summary,
            headers: ["Date", "Exam Type", "Subject", "Marks", "Grade"],
            data: examRows,
            studentDetails: {
                father: student.father_name || '-',
                mother: student.mother_name || '-',
                dob: student.dob || '-',
                mobile: student.users?.mobile || '-'
            }
        });
        return true;
    } catch(e) { return false; }
};

export const downloadStudentAttendanceReport = async (studentId: string, studentName: string, startDate?: string, endDate?: string) => {
    try {
        let query = supabase.from('attendance')
            .select('date, status')
            .eq('student_id', studentId)
            .order('date', { ascending: false });
        
        if(startDate) query = query.gte('date', startDate);
        if(endDate) query = query.lte('date', endDate);

        const { data, error } = await query;
        if(error || !data) return false;

        const summary = [
            { label: 'Total Days', value: data.length },
            { label: 'Present', value: data.filter((d:any) => d.status === 'present').length, color: '#10b981' },
            { label: 'Absent', value: data.filter((d:any) => d.status === 'absent').length, color: '#ef4444' }
        ];

        const rows = data.map((r: any) => [
            r.date, new Date(r.date).toLocaleDateString('en-US', { weekday: 'long' }), r.status.toUpperCase()
        ]);

        generatePDF({
            title: `ATTENDANCE LOG: ${studentName}`,
            subTitle: `${startDate} to ${endDate}`,
            summary,
            headers: ["Date", "Day", "Status"],
            data: rows
        });
        return true;
    } catch(e) { return false; }
};

// --- NEW: 360 DEGREE PROFILE REPORT (ROBUST) ---
export const generate360Report = (history: FullHistory, schoolName: string, principalName: string, dateRange: string) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const width = doc.internal.pageSize.width;

    // --- PAGE 1: OVERVIEW ---
    
    // Header Bar
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(0, 0, width, 50, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    
    // School Name (Top Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(schoolName.toUpperCase(), 20, 20);
    
    // Principal Name (Below School Name)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Principal: ${principalName}`, 20, 28);
    
    // Report Title (Right Aligned)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(history.profile.role.toUpperCase() + " HISTORY", width - 20, 20, { align: 'right' });
    
    // Period (Below Title)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${dateRange}`, width - 20, 28, { align: 'right' });

    // Profile Box
    const startY = 60;
    doc.setDrawColor(220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, startY, width - 30, 60, 3, 3, 'FD');

    // Avatar Placeholder (Fallback Icon)
    doc.setFillColor(220, 220, 220);
    doc.circle(35, startY + 30, 15, 'F');
    doc.setTextColor(100);
    doc.setFontSize(16);
    doc.text(history.profile.name.charAt(0), 35, startY + 32, { align: 'center' });

    // Details Text
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(history.profile.name, 60, startY + 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    
    const details = [
        `ID: ${history.profile.id.substring(0, 8).toUpperCase()}`,
        `Role: ${history.profile.role}`,
        `Mobile: ${history.profile.mobile || 'N/A'}`,
        `Class: ${history.profile.class_name || 'N/A'}`,
        `Father: ${history.profile.father_name || 'N/A'}`,
        `Mother: ${history.profile.mother_name || 'N/A'}`,
        `DOB: ${history.profile.dob || 'N/A'}`,
        `Address: ${history.profile.address || 'N/A'}`
    ];

    let dy = 25;
    let dx = 60;
    details.forEach((line, i) => {
        if (i === 4) { dy = 25; dx = 130; } // New column
        doc.text(line, dx, startY + dy);
        dy += 6;
    });

    // Stats Grid
    const statY = startY + 70;
    const statW = (width - 40) / 4;
    const stats = [
        { label: "Attendance", value: `${history.stats.attendance_rate}%`, color: [16, 185, 129] },
        { label: "Leaves", value: history.stats.leaves_taken, color: [245, 158, 11] },
        { label: "Tasks/Acts", value: history.stats.tasks_completed, color: [59, 130, 246] },
        { label: "Performance", value: history.stats.performance_avg || "N/A", color: [139, 92, 246] }
    ];

    stats.forEach((s, i) => {
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.rect(20 + (i * statW), statY, statW - 5, 25, 'F');
        doc.setTextColor(255);
        doc.setFontSize(12);
        doc.text(String(s.value), 20 + (i * statW) + (statW - 5)/2, statY + 10, { align: 'center' });
        doc.setFontSize(7);
        doc.text(s.label.toUpperCase(), 20 + (i * statW) + (statW - 5)/2, statY + 18, { align: 'center' });
    });

    // --- PAGE 2: DETAILED TABLES ---
    doc.addPage();
    let currentY = 20;

    // 1. Attendance Log
    if (history.attendance_log.length > 0) {
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text("ATTENDANCE LOG (Recent 30 Days)", 14, currentY);
        currentY += 5;
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Status']],
            body: history.attendance_log.slice(0, 30).map(a => [a.date, a.status.toUpperCase()]),
            theme: 'striped',
            headStyles: { fillColor: [100, 116, 139] },
            styles: { fontSize: 8 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 2. Exam Log (Students)
    if (history.profile.role === 'Student' && history.exam_log.length > 0) {
        doc.text("EXAM PERFORMANCE", 14, currentY);
        currentY += 5;
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Title', 'Subject', 'Marks']],
            body: history.exam_log.map(e => [e.date, e.title, e.subject, e.marks]),
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] },
            styles: { fontSize: 8 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 3. Activity/Homework Log
    if (history.activity_log.length > 0) {
        doc.text(history.profile.role === 'Student' ? "HOMEWORK SUBMISSIONS" : "WORK ACTIVITY LOG", 14, currentY);
        currentY += 5;
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Title', 'Details']],
            body: history.activity_log.map(a => [a.date, a.title, a.detail]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 4. Leave History
    if (history.leave_log.length > 0) {
        doc.text("LEAVE HISTORY", 14, currentY);
        currentY += 5;
        autoTable(doc, {
            startY: currentY,
            head: [['Type', 'Duration', 'Reason', 'Status']],
            body: history.leave_log.map(l => [l.type, l.dates, l.reason, l.status.toUpperCase()]),
            theme: 'plain',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 8 }
        });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated by VidyaSetu AI - Page ${i} of ${pageCount}`, width / 2, 290, { align: 'center' });
    }

    doc.save(`${history.profile.name}_360_Report.pdf`);
};
