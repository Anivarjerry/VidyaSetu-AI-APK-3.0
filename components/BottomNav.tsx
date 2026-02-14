
import React from 'react';
import { Home, User, Zap, LayoutGrid } from 'lucide-react';

interface BottomNavProps {
  currentView: 'home' | 'profile' | 'action' | 'manage' | any;
  onChangeView: (view: 'home' | 'profile' | 'action' | 'manage') => void;
  showAction?: boolean; // Prop to conditionally show Principal Specific buttons
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView, showAction = false }) => {
  
  // Logic to hide nav when keyboard is open is handled by 'interactive-widget=resizes-content' in meta tag
  // However, we ensure safe padding and z-index

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav border-t border-slate-200/60 dark:border-white/5 flex flex-col items-center justify-center z-50 safe-padding-bottom h-[calc(5.5rem+env(safe-area-inset-bottom,0px))] transition-all duration-300 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.02)] md:hidden">
      
      {/* Wrapper to keep content at exactly 5.5rem height */}
      <div className={`w-full flex ${showAction ? 'justify-around px-2' : 'justify-center gap-20 px-8'} items-center h-[5.5rem] relative`}>
        
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
             <Home size={26} strokeWidth={currentView === 'home' ? 2.5 : 2} className="transition-all duration-300 drop-shadow-sm" />
             {currentView === 'home' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in"></span>}
          </div>
          {showAction && <span className="text-[9px] font-black uppercase mt-1 opacity-80">Home</span>}
        </button>

        {/* Action Button (Principal Only) */}
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
                 <Zap size={28} strokeWidth={currentView === 'action' ? 2.5 : 2} className="transition-all duration-300 drop-shadow-sm" />
                 {currentView === 'action' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in"></span>}
              </div>
              <span className="text-[9px] font-black uppercase mt-1 opacity-80">Action</span>
            </button>
        )}

        {/* Manage Button (Principal Only) - NEW */}
        {showAction && (
            <button
              onClick={() => onChangeView('manage')}
              className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-90 w-16 group ${
                currentView === 'manage' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <div className="relative">
                 <LayoutGrid size={26} strokeWidth={currentView === 'manage' ? 2.5 : 2} className="transition-all duration-300 drop-shadow-sm" />
                 {currentView === 'manage' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in"></span>}
              </div>
              <span className="text-[9px] font-black uppercase mt-1 opacity-80">Manage</span>
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
             <User size={26} strokeWidth={currentView === 'profile' ? 2.5 : 2} className="transition-all duration-300 drop-shadow-sm" />
             {currentView === 'profile' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in"></span>}
          </div>
          {showAction && <span className="text-[9px] font-black uppercase mt-1 opacity-80">Profile</span>}
        </button>

      </div>
    </nav>
  );
};
