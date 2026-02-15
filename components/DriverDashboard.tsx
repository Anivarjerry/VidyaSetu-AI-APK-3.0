
import React, { useState, useRef, useEffect } from 'react';
import { DashboardData } from '../types';
import { Truck, Play, Square, CalendarRange, MoreHorizontal, Lock, Navigation } from 'lucide-react';
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
    <div className="pb-24">
        {/* UNIFIED GRID LAYOUT */}
        <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-300">
            
            {/* 1. START TRIP CARD */}
            <div 
                onClick={isTripActive ? handleStopTrip : handleStartTrip}
                className={`col-span-2 glass-card p-6 rounded-[2rem] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-sm relative overflow-hidden ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : isTripActive ? 'bg-brand-500 text-white' : 'bg-white dark:bg-dark-900'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md relative ${isTripActive ? 'bg-white text-brand-600' : !isSchoolActive ? 'bg-rose-500 text-white' : 'bg-brand-500/10 text-brand-600'}`}>
                        {isTripActive ? (
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-[-3px] border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                                <Truck size={24} strokeWidth={2.5} />
                            </div>
                        ) : (
                            <Play size={24} fill="currentColor" strokeWidth={0} />
                        )}
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-lg leading-tight ${isTripActive ? 'text-white' : !isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                            {isTripActive ? 'Trip Active' : 'Start Trip'}
                        </h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isTripActive ? 'text-white/80' : 'text-slate-400'}`}>
                            {isTripActive ? (isSendingLocation ? 'Syncing...' : 'Broadcasting') : 'Begin Route'}
                        </p>
                    </div>
                </div>
                {isTripActive ? <MoreHorizontal size={24} className="text-white/50" /> : !isSchoolActive ? <Lock size={20} className="text-rose-400" /> : null}
            </div>

            {/* 2. LEAVE CARD */}
            <div 
                onClick={() => isSchoolActive ? setIsLeaveModalOpen(true) : onShowLocked()}
                className={`glass-card p-4 rounded-[1.8rem] flex flex-col justify-center items-center text-center gap-2 cursor-pointer group active:scale-[0.98] transition-all shadow-sm ${!isSchoolActive ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' : 'bg-white dark:bg-dark-900'}`}
            >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 ${!isSchoolActive ? 'bg-rose-500 text-white' : 'bg-indigo-500/10 text-indigo-600'}`}>
                    <CalendarRange size={24} />
                </div>
                <div>
                    <h3 className={`font-black uppercase text-xs leading-tight ${!isSchoolActive ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{t('apply_leave')}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Request Off</p>
                </div>
            </div>

            {/* 3. PLACEHOLDER CARD (For Symmetry) */}
            <div className="glass-card p-4 rounded-[1.8rem] flex flex-col justify-center items-center text-center gap-2 shadow-sm bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <Navigation size={24} />
                </div>
                <div>
                    <h3 className="font-black uppercase text-xs leading-tight text-slate-400 dark:text-slate-600">Route Map</h3>
                    <p className="text-[9px] text-slate-300 dark:text-slate-700 font-bold uppercase tracking-widest mt-0.5">Coming Soon</p>
                </div>
            </div>

        </div>

        <LeaveRequestModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} userId={data?.user_id || ''} schoolId={data?.school_db_id || ''} />
    </div>
  );
};
