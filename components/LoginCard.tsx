
import React, { useState, useEffect } from 'react';
import { LoginRequest } from '../types';
import { Button } from './Button';
import { Smartphone, AlertCircle, Key, UserCog, Sparkles, Info, HelpCircle, FileText, UserPlus, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { AboutModal, HelpModal, PoliciesModal } from './MenuModals';
import { SignUpModal } from './SignUpModal';
import { auth } from '../services/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { checkUserStatus } from '../services/authService';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

interface LoginCardProps {
  onSubmit: (data: LoginRequest) => void;
  isLoading: boolean;
  error?: string | null;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onSubmit, isLoading, error }) => {
  const { t } = useThemeLanguage();
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // OTP States
  const [otpStep, setOtpStep] = useState<'mobile' | 'otp'>('mobile');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  const [formData, setFormData] = useState<LoginRequest>({
    mobile: '',
    password: '', // Ignored in OTP mode
    secret_code: ''
  });

  const [localError, setLocalError] = useState<string | null>(null);

  // Initialize Recaptcha
  useEffect(() => {
    if (!window.recaptchaVerifier && auth) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
           setLocalError("Recaptcha expired. Refresh page.");
        }
      });
    }
  }, []);

  // OTP Timer Logic
  useEffect(() => {
      let interval: any;
      if (otpTimer > 0) {
          interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
      }
      return () => clearInterval(interval);
  }, [otpTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGetOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);

      const mobile = formData.mobile;
      if (mobile.length !== 10) {
          setLocalError("Enter valid 10-digit mobile number.");
          return;
      }

      setIsSendingOtp(true);

      // 1. Check User Status in Supabase First
      const statusCheck = await checkUserStatus(mobile);
      
      if (!statusCheck.exists) {
          setLocalError("Number not registered. Please Sign Up first.");
          setIsSendingOtp(false);
          return;
      }

      if (statusCheck.status !== 'approved') {
          setLocalError(statusCheck.message || "Account approval pending.");
          setIsSendingOtp(false);
          return;
      }

      // 2. Demo Account Bypass (UPDATED NUMBER)
      if (mobile === '1000000001') {
          // Bypass OTP for demo account
          onSubmit(formData); // Directly submit logic will handle standard fetch
          setIsSendingOtp(false);
          return;
      }

      // 3. Send Firebase OTP
      try {
          const appVerifier = window.recaptchaVerifier;
          const formattedNumber = `+91${mobile}`;
          const confirmation = await signInWithPhoneNumber(auth!, formattedNumber, appVerifier);
          setConfirmationResult(confirmation);
          setOtpStep('otp');
          setOtpTimer(60); // 60 seconds cooldown
      } catch (err: any) {
          console.error("OTP Error:", err);
          if (err.code === 'auth/too-many-requests') {
              setLocalError("Too many requests. Try again later.");
          } else {
              setLocalError("Failed to send OTP. Check connection.");
          }
      } finally {
          setIsSendingOtp(false);
      }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);
      if (otp.length !== 6) {
          setLocalError("Enter 6-digit OTP.");
          return;
      }

      setIsSendingOtp(true); // Re-use loading state
      try {
          if (confirmationResult) {
              await confirmationResult.confirm(otp);
              // OTP Verified Successfully -> Proceed to App Login Logic
              onSubmit(formData); 
          }
      } catch (err) {
          setLocalError("Invalid OTP. Please try again.");
          setIsSendingOtp(false);
      }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.mobile && formData.secret_code) {
          onSubmit(formData);
      }
  };

  return (
    <div className="w-full h-full min-h-screen flex flex-col bg-white dark:bg-dark-950 overflow-y-auto no-scrollbar relative">
      <div className="flex-1 flex flex-col items-center justify-start pt-16 sm:justify-center sm:pt-0 px-8 pb-10 z-10 relative max-w-md mx-auto w-full">
        
        {/* Invisible Recaptcha Container */}
        <div id="recaptcha-container"></div>

        <div className="flex flex-col items-center mb-6">
           <div className="w-16 h-16 bg-brand-500/10 rounded-3xl flex items-center justify-center text-brand-500 shadow-inner mb-4">
              <Sparkles size={32} strokeWidth={2.5} />
           </div>
           
           <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none text-center">VidyaSetu AI</h2>
           <p className="text-slate-400 dark:text-brand-500/60 text-[10px] font-black uppercase tracking-[0.3em] text-center mt-2">
             {isAdminMode ? t('system_administrator') : t('secure_login_portal')}
           </p>
        </div>

        {/* --- FORM SECTION --- */}
        <div className="w-full space-y-3">
          
          {/* USER OTP LOGIN FLOW */}
          {!isAdminMode ? (
            <>
                {otpStep === 'mobile' ? (
                    <form onSubmit={handleGetOtp} className="space-y-4">
                        <div className="relative group">
                            <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                            <input 
                            type="text" 
                            name="mobile" 
                            value={formData.mobile} 
                            onChange={handleChange} 
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-400 h-14 shadow-sm" 
                            placeholder={t('mobile_placeholder')} 
                            inputMode="numeric" 
                            maxLength={10}
                            disabled={isSendingOtp}
                            />
                        </div>
                        <Button 
                            type="submit" 
                            fullWidth 
                            disabled={isSendingOtp || formData.mobile.length !== 10} 
                            className="py-6 rounded-2xl shadow-xl shadow-brand-500/20 h-auto text-xs font-black uppercase tracking-[0.2em] bg-brand-500 hover:bg-brand-600 text-white border-none active:scale-[0.97] transition-all"
                        >
                            {isSendingOtp ? <Loader2 className="animate-spin" /> : "GET OTP"}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 premium-subview-enter">
                        <div className="text-center mb-2">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">OTP sent to +91 {formData.mobile}</p>
                            <button type="button" onClick={() => { setOtpStep('mobile'); setOtp(''); }} className="text-[9px] text-brand-500 font-bold underline mt-1">Change Number</button>
                        </div>
                        
                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                            <input 
                            type="text" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/5 rounded-2xl text-lg font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-400 h-14 shadow-sm tracking-widest" 
                            placeholder="• • • • • •" 
                            inputMode="numeric" 
                            autoFocus
                            />
                        </div>

                        <Button 
                            type="submit" 
                            fullWidth 
                            disabled={isSendingOtp || otp.length !== 6} 
                            className="py-6 rounded-2xl shadow-xl shadow-brand-500/20 h-auto text-xs font-black uppercase tracking-[0.2em] bg-brand-500 hover:bg-brand-600 text-white border-none active:scale-[0.97] transition-all"
                        >
                            {isSendingOtp ? <Loader2 className="animate-spin" /> : "VERIFY & LOGIN"}
                        </Button>

                        {otpTimer > 0 ? (
                            <p className="text-center text-[10px] font-bold text-slate-400">Resend in {otpTimer}s</p>
                        ) : (
                            <button type="button" onClick={handleGetOtp} className="w-full text-center text-[10px] font-black text-brand-600 uppercase tracking-widest">Resend OTP</button>
                        )}
                    </form>
                )}
            </>
          ) : (
            // ADMIN LOGIN FORM (No changes here, kept secret code)
            <form onSubmit={handleAdminSubmit} className="space-y-3 premium-subview-enter">
              <div className="relative group">
                <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-500/60" size={20} />
                <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full pl-12 pr-6 py-4 bg-brand-500/5 dark:bg-dark-900 border border-brand-500/20 rounded-2xl text-sm font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-400 h-14 shadow-sm" placeholder={t('admin_mobile_placeholder')} />
              </div>
              <div className="relative group">
                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-500/60" size={20} />
                <input type="password" name="secret_code" value={formData.secret_code} onChange={handleChange} className="w-full pl-12 pr-6 py-4 bg-brand-500/5 dark:bg-dark-900 border border-brand-500/20 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-400 h-14 shadow-sm" placeholder={t('secret_code_placeholder')} />
              </div>
              <Button type="submit" fullWidth disabled={isLoading} className="mt-4 py-6 rounded-2xl shadow-xl shadow-brand-500/20 h-auto text-xs font-black uppercase tracking-[0.2em] bg-brand-500 hover:bg-brand-600 text-white border-none active:scale-[0.97] transition-all">
                {isLoading ? t('verifying') : t('admin_login')}
              </Button>
            </form>
          )}

          {/* ERROR DISPLAY */}
          {(error || localError) && (
            <div className="flex items-center gap-3 p-3 bg-rose-500/5 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/10 animate-in fade-in slide-in-from-top-1">
               <AlertCircle size={14} />
               <span>{localError || error}</span>
            </div>
          )}

          {!isAdminMode && otpStep === 'mobile' && (
              <button 
                type="button"
                onClick={() => setIsSignUpOpen(true)}
                className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl mt-2 hover:border-brand-500/50"
              >
                  <UserPlus size={14} /> Register New Account
              </button>
          )}

          <div className="text-center pt-6 space-y-5">
             <button type="button" onClick={() => { setIsAdminMode(!isAdminMode); setOtpStep('mobile'); setLocalError(null); }} className="text-[10px] font-black text-slate-400 hover:text-brand-500 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mx-auto active:scale-95">
                <UserCog size={14} />
                {isAdminMode ? t('staff_mode') : t('admin_port')}
             </button>

             <div className="flex items-center justify-center gap-6 border-t border-slate-50 dark:border-white/5 pt-5">
                <button type="button" onClick={() => setIsAboutOpen(true)} className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 hover:text-brand-500 uppercase tracking-[0.2em] transition-all active:scale-95"><Info size={12} /> {t('about')}</button>
                <button type="button" onClick={() => setIsPoliciesOpen(true)} className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 hover:text-brand-500 uppercase tracking-[0.2em] transition-all active:scale-95"><FileText size={12} /> Legal</button>
                <button type="button" onClick={() => setIsHelpOpen(true)} className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 hover:text-brand-500 uppercase tracking-[0.2em] transition-all active:scale-95"><HelpCircle size={12} /> {t('help')}</button>
             </div>

             <p className="text-[9px] text-slate-300 dark:text-slate-700 font-medium leading-relaxed px-4 opacity-80 cursor-default select-none">
                By accessing this system, you agree to our Terms of Service & Privacy Policy.
             </p>
          </div>
        </div>
      </div>

      <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <PoliciesModal isOpen={isPoliciesOpen} onClose={() => setIsPoliciesOpen(false)} />
    </div>
  );
};
