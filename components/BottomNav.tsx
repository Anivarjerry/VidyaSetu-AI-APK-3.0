
import React from 'react';
import { Home, User, Zap, LayoutGrid, Sparkles } from 'lucide-react';

interface BottomNavProps {
  currentView: 'home' | 'profile' | 'action' | 'manage';
  onChangeView: (view: 'home' | 'profile' | 'action' | 'manage') => void;
  showAction?: boolean; // Prop to conditionally show Principal Specific buttons
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView, showAction = false }) => {
  
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    ...(showAction ? [
      { id: 'action', icon: Zap, label: 'Action' },
      { id: 'manage', icon: LayoutGrid, label: 'Manage' }
    ] : []),
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom,20px))] transition-all duration-300">
      
      {/* Floating Pill Container */}
      <nav className="pointer-events-auto bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2.5rem] p-2 flex items-center gap-2 transform transition-all hover:scale-[1.02]">
        
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as any)}
              className={`
                relative flex items-center justify-center w-14 h-14 rounded-[1.8rem] transition-all duration-300 ease-out
                ${isActive 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-105' 
                  : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 active:scale-90'
                }
              `}
            >
              {/* Icon */}
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`transition-all duration-300 ${isActive ? 'animate-in zoom-in-50' : ''}`} 
              />

              {/* Active Indicator Dot (Optional Flair) */}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full"></span>
              )}
              
              {/* Tooltip Label (Visible only on very specific active interactions if needed, kept hidden for cleaner look usually) */}
            </button>
          );
        })}

      </nav>
    </div>
  );
};
