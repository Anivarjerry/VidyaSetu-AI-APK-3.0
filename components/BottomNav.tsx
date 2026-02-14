
import React from 'react';
import { Home, User, Zap } from 'lucide-react';

interface BottomNavProps {
  currentView: 'home' | 'profile' | 'action';
  onChangeView: (view: 'home' | 'profile' | 'action') => void;
  showAction?: boolean; // Prop to conditionally show the middle button
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView, showAction = false }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav border-t border-slate-200/60 dark:border-white/5 flex flex-col items-center justify-center z-50 safe-padding-bottom h-[calc(5.5rem+env(safe-area-inset-bottom,0px))] transition-all duration-300 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.02)] md:hidden">
      
      {/* Wrapper to keep content at exactly 5.5rem height */}
      <div className="w-full flex justify-center gap-16 items-center h-[5.5rem] px-8 relative">
        
        {/* Home Button */}
        <button
          onClick={() => onChangeView('home')}
          className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-90 w-16 group ${
            currentView === 'home' 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
          }`}
        >
          <div className="relative">
             <Home size={28} strokeWidth={currentView === 'home' ? 2.5 : 2} className="transition-all duration-300 drop-shadow-sm" />
             {currentView === 'home' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in"></span>}
          </div>
        </button>

        {/* Action Button (Conditional for Principal) */}
        {showAction && (
            <button
              onClick={() => onChangeView('action')}
              className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-90 w-16 group ${
                currentView === 'action' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <div className="relative">
                 <Zap size={32} strokeWidth={currentView === 'action' ? 2.5 : 2} className="transition-all duration-300 drop-shadow-sm" />
                 {currentView === 'action' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in"></span>}
              </div>
            </button>
        )}

        {/* Profile Button */}
        <button
          onClick={() => onChangeView('profile')}
          className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-90 w-16 group ${
            currentView === 'profile' 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
          }`}
        >
          <div className="relative">
             <User size={28} strokeWidth={currentView === 'profile' ? 2.5 : 2} className="transition-all duration-300 drop-shadow-sm" />
             {currentView === 'profile' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in"></span>}
          </div>
        </button>

      </div>
    </nav>
  );
};
