
import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Smartphone, School, MessageCircle, Key, ShieldCheck } from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  useModalBackHandler(isOpen, onClose);

  const [mobile, setMobile] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  
  // Use the support number defined in the app
  const SUPPORT_NUMBER = "919929922698"; 

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mobile || mobile.length < 10) {
        alert("Please enter a valid mobile number.");
        return;
    }

    // Construct the WhatsApp Message
    const message = `*PASSWORD RESET REQUEST*
---------------------------
My Mobile: ${mobile}
School Code: ${schoolCode || 'Not Provided'}
---------------------------
Please assist me in resetting my password for VidyaSetu AI.`;

    const url = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp
    window.open(url, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="RECOVER ACCESS">
      <div className="space-y-6">
        
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 text-center">
            <div className="w-16 h-16 bg-white dark:bg-dark-900 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-emerald-600">
                <Key size={32} />
            </div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">Lost Your Password?</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 leading-relaxed">
                For security reasons, passwords are reset manually by our Support Team via WhatsApp verification.
            </p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Registered Mobile</label>
                <div className="relative group">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" size={18} />
                    <input 
                        type="tel" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-Digit Mobile Number"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase tracking-widest"
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">School Code (Optional)</label>
                <div className="relative group">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" size={18} />
                    <input 
                        type="text" 
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SCH001"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase tracking-widest"
                    />
                </div>
            </div>

            <div className="pt-2">
                <Button type="submit" fullWidth className="py-5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-[2rem] shadow-xl shadow-green-500/20 border-none flex items-center justify-center gap-3">
                    <MessageCircle size={20} fill="currentColor" className="text-white" />
                    <span className="font-black text-xs uppercase tracking-widest">Request via WhatsApp</span>
                </Button>
                <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest mt-3 opacity-60 flex items-center justify-center gap-1">
                    <ShieldCheck size={10} /> Secure Verification Process
                </p>
            </div>
        </form>
      </div>
    </Modal>
  );
};
