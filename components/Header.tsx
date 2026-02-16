
import React, { useState, useEffect } from 'react';
import { GraduationCap, MoreVertical, Settings, Info, HelpCircle, Bell, LogOut, LayoutDashboard, User, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

interface HeaderProps {
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenHelp: () => void;
  onOpenNotices?: () => void;
  onLogout: () => void;
  currentView?: 'home' | 'profile' | 'action' | 'manage';
  onChangeView?: (view: 'home' | 'profile') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenAbout, onOpenHelp, onOpenNotices, onLogout, currentView, onChangeView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useThemeLanguage();
  
  // Sync Status State
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  // Local handler for Menu
  useModalBackHandler(isMenuOpen, () => setIsMenuOpen(false));

  useEffect(() => {
      // Initial Check
      setSyncStatus(navigator.onLine ? 'online' : 'offline');

      // Listeners
      const handleOnline = () => setSyncStatus('online');
      const handleOffline = () => setSyncStatus('offline');
      const handleSyncChange = (e: any) => {
          if (e.detail?.isSyncing) setSyncStatus('syncing');
          else setSyncStatus(navigator.onLine ? 'online' : 'offline');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('vidyasetu-sync-change', handleSyncChange);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('vidyasetu-sync-change', handleSyncChange);
      };
  }, []);

  const handleMenuItemClick = (action: () => void) => {
    setIsMenuOpen(false);
    setTimeout(() => { action(); }, 150);
  };

  return (
    <>
      {/* 
          COMPACT HEADER
          Height: 3.5rem (56px) + Safe Area Top
          Style: Glassmorphism with subtle border
      */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 transition-all duration-300">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <GraduationCap size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">VidyaSetu</span>
        </div>

        {/* Center: Desktop Navigation (Hidden on Mobile) */}
        {onChangeView && (
            <div className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2 top-[calc(50%+env(safe-area-inset-top,0px)/2)] -translate-y-1/2 bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10">
                <button 
                    onClick={() => onChangeView('home')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all ${currentView === 'home' ? 'bg-white dark:bg-dark-900 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <LayoutDashboard size={14} /> Dashboard
                </button>
                <button 
                    onClick={() => onChangeView('profile')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all ${currentView === 'profile' ? 'bg-white dark:bg-dark-900 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <User size={14} /> Profile
                </button>
            </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          
          {/* Sync Status Indicator */}
          <div className="flex items-center justify-center w-8 h-8" title={syncStatus === 'online' ? 'Online' : 'Offline'}>
             {syncStatus === 'offline' && <CloudOff className="text-rose-500 opacity-80" size={18} />}
             {syncStatus === 'syncing' && <RefreshCw className="text-amber-500 animate-spin" size={18} />}
             {syncStatus === 'online' && (
               <div className="relative">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-20"></div>
               </div>
             )}
          </div>

          {/* Notifications */}
          {onOpenNotices && (
              <button onClick={onOpenNotices} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all">
                  <Bell size={20} strokeWidth={2} />
              </button>
          )}

          {/* Menu */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all">
            <MoreVertical size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Menu Dropdown / Modal */}
      {isMenuOpen && (
        <>
            <div className="fixed inset-0 bg-transparent z-[60]" onClick={() => setIsMenuOpen(false)} />
            <div className="fixed top-[calc(3rem+env(safe-area-inset-top,0px))] right-4 w-48 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
               <div className="py-1.5">
                 {[
                   { icon: <Settings size={16} />, label: "Settings", action: onOpenSettings },
                   { icon: <Info size={16} />, label: "About", action: onOpenAbout },
                   { icon: <HelpCircle size={16} />, label: "Help", action: onOpenHelp }
                 ].map((item, i) => (
                   <button key={i} onClick={() => handleMenuItemClick(item.action)} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors active:bg-slate-100">
                      {item.icon} {item.label}
                   </button>
                 ))}
                 <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-3"></div>
                 <button onClick={() => handleMenuItemClick(onLogout)} className="w-full text-left px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 transition-colors active:bg-rose-50">
                    <LogOut size={16} /> Logout
                 </button>
               </div>
            </div>
        </>
      )}
    </>
  );
};
