import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { MapPin, Loader2, CheckCircle2, AlertCircle, Navigation } from 'lucide-react';
import { updateSchoolLocation } from '../services/dashboardService';
import { useThemeLanguage } from '../contexts/ThemeLanguageContext';

interface LocationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  currentLat?: number;
  currentLng?: number;
  onSuccess: () => void;
}

export const LocationSetupModal: React.FC<LocationSetupModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  currentLat,
  currentLng,
  onSuccess
}) => {
  const { t } = useThemeLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      setError("GPS is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const ok = await updateSchoolLocation(schoolId, latitude, longitude);
        if (ok) {
          setSuccess(true);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        } else {
          setError("Failed to update school location. Please check your internet connection.");
        }
        setLoading(false);
      },
      (err) => {
        setError("Failed to get location. Please ensure GPS is enabled and permission is granted.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SCHOOL LOCATION SETUP">
      <div className="p-4 space-y-6 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto shadow-inner">
          <Navigation size={40} />
        </div>

        <div>
          <h3 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Set GPS Location</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 px-4 leading-relaxed">
            Stand in the center of the school and tap the button below to set the official GPS location for staff attendance (100m radius).
          </p>
        </div>

        {currentLat && currentLng && !success && (
          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Saved Location</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-800 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span className="text-[10px] font-black uppercase">{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-6 flex flex-col items-center gap-3 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Location Saved Successfully</p>
          </div>
        ) : (
          <button
            onClick={handleSetLocation}
            disabled={loading}
            className="w-full py-5 rounded-[2rem] bg-indigo-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><MapPin size={18} /> UPDATE LOCATION</>}
          </button>
        )}
      </div>
    </Modal>
  );
};
