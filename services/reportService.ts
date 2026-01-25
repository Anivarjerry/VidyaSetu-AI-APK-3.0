
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Role } from '../types';

// Helper to get Past Date
const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
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

// 1. PRINCIPAL: Attendance (Date Range)
export const downloadPrincipalAttendance = async (schoolId: string, className?: string, startDate?: string, endDate?: string) => {
    try {
        let query = supabase.from('attendance')
            .select('date, status, students(name, class_name, roll_number)')
            .eq('school_id', schoolId)
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        else query = query.gte('date', getPastDate(60)); // Fallback if not provided, though UI should provide it

        const { data, error } = await query;
        if(error || !data) throw new Error("Fetch failed");

        // Filter by class in JS if needed
        const filtered = className ? data.filter((d: any) => d.students?.class_name === className) : data;

        const summary = [
            { label: 'Records', value: filtered.length },
            { label: 'Present', value: filtered.filter((r:any) => r.status === 'present').length, color: '#10b981' },
            { label: 'Absent', value: filtered.filter((r:any) => r.status === 'absent').length, color: '#ef4444' },
            { label: 'Leaves', value: filtered.filter((r:any) => r.status === 'leave').length, color: '#f59e0b' }
        ];

        const rows = filtered.map((r: any) => [
            r.date,
            r.students?.name || 'Unknown',
            r.students?.roll_number || '-',
            r.students?.class_name || 'N/A',
            r.status.toUpperCase()
        ]);

        generatePDF({
            title: "Student Attendance History",
            subTitle: `${startDate && endDate ? `${startDate} to ${endDate}` : 'Last 60 Days'} Record ${className ? `- Class ${className}` : ''}`,
            summary,
            headers: ["Date", "Student Name", "Roll No", "Class", "Status"],
            data: rows
        });
        return true;
    } catch(e) { console.error(e); return false; }
};

// 2. PRINCIPAL & TEACHER: Portal Submissions (Date Range)
export const downloadPortalHistory = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        let query = supabase.from('daily_periods')
            .select('date, period_number, class_name, subject, homework, users(name, mobile)')
            .eq('school_id', schoolId)
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        else query = query.gte('date', getPastDate(60));

        if(role === 'teacher') {
            query = query.eq('teacher_user_id', userId);
        }

        const { data, error } = await query;
        if(error || !data) throw new Error("Fetch failed");

        const summary = [
            { label: 'Total Periods', value: data.length },
            { label: 'Subjects', value: new Set(data.map((d:any) => d.subject)).size, color: '#3b82f6' },
            { label: 'Classes', value: new Set(data.map((d:any) => d.class_name)).size, color: '#8b5cf6' }
        ];

        const rows = data.map((r: any) => [
            r.date,
            `${r.users?.name || 'Teacher'} (${r.users?.mobile || '-'})`,
            `Period ${r.period_number}`,
            `${r.class_name} - ${r.subject}`,
            (r.homework || '').substring(0, 50) + (r.homework?.length > 50 ? '...' : '')
        ]);

        generatePDF({
            title: role === 'teacher' ? "My Submission Report" : "Teacher Activity Report",
            subTitle: `${startDate && endDate ? `${startDate} to ${endDate}` : 'Last 60 Days'} - Portal Updates`,
            summary,
            headers: ["Date", "Teacher", "Period", "Class/Subject", "Homework Snippet"],
            data: rows,
            orientation: 'l' // Landscape for better text fit
        });
        return true;
    } catch(e) { console.error(e); return false; }
};

// 3. LEAVE REPORT (Date Range)
export const downloadLeaveReport = async (schoolId: string, role: Role, userId: string, startDate?: string, endDate?: string) => {
    try {
        let staffQuery = supabase.from('staff_leaves')
            .select('leave_type, start_date, end_date, status, reason, users(name, mobile)')
            .eq('school_id', schoolId);

        if (startDate) staffQuery = staffQuery.gte('created_at', startDate);
        if (endDate) staffQuery = staffQuery.lte('created_at', endDate);
        else staffQuery = staffQuery.gte('created_at', getPastDate(30));

        if(role === 'teacher') staffQuery = staffQuery.eq('user_id', userId);

        const { data: staffData } = await staffQuery;
        const leaves = staffData || [];

        const summary = [
            { label: 'Total Requests', value: leaves.length },
            { label: 'Approved', value: leaves.filter((l:any) => l.status === 'approved').length, color: '#10b981' },
            { label: 'Pending', value: leaves.filter((l:any) => l.status === 'pending').length, color: '#f59e0b' }
        ];

        const rows = leaves.map((r: any) => [
            r.users?.name || 'Staff',
            r.users?.mobile || '-',
            r.leave_type,
            `${r.start_date} to ${r.end_date}`,
            r.reason,
            r.status.toUpperCase()
        ]);

        generatePDF({
            title: role === 'teacher' ? "My Leave History" : "Staff Leave Report",
            subTitle: startDate && endDate ? `${startDate} to ${endDate}` : "Last 30 Days",
            summary,
            headers: ["Name", "Contact", "Type", "Duration", "Reason", "Status"],
            data: rows
        });
        return true;
    } catch(e) { return false; }
};

// 4. PRINCIPAL: Student Directory (Detailed) - No Date needed usually, snapshot
export const downloadStudentDirectory = async (schoolId: string, className?: string) => {
    try {
        // Fetch detailed info including Linked Parent details
        let query = supabase.from('students')
            .select('name, class_name, roll_number, father_name, mother_name, dob, users!parent_user_id(name, mobile, address)')
            .eq('school_id', schoolId)
            .order('class_name');

        if(className) query = query.eq('class_name', className);

        const { data, error } = await query;
        if(error || !data) throw new Error("Fetch failed");

        const summary = [
            { label: 'Total Students', value: data.length },
            { label: 'Classes', value: new Set(data.map((d:any) => d.class_name)).size },
            { label: 'Linked Parents', value: data.filter((d:any) => d.users?.mobile).length, color: '#3b82f6' }
        ];

        // Robust mapping of fields
        const rows = data.map((r: any) => {
            const parentName = r.users?.name || r.father_name || 'N/A';
            const parentMobile = r.users?.mobile || 'Not Linked';
            const parentAddress = r.users?.address || 'N/A';
            const dob = r.dob ? new Date(r.dob).toLocaleDateString() : '-';

            return [
                r.name,
                r.class_name,
                r.roll_number || '-',
                dob,
                parentName, // Father/Guardian Name
                r.mother_name || '-',
                parentMobile,
                parentAddress
            ];
        });

        generatePDF({
            title: "Student Master Directory",
            subTitle: className ? `Class ${className} Official Record` : "All Classes Official Record",
            summary,
            headers: ["Student Name", "Class", "Roll", "DOB", "Father/Guardian", "Mother Name", "Mobile", "Village/Address"],
            data: rows,
            orientation: 'l' // Landscape is crucial here for many columns
        });
        return true;
    } catch(e) { return false; }
};

// 5. PARENT: Child Report (Corrected Exam Fetch & Profile & Date Range)
export const downloadStudentReport = async (schoolId: string, studentId: string, studentName: string, startDate?: string, endDate?: string) => {
    try {
        // 1. Fetch Student Details
        const { data: st } = await supabase.from('students')
            .select('class_name, roll_number, father_name, mother_name, dob, users!parent_user_id(name, mobile)')
            .eq('id', studentId)
            .single();
        
        const className = st?.class_name || 'Unknown Class';
        
        const fatherName = st?.father_name || st?.users?.name || 'N/A';

        const studentProfile = {
            father: fatherName,
            mother: st?.mother_name || 'N/A',
            dob: st?.dob ? new Date(st.dob).toLocaleDateString() : 'N/A',
            mobile: st?.users?.mobile || 'N/A'
        };

        // 2. Fetch Exam Results
        let examQuery = supabase.from('exam_marks')
            .select('obtained_marks, grade, is_absent, exam_records!inner(exam_title, subject, total_marks, exam_date)')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (startDate && endDate) {
             // Filter exams by date if possible, but exam_marks doesn't have date, parent record does.
             // Supabase join filtering is tricky. We'll filter in JS for simplicity or assume exam_date in record is sufficient
             // Doing client side filtering for date on joined table:
        }

        const { data: exams, error: examError } = await examQuery;

        if (examError) console.error("Exam Fetch Error", examError);

        let examList = exams || [];
        if (startDate && endDate) {
            examList = examList.filter((e: any) => {
                const d = e.exam_records?.exam_date;
                return d >= startDate && d <= endDate;
            });
        }

        const summary = [
            { label: 'Exams Taken', value: examList.length, color: '#8b5cf6' },
            { label: 'Avg Grade', value: examList.length > 0 ? examList[0].grade : '-', color: '#3b82f6' }
        ];

        const rows: any[] = [];
        
        // Add Exams
        examList.forEach((e: any) => {
            const marksStr = e.is_absent ? "ABSENT" : `${e.obtained_marks}/${e.exam_records?.total_marks}`;
            rows.push([
                e.exam_records?.exam_date || '-',
                `EXAM: ${e.exam_records?.exam_title || 'Test'}`,
                `${e.exam_records?.subject}: ${marksStr} (Grade: ${e.grade})`
            ]);
        });

        // Add Homework Summary
        let hwQuery = supabase.from('daily_periods')
            .select('date, subject, homework')
            .eq('school_id', schoolId)
            .eq('class_name', className)
            .order('date', { ascending: false });

        if (startDate) hwQuery = hwQuery.gte('date', startDate);
        if (endDate) hwQuery = hwQuery.lte('date', endDate);
        else hwQuery = hwQuery.gte('date', getPastDate(7));

        const { data: hw } = await hwQuery;
        
        (hw || []).forEach((h: any) => {
             rows.push([h.date, `HOMEWORK: ${h.subject}`, h.homework ? h.homework.substring(0, 60) : 'Task Assigned']);
        });

        generatePDF({
            title: "STUDENT PROGRESS CARD",
            subTitle: `${studentName} | Class: ${className} | ${startDate && endDate ? `${startDate} to ${endDate}` : 'Recent Report'}`,
            summary,
            headers: ["Date", "Category", "Details / Performance"],
            data: rows,
            studentDetails: studentProfile
        });
        return true;
    } catch(e) { console.error(e); return false; }
};

// 6. PARENT: Specific Attendance Report (Date Range)
export const downloadStudentAttendanceReport = async (studentId: string, studentName: string, startDate?: string, endDate?: string) => {
    try {
        const { data: st } = await supabase.from('students')
            .select('class_name, father_name, mother_name, dob, users!parent_user_id(name, mobile)')
            .eq('id', studentId)
            .single();

        const fatherName = st?.father_name || st?.users?.name || 'N/A';
        const studentProfile = {
            father: fatherName,
            mother: st?.mother_name || 'N/A',
            dob: st?.dob ? new Date(st.dob).toLocaleDateString() : 'N/A',
            mobile: st?.users?.mobile || 'N/A'
        };

        let query = supabase.from('attendance')
            .select('date, status')
            .eq('student_id', studentId)
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        else query = query.gte('date', getPastDate(30));

        const { data: att } = await query;

        const attList = att || [];
        
        const summary = [
            { label: 'Present', value: attList.filter((a:any) => a.status === 'present').length, color: '#10b981' },
            { label: 'Absent', value: attList.filter((a:any) => a.status === 'absent').length, color: '#ef4444' },
            { label: 'Total Days', value: attList.length }
        ];

        const rows = attList.map((a: any) => [
            new Date(a.date).toLocaleDateString(),
            new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' }),
            a.status.toUpperCase()
        ]);

        generatePDF({
            title: "ATTENDANCE REPORT",
            subTitle: `${studentName} - ${startDate && endDate ? `${startDate} to ${endDate}` : 'Last 30 Days'}`,
            summary,
            headers: ["Date", "Day", "Status"],
            data: rows,
            studentDetails: studentProfile 
        });
        return true;
    } catch(e) { console.error(e); return false; }
};
