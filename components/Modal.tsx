
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, hideCloseButton = false }) => {
  // Apply the refined back button logic
  useModalBackHandler(isOpen, onClose || (() => {}));
  
  // State to ensure we only render portal after mount (Next.js/SSR safety, though this is Vite)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // React Portal: Renders the modal outside the #root div, directly into document.body
  // This solves z-index context issues where Header/Nav appeared on top of the modal.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Background with premium fade and blur */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm premium-modal-backdrop" onClick={onClose} />
      
      {/* Pop-up area with premium spring-pop transition */}
      <div 
        className="glass-card shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] w-full max-w-md premium-modal-content transition-all relative overflow-hidden flex flex-col max-h-[85vh] z-[10000] border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-dark-900">
          <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase leading-tight">{title}</h3>
          {!hideCloseButton && onClose && (
            <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-all active:scale-90"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="p-6 overflow-y-auto no-scrollbar bg-white dark:bg-dark-900 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
