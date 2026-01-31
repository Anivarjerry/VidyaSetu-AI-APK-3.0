
import React, { useState } from 'react';
import { LoginRequest } from '../types';
import { Button } from './Button';
import { Smartphone, Lock, AlertCircle, Sparkles, Info, HelpCircle, FileText, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { AboutModal, HelpModal, PoliciesModal } from './MenuModals';
import { SignUpModal } from './SignUpModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginCardProps {
  onSubmit: (data: LoginRequest) => void;
  isLoading: boolean;
  error?: string | null;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onSubmit, isLoading, error }) => {
  const { t } = useThemeLanguage();
  
  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<LoginRequest>({
    mobile: '',
    password: '',
    secret_code: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
  };

  return (
    <div className="w-full h-full min-h-screen flex flex-col bg-white dark:bg-dark-950 overflow-y-auto no-scrollbar relative">
      <div className="flex-1 flex flex-col items-center justify-start pt-16 sm:justify-center sm:pt-0 px-8 pb-10 z-10 relative max-w-md mx-auto w-full">
        
        <div className="flex flex-col items-center mb-8">
           <div className="w-20 h-20 bg-brand-500/10 rounded-[1.8rem] flex items-center justify-center text-brand-500 shadow-inner mb-5 animate-in zoom-in duration-500">
              <Sparkles size={40} strokeWidth={2.5} />
           </div>
           
           <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none text-center">VidyaSetu AI</h2>
           <p className="text-slate-400 dark:text-brand-500/60 text-[10px] font-black uppercase tracking-[0.3em] text-center mt-2">
             {t('secure_login_portal')}
           </p>
        </div>

        {/* --- FORM SECTION --- */}
        <div className="w-full space-y-4">
          
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                  <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    name="mobile" 
                    value={formData.mobile} 
                    onChange={handleChange} 
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-400 h-14 shadow-sm uppercase tracking-widest" 
                    placeholder={t('mobile_placeholder')} 
                    inputMode="numeric" 
                    maxLength={10}
                    disabled={isLoading}
                  />
              </div>

              <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-400 h-14 shadow-sm" 
                    placeholder={t('password_placeholder')} 
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
              </div>

              {/* Forgot Password & Admin Hint */}
              <div className="flex justify-between items-center px-1">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotOpen(true)}
                    className="text-[9px] font-black text-brand-500 uppercase tracking-widest hover:underline"
                  >
                    Forgot Password?
                  </button>
                  <p className="text-[9px] font-bold text-slate-400">Admin? Use Secret Code.</p>
              </div>

              <Button 
                  type="submit" 
                  fullWidth 
                  disabled={isLoading || formData.mobile.length !== 10 || !formData.password} 
                  className="py-6 rounded-2xl shadow-xl shadow-brand-500/20 h-auto text-xs font-black uppercase tracking-[0.2em] bg-brand-500 hover:bg-brand-600 text-white border-none active:scale-[0.97] transition-all"
              >
                  {isLoading ? <Loader2 className="animate-spin" /> : "SECURE LOGIN"}
              </Button>
          </form>

          {/* ERROR DISPLAY */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/5 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/10 animate-in fade-in slide-in-from-top-1">
               <AlertCircle size={16} />
               <span>{error}</span>
            </div>
          )}

          <button 
            type="button"
            onClick={() => setIsSignUpOpen(true)}
            className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl mt-4 hover:border-brand-500/50"
          >
              <UserPlus size={16} /> Create New Account
          </button>

          <div className="text-center pt-8 space-y-6">
             <div className="flex items-center justify-center gap-6 border-t border-slate-50 dark:border-white/5 pt-6">
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
      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <PoliciesModal isOpen={isPoliciesOpen} onClose={() => setIsPoliciesOpen(false)} />
    </div>
  );
};
