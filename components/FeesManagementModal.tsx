import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ClassFeeStructure, StudentFeeProfile, FeeTransaction, SearchPerson } from '../types';
import { fetchClassFeeStructures, saveClassFeeStructure, fetchStudentFeeProfiles, saveStudentFeeProfile, fetchFeeTransactions, addFeeTransaction } from '../services/feeService';
import { fetchSchoolClasses, searchPeople, fetchRecentPeople } from '../services/dashboardService';
import { Loader2, IndianRupee, Search, Plus, Save, ArrowLeft, Download, MessageCircle, FileText, CheckCircle2, TrendingUp, TrendingDown, Users } from 'lucide-react';

interface FeesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
}

export const FeesManagementModal: React.FC<FeesManagementModalProps> = ({ isOpen, onClose, schoolId }) => {
  const [view, setView] = useState<'menu' | 'overview' | 'setup' | 'collection'>('menu');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [classes, setClasses] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<ClassFeeStructure[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentFeeProfile[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  
  // Setup View States
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [tuitionFee, setTuitionFee] = useState(0);
  const [transportFee, setTransportFee] = useState(0);
  const [otherFee, setOtherFee] = useState(0);
  const academicYear = "2024-25"; // Hardcoded for now, could be dynamic

  // Collection View States
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<SearchPerson[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<SearchPerson | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [usesTransport, setUsesTransport] = useState(false);

  useEffect(() => {
    if (isOpen && schoolId) {
      loadInitialData();
    }
  }, [isOpen, schoolId]);

  const loadInitialData = async () => {
    setLoading(true);
    const [cls, structures, profiles, trans] = await Promise.all([
      fetchSchoolClasses(schoolId),
      fetchClassFeeStructures(schoolId, academicYear),
      fetchStudentFeeProfiles(schoolId),
      fetchFeeTransactions(schoolId)
    ]);
    setClasses(cls);
    setFeeStructures(structures);
    setStudentProfiles(profiles);
    setTransactions(trans);
    setLoading(false);
  };

  useEffect(() => {
    if (view === 'collection') {
      const delayDebounceFn = setTimeout(async () => {
        if (searchTerm.length >= 2) {
          const results = await searchPeople(schoolId, searchTerm, 'student');
          setStudents(results);
        } else if (searchTerm.length === 0) {
          const recent = await fetchRecentPeople(schoolId, 'student');
          setStudents(recent);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchTerm, view, schoolId]);

  const handleSaveStructure = async () => {
    if (!selectedClass) return alert('Please select a class');
    setSubmitting(true);
    const success = await saveClassFeeStructure({
      school_id: schoolId,
      class_name: selectedClass,
      academic_year: academicYear,
      tuition_fee: tuitionFee,
      transport_fee: transportFee,
      other_fee: otherFee
    });
    if (success) {
      alert('Fee structure saved successfully!');
      loadInitialData();
    } else {
      alert('Failed to save fee structure.');
    }
    setSubmitting(false);
  };

  const handleSelectClassForSetup = (className: string) => {
    setSelectedClass(className);
    const existing = feeStructures.find(f => f.class_name === className);
    if (existing) {
      setTuitionFee(existing.tuition_fee);
      setTransportFee(existing.transport_fee);
      setOtherFee(existing.other_fee);
    } else {
      setTuitionFee(0);
      setTransportFee(0);
      setOtherFee(0);
    }
  };

  const handleSelectStudent = (student: SearchPerson) => {
    setSelectedStudent(student);
    const profile = studentProfiles.find(p => p.student_id === student.id);
    if (profile) {
      setDiscountAmount(profile.discount_amount);
      setUsesTransport(profile.uses_transport);
    } else {
      setDiscountAmount(0);
      setUsesTransport(false);
    }
    setPaymentAmount(0);
    setPaymentRemarks('');
  };

  const handleSaveStudentProfile = async () => {
    if (!selectedStudent) return;
    setSubmitting(true);
    const success = await saveStudentFeeProfile({
      school_id: schoolId,
      student_id: selectedStudent.id,
      discount_amount: discountAmount,
      uses_transport: usesTransport
    });
    if (success) {
      alert('Student profile updated!');
      loadInitialData();
    } else {
      alert('Failed to update student profile.');
    }
    setSubmitting(false);
  };

  const handleAddPayment = async () => {
    if (!selectedStudent || paymentAmount <= 0) return alert('Enter a valid amount');
    setSubmitting(true);
    const success = await addFeeTransaction({
      school_id: schoolId,
      student_id: selectedStudent.id,
      amount_paid: paymentAmount,
      payment_mode: paymentMode,
      remarks: paymentRemarks,
      payment_date: new Date().toISOString().split('T')[0],
      receipt_number: `REC-${Date.now()}`
    });
    if (success) {
      alert('Payment recorded successfully!');
      setPaymentAmount(0);
      setPaymentRemarks('');
      loadInitialData();
    } else {
      alert('Failed to record payment.');
    }
    setSubmitting(false);
  };

  const getStudentFeeDetails = (student: SearchPerson) => {
    const structure = feeStructures.find(f => f.class_name === student.sub_text);
    const profile = studentProfiles.find(p => p.student_id === student.id);
    const studentTrans = transactions.filter(t => t.student_id === student.id);
    
    let totalExpected = 0;
    if (structure) {
      totalExpected = structure.tuition_fee + structure.other_fee;
      if (profile?.uses_transport) totalExpected += structure.transport_fee;
    }
    if (profile) {
      totalExpected -= profile.discount_amount;
    }
    
    const totalPaid = studentTrans.reduce((sum, t) => sum + t.amount_paid, 0);
    const totalDue = Math.max(0, totalExpected - totalPaid);
    
    return { totalExpected, totalPaid, totalDue, studentTrans };
  };

  const calculateOverallAnalytics = () => {
    // This is a simplified calculation. In a real app, you'd iterate over all students in the DB.
    // Since we only have recent students loaded, we'll just sum up what we have or show a placeholder.
    // For a true Khatabook experience, this should be calculated on the backend or by fetching all students.
    const totalCollected = transactions.reduce((sum, t) => sum + t.amount_paid, 0);
    return { totalCollected };
  };

  const handleWhatsAppReminder = (student: SearchPerson, due: number, paid: number, total: number) => {
    const message = `नमस्ते, आपके बच्चे ${student.name} की कुल स्कूल फीस ₹${total} है। इसमें से ₹${paid} प्राप्त हो चुके हैं और ₹${due} बकाया है। कृपया समय पर भुगतान करें। धन्यवाद।`;
    const encodedMessage = encodeURIComponent(message);
    // Assuming student has a mobile number, but SearchPerson doesn't have it directly. 
    // We will just open WhatsApp without a specific number so the user can select the contact.
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handlePrintReceipt = (transaction: FeeTransaction, student: SearchPerson) => {
    const receiptContent = `
      <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .details { margin-bottom: 20px; }
            .amount { font-size: 24px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>FEE RECEIPT</h2>
            <p>Receipt No: ${transaction.receipt_number}</p>
            <p>Date: ${transaction.payment_date}</p>
          </div>
          <div class="details">
            <p><strong>Student Name:</strong> ${student.name}</p>
            <p><strong>Class:</strong> ${student.sub_text}</p>
            <p><strong>Payment Mode:</strong> ${transaction.payment_mode}</p>
            <p><strong>Remarks:</strong> ${transaction.remarks || 'N/A'}</p>
          </div>
          <div class="amount">
            Amount Paid: Rs. ${transaction.amount_paid}/-
          </div>
          <p style="text-align: center; margin-top: 50px;">Thank You!</p>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="FEES & FINANCE">
      <div className="space-y-4">
        {view === 'menu' && (
          <div className="grid grid-cols-1 gap-3 animate-in fade-in zoom-in-95 duration-300">
            <div onClick={() => setView('overview')} className="glass-card p-5 rounded-[2rem] flex items-center gap-4 cursor-pointer active:scale-95 transition-all bg-white dark:bg-dark-900 shadow-sm border border-slate-100 dark:border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center"><TrendingUp size={24} /></div>
              <div>
                <h3 className="font-black uppercase text-sm text-slate-800 dark:text-white">Analytics Overview</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Collection & Dues</p>
              </div>
            </div>
            <div onClick={() => setView('setup')} className="glass-card p-5 rounded-[2rem] flex items-center gap-4 cursor-pointer active:scale-95 transition-all bg-white dark:bg-dark-900 shadow-sm border border-slate-100 dark:border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center"><FileText size={24} /></div>
              <div>
                <h3 className="font-black uppercase text-sm text-slate-800 dark:text-white">Class Fee Setup</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Define Tuition & Transport Fees</p>
              </div>
            </div>
            <div onClick={() => { setView('collection'); setSearchTerm(''); }} className="glass-card p-5 rounded-[2rem] flex items-center gap-4 cursor-pointer active:scale-95 transition-all bg-white dark:bg-dark-900 shadow-sm border border-slate-100 dark:border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><IndianRupee size={24} /></div>
              <div>
                <h3 className="font-black uppercase text-sm text-slate-800 dark:text-white">Student Collection</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Collect Fees & Send Reminders</p>
              </div>
            </div>
          </div>
        )}

        {view === 'overview' && (
          <div className="space-y-4 premium-subview-enter">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setView('menu')} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl"><ArrowLeft size={18} /></button>
              <h3 className="font-black text-lg uppercase dark:text-white">Analytics</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Total Collected</p>
                <h2 className="text-3xl font-black text-emerald-700 dark:text-emerald-400">₹{calculateOverallAnalytics().totalCollected}</h2>
              </div>
              <div className="p-6 rounded-[2rem] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-1">Total Pending (Estimated)</p>
                <h2 className="text-3xl font-black text-rose-700 dark:text-rose-400">₹---</h2>
                <p className="text-[8px] text-rose-500 mt-2 uppercase font-bold">Requires full student sync</p>
              </div>
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="space-y-4 premium-subview-enter">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setView('menu')} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl"><ArrowLeft size={18} /></button>
              <h3 className="font-black text-lg uppercase dark:text-white">Class Setup</h3>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[2rem] space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Select Class</label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => handleSelectClassForSetup(e.target.value)}
                  className="w-full p-4 mt-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold uppercase outline-none dark:text-white"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
                </select>
              </div>

              {selectedClass && (
                <div className="space-y-3 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tuition Fee (Yearly)</label>
                    <input type="number" value={tuitionFee} onChange={e => setTuitionFee(Number(e.target.value))} className="w-full p-4 mt-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold outline-none dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Transport Fee (Yearly)</label>
                    <input type="number" value={transportFee} onChange={e => setTransportFee(Number(e.target.value))} className="w-full p-4 mt-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold outline-none dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Other Fees</label>
                    <input type="number" value={otherFee} onChange={e => setOtherFee(Number(e.target.value))} className="w-full p-4 mt-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold outline-none dark:text-white" />
                  </div>
                  <button onClick={handleSaveStructure} disabled={submitting} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Structure</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'collection' && (
          <div className="space-y-4 premium-subview-enter">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { if(selectedStudent) setSelectedStudent(null); else setView('menu'); }} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl"><ArrowLeft size={18} /></button>
              <h3 className="font-black text-lg uppercase dark:text-white">{selectedStudent ? 'Student Fees' : 'Collection'}</h3>
            </div>

            {!selectedStudent ? (
              <>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search Student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-[2rem] outline-none text-xs font-bold uppercase tracking-widest dark:text-white shadow-sm"
                  />
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
                  {students.map(s => {
                    const { totalDue } = getStudentFeeDetails(s);
                    return (
                      <div key={s.id} onClick={() => handleSelectStudent(s)} className="p-4 bg-white dark:bg-dark-950 rounded-[1.5rem] border border-slate-100 dark:border-white/5 flex items-center justify-between cursor-pointer active:scale-95 transition-all">
                        <div>
                          <h4 className="font-black text-xs uppercase dark:text-white">{s.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{s.sub_text}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${totalDue > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                          {totalDue > 0 ? `Due: ₹${totalDue}` : 'Cleared'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                {/* Student Info & Status */}
                {(() => {
                  const { totalExpected, totalPaid, totalDue, studentTrans } = getStudentFeeDetails(selectedStudent);
                  return (
                    <>
                      <div className="p-5 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h4 className="font-black text-sm uppercase dark:text-white">{selectedStudent.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedStudent.sub_text}</p>
                          </div>
                          <button onClick={() => handleWhatsAppReminder(selectedStudent, totalDue, totalPaid, totalExpected)} className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <MessageCircle size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-white dark:bg-dark-900 rounded-xl">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Total</p>
                            <p className="text-xs font-black dark:text-white">₹{totalExpected}</p>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-dark-900 rounded-xl">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Paid</p>
                            <p className="text-xs font-black text-emerald-500">₹{totalPaid}</p>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-dark-900 rounded-xl">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Due</p>
                            <p className="text-xs font-black text-rose-500">₹{totalDue}</p>
                          </div>
                        </div>
                      </div>

                      {/* Profile Settings (Discount/Transport) */}
                      <div className="p-4 rounded-[2rem] border border-slate-200 dark:border-white/10 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fee Settings</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold dark:text-white">Uses Transport</span>
                          <input type="checkbox" checked={usesTransport} onChange={e => setUsesTransport(e.target.checked)} className="w-5 h-5 accent-brand-500" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Discount / Compensation (₹)</label>
                          <input type="number" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} className="w-full p-3 mt-1 bg-slate-50 dark:bg-white/5 rounded-xl text-xs font-bold outline-none dark:text-white" />
                        </div>
                        <button onClick={handleSaveStudentProfile} disabled={submitting} className="w-full py-2 bg-slate-800 dark:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase">
                          Update Settings
                        </button>
                      </div>

                      {/* Add Payment */}
                      <div className="p-4 rounded-[2rem] bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Record Payment</h4>
                        <div className="flex gap-2">
                          <input type="number" placeholder="Amount" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} className="flex-1 p-3 rounded-xl text-xs font-bold outline-none dark:bg-dark-900 dark:text-white" />
                          <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="p-3 rounded-xl text-xs font-bold outline-none dark:bg-dark-900 dark:text-white">
                            <option>Cash</option>
                            <option>Online</option>
                            <option>Cheque</option>
                          </select>
                        </div>
                        <input type="text" placeholder="Remarks (Optional)" value={paymentRemarks} onChange={e => setPaymentRemarks(e.target.value)} className="w-full p-3 rounded-xl text-xs font-bold outline-none dark:bg-dark-900 dark:text-white" />
                        <button onClick={handleAddPayment} disabled={submitting || paymentAmount <= 0} className="w-full py-3 bg-brand-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                          {submitting ? <Loader2 className="animate-spin" size={14} /> : <><Plus size={14} /> Add Payment</>}
                        </button>
                      </div>

                      {/* Transaction History */}
                      {studentTrans.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment History</h4>
                          {studentTrans.map(t => (
                            <div key={t.id} className="p-3 bg-white dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-white/5 flex justify-between items-center">
                              <div>
                                <p className="text-xs font-black text-emerald-600">+ ₹{t.amount_paid}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">{t.payment_date} • {t.payment_mode}</p>
                              </div>
                              <button onClick={() => handlePrintReceipt(t, selectedStudent)} className="p-2 bg-slate-50 dark:bg-white/5 text-slate-500 rounded-lg active:scale-90 transition-all">
                                <Download size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
