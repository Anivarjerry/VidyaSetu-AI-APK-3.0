
import React, { useState, useRef, useEffect } from 'react';
import { DashboardData, LoginRequest } from '../types';
import { Truck, Play, Square, ChevronRight, CalendarRange, MoreHorizontal, Lock } from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';
import { updateVehicleLocation } from '../services/dashboardService';
import { LeaveRequestModal } from './LeaveModals';

interface DriverDashboardProps {
  data: DashboardData;
  isSchoolActive: boolean;
  onShowLocked: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ data, isSchoolActive, onShowLocked }) => {
  const { t } = useThemeLanguage();
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  
  // GPS State
  const [isTripActive, setIsTripActive] = useState(false);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<any>(null);
  const lastUpdateTimestamp = useRef<number>(0);

  useModalBackHandler(isLeaveModalOpen, () => setIsLeaveModalOpen(false));

  useEffect(() => {
      // Clean up GPS on unmount
      return () => {
          if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
          if (wakeLock.current) wakeLock.current.release().catch(() => {});
      }
  }, []);

  const handleStartTrip = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!isSchoolActive) { onShowLocked(); return; }
    if (!navigator.geolocation) { alert("GPS not supported."); return; }
    
    navigator.geolocation.getCurrentPosition(async (initialPos) => {
        setIsTripActive(true);
        if ('wakeLock' in navigator) { try { wakeLock.current = await (navigator as any).wakeLock.request('screen'); } catch (wlErr) {} }
        
        if (data?.user_id) {
          setIsSendingLocation(true);
          await updateVehicleLocation(data.user_id, initialPos.coords.latitude, initialPos.coords.longitude);
          lastUpdateTimestamp.current = Date.now();
          setTimeout(() => setIsSendingLocation(false), 2500);
        }
        
        watchId.current = navigator.geolocation.watchPosition(async (pos) => {
            const now = Date.now();
            if (data?.user_id && (now - lastUpdateTimestamp.current >= 30000)) { // 30 sec update
              setIsSendingLocation(true);
              const ok = await updateVehicleLocation(data.user_id, pos.coords.latitude, pos.coords.longitude);
              if (ok) lastUpdateTimestamp.current = now;
              setTimeout(() => setIsSendingLocation(false), 2500);
            }
          }, (err) => console.error("GPS error", err), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
      }, (err) => { alert("GPS Permission Denied."); }, { enableHighAccuracy: true });
  };

  const handleStopTrip = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setIsTripActive(false); setIsSendingLocation(false); lastUpdateTimestamp.current = 0;
    if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    if (wakeLock.current) { wakeLock.current.release().catch(() => {}); wakeLock.current = null; }
  };

  return (
    <div className="space-y-4 pb-10">
        {/* 1. START TRIP CARD */}
        <div className={`relative w-full rounded-[2.8rem] overflow-hidden shadow-xl ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/30' : isTripActive ? 'bg-brand-600' : 'bg-brand-500/10 dark:bg-brand-500/5 border border-brand-500/10 dark:border-white/5'}`}>
            <div className={`transition-all duration-500 p-7 sm:p-8 ${isTripActive ? 'space-y-10' : 'space-y-0'}`}>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.8rem] flex items-center justify-center shadow-xl relative shrink-0 ${!isSchoolActive ? 'bg-rose-500 text-white' : isTripActive ? 'bg-white text-brand-600' : 'bg-brand-500 text-white'}`}>
                            {isTripActive ? (<div className="relative flex items-center justify-center"><div className="absolute inset-[-4px] border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div><Truck size={32} strokeWidth={2.5} /></div>) : (<Play size={36} fill="currentColor" strokeWidth={0} className={!isSchoolActive ? 'text-white' : ''} />)}
                        </div>
                        <div className="space-y-0.5 truncate text-left">
                            <h3 className={`font-black uppercase text-base sm:text-xl tracking-tight leading-tight ${!isSchoolActive ? 'text-rose-600' : isTripActive ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{isTripActive ? 'LIVE TRACKING ON' : 'START SCHOOL TRIP'}</h3>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-80 truncate ${!isSchoolActive ? 'text-rose-400' : isTripActive ? 'text-brand-50' : 'text-slate-400'}`}>{isTripActive ? (isSendingLocation ? 'TRANSMITTING...' : 'BROADCASTING LOCATION') : 'System Check Ready'}</p>
                        </div>
                    </div>
                    <button onClick={isTripActive ? handleStopTrip : handleStartTrip} disabled={!isSchoolActive} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 shrink-0 z-[100] relative cursor-pointer ${!isSchoolActive ? 'bg-rose-100 text-rose-400 opacity-50' : isTripActive ? 'bg-white text-rose-600' : 'bg-brand-600 text-white border-4 border-brand-500/20'}`}>
                        {isTripActive ? <Square size={20} fill="currentColor" className="text-rose-600" /> : <ChevronRight size={28} strokeWidth={3.5} />}
                    </button>
                </div>
                {isTripActive && (<div className="pt-6 border-t border-white/10 flex items-center justify-between premium-subview-enter"><div className="flex items-center gap-2.5"><div className={`w-2.5 h-2.5 rounded-full ${isSendingLocation ? 'bg-emerald-400 scale-125 shadow-[0_0_10px_rgba(52,211,153,1)]' : 'bg-white animate-pulse'}`}></div><span className={`text-[10px] font-black uppercase tracking-widest text-white/80`}>{isSendingLocation ? 'SATELLITE SYNC ACTIVE' : 'AUTO-SYNC EVERY 30S'}</span></div><div className="opacity-40 text-white"><MoreHorizontal size={24} /></div></div>)}
            </div>
        </div>

        {/* 2. LEAVE CARD */}
        <div onClick={() => isSchoolActive ? setIsLeaveModalOpen(true) : onShowLocked()} className={`glass-card p-5 rounded-[2.5rem] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm border-slate-100 dark:border-white/5 ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30' : ''}`}>
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}><CalendarRange size={28} /></div>
                <div className="text-left">
                    <h3 className={`font-black uppercase text-base leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{t('apply_leave')}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Staff Request Portal</p>
                </div>
            </div>
            {!isSchoolActive ? <Lock size={20} className="text-rose-400" /> : <ChevronRight size={22} className="text-slate-200" />}
        </div>

        <LeaveRequestModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} userId={data?.user_id || ''} schoolId={data?.school_db_id || ''} />
    </div>
  );
};
