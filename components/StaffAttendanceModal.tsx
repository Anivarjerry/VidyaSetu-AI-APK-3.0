
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Camera, MapPin, ShieldCheck, Loader2, X, AlertCircle, CheckCircle2, History, Calendar, Clock, RefreshCw } from 'lucide-react';
import { getFaceDescriptor, compareFaces } from '../services/faceRecognitionService';
import { submitStaffAttendance, fetchStaffAttendanceHistory, checkStaffAttendanceToday, getISTDate } from '../services/dashboardService';
import { supabase } from '../services/supabaseClient';
import { StaffAttendanceRecord } from '../types';

interface StaffAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  role: string;
  storedDescriptor?: number[];
  schoolLat?: number;
  schoolLng?: number;
}

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const StaffAttendanceModal: React.FC<StaffAttendanceModalProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  role,
  storedDescriptor,
  schoolLat,
  schoolLng
}) => {
  const [view, setView] = useState<'status' | 'capture' | 'processing' | 'success' | 'history'>('status');
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);
  const [history, setHistory] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      loadHistory();
    } else {
      stopCamera();
      setView('status');
      setError(null);
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setLoading(true);
    const marked = await checkStaffAttendanceToday(userId);
    setIsAlreadyMarked(marked);
    setLoading(false);
  };

  const loadHistory = async () => {
    const data = await fetchStaffAttendanceHistory(userId);
    setHistory(data);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    if (!storedDescriptor) {
      setError('Face ID not registered. Please register your face in the profile section first.');
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setView('capture');
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current || !storedDescriptor) return;

    setLoading(true);
    setError(null);
    setView('processing');

    try {
      // 1. Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      // Check distance if school location is set
      if (schoolLat && schoolLng) {
        const distance = calculateDistance(schoolLat, schoolLng, userLat, userLng);
        if (distance > 100) {
          setError(`You are outside the school premises. Please come inside to mark attendance. (Distance: ${Math.round(distance)}m)`);
          setView('capture');
          setLoading(false);
          return;
        }
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 2. Get Face Descriptor from Selfie
      const capturedDescriptor = await getFaceDescriptor(video);
      if (!capturedDescriptor) {
        setError('No face detected. Please try again in better lighting.');
        setView('capture');
        setLoading(false);
        return;
      }

      // 3. Compare with Stored Descriptor
      const { isMatch, distance } = await compareFaces(storedDescriptor, capturedDescriptor);
      if (!isMatch) {
        setError(`Face verification failed. Please ensure you are the registered user. (Confidence: ${Math.round((1 - distance) * 100)}%)`);
        setView('capture');
        setLoading(false);
        return;
      }

      // 4. Upload Selfie to Supabase
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.6));
      if (!blob) throw new Error('Blob creation failed');

      const fileName = `selfie_${userId}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attendance-selfies')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attendance-selfies')
        .getPublicUrl(fileName);

      // 5. Submit Attendance Record
      const record: StaffAttendanceRecord = {
        user_id: userId,
        status: 'present',
        selfie_url: publicUrl,
        location_lat: userLat,
        location_lng: userLng,
        is_verified: true,
        role: role
      };

      const success = await submitStaffAttendance(record);
      if (success) {
        setView('success');
        stopCamera();
        setIsAlreadyMarked(true);
        loadHistory();
      } else {
        throw new Error('Failed to save attendance record');
      }
    } catch (err: any) {
      console.error('Attendance error:', err);
      setError(err.message || 'An error occurred during verification.');
      setView('capture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="STAFF ATTENDANCE">
      <div className="p-2">
        {view === 'status' && (
          <div className="space-y-6 py-4">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner ${isAlreadyMarked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-500/10 text-brand-500'}`}>
              {isAlreadyMarked ? <CheckCircle2 size={40} /> : <Clock size={40} />}
            </div>
            <div className="text-center">
              <h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">
                {isAlreadyMarked ? 'Attendance Marked' : 'Daily Check-in'}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 px-4 leading-relaxed">
                {isAlreadyMarked 
                  ? 'You have already marked your attendance for today.' 
                  : 'Please complete face verification to mark your attendance.'}
              </p>
            </div>

            <div className="space-y-3">
              {!isAlreadyMarked && (
                <button 
                  onClick={startCamera}
                  className="w-full py-5 rounded-[2rem] bg-brand-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Camera size={18} /> START VERIFICATION
                </button>
              )}
              <button 
                onClick={() => setView('history')}
                className="w-full py-5 rounded-[2rem] bg-slate-100 dark:bg-white/5 text-slate-500 font-black uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <History size={18} /> VIEW HISTORY
              </button>
            </div>
          </div>
        )}

        {view === 'capture' && (
          <div className="space-y-6 py-4">
            <div className="relative w-full aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-white/10 shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-dashed border-white/60 rounded-full"></div>
              </div>
              {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Verifying Face...</span>
                </div>
              )}
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-800">
                <AlertCircle size={14} />
                <span className="text-[10px] font-black uppercase">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => { stopCamera(); setView('status'); }}
                className="flex-1 py-5 rounded-[2rem] bg-slate-100 dark:bg-white/5 text-slate-500 font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                CANCEL
              </button>
              <button 
                onClick={captureAndVerify}
                disabled={loading}
                className="flex-[2] py-5 rounded-[2rem] bg-emerald-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} /> VERIFY & MARK
              </button>
            </div>
          </div>
        )}

        {view === 'processing' && (
          <div className="py-12 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                <MapPin size={32} className="animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Processing</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 px-4 leading-relaxed">
                Verifying location and facial identity...
              </p>
            </div>
          </div>
        )}

        {view === 'success' && (
          <div className="py-12 text-center space-y-6">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-in zoom-in duration-500">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Attendance Marked</h4>
              <p className="text-[10px] text-emerald-500 font-black uppercase mt-2 px-4 leading-relaxed tracking-widest">
                Identity verified. Your attendance has been logged.
              </p>
            </div>
            <button 
              onClick={() => setView('status')}
              className="w-full py-4 rounded-[1.8rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-xs tracking-widest shadow-xl"
            >
              DONE
            </button>
          </div>
        )}

        {view === 'history' && (
          <div className="flex flex-col h-[60vh] premium-subview-enter">
            <div className="flex items-center gap-3 mb-5 px-1">
              <button onClick={() => setView('status')} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-500 transition-all active:scale-90">
                <X size={18} />
              </button>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase leading-tight">MY ATTENDANCE</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent 30 Records</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 no-scrollbar">
              {loading ? (
                <div className="text-center py-16"><Loader2 className="animate-spin mx-auto text-brand-500" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-16 opacity-40 uppercase text-[10px] font-black tracking-widest dark:text-gray-500">No records found</div>
              ) : (
                history.map(h => (
                  <div key={h.id} className="p-4 bg-white dark:bg-dark-950 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner overflow-hidden">
                        {h.selfie_url ? <img src={h.selfie_url} className="w-full h-full object-cover" /> : <Calendar size={20} />}
                      </div>
                      <div>
                        <h5 className="font-black text-sm text-slate-800 dark:text-white">
                          {new Date(h.check_in_time!).toLocaleDateString()}
                        </h5>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} /> {new Date(h.check_in_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10">
                      {h.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="pt-6">
              <button onClick={() => setView('status')} className="w-full py-4 rounded-[1.8rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Back</button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Modal>
  );
};
