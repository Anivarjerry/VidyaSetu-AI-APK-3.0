
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Camera, Scan, ShieldCheck, Loader2, X, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { getFaceDescriptor } from '../services/faceRecognitionService';
import { updateUserFaceData } from '../services/dashboardService';
import { supabase } from '../services/supabaseClient';

interface FaceIDManagementProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentPassword?: string;
  onSuccess: () => void;
}

export const FaceIDManagement: React.FC<FaceIDManagementProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  currentPassword,
  onSuccess
}) => {
  const [step, setStep] = useState<'verify' | 'instructions' | 'capture' | 'processing' | 'success'>('verify');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('verify');
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'capture' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStep('capture');
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const handleVerify = () => {
    if (password === currentPassword) {
      setStep('instructions');
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      // Capture photo FIRST before switching view to avoid null reference
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      setLoading(true);
      setError(null);
      setStep('processing');

      // 1. Get Face Descriptor
      const descriptor = await getFaceDescriptor(canvas); // Use canvas instead of video
      if (!descriptor) {
        setError('No face detected. Please try again in better lighting.');
        setStep('capture');
        setLoading(false);
        return;
      }

      // 2. Upload Photo to Supabase
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) throw new Error('Blob creation failed');

      const fileName = `${userId}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('staff-faces')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('staff-faces')
        .getPublicUrl(fileName);

      // 3. Update User Record
      const success = await updateUserFaceData(userId, descriptor, publicUrl);
      if (success) {
        setStep('success');
        stopCamera();
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to update profile data');
      }
    } catch (err: any) {
      console.error('Face registration error:', err);
      setError(err.message || 'An error occurred during registration.');
      setStep('capture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="FACE ID SETUP">
      <div className="p-2">
        {step === 'verify' && (
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 bg-brand-500/10 text-brand-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
              <Lock size={40} />
            </div>
            <div className="text-center">
              <h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Security Check</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 px-4 leading-relaxed">
                Enter your login password to manage Face ID data.
              </p>
            </div>
            <div className="space-y-4">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER PASSWORD"
                className="w-full p-5 rounded-[1.5rem] bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 font-black text-xs tracking-widest outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-800">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-black uppercase">{error}</span>
                </div>
              )}
              <button 
                onClick={handleVerify}
                className="w-full py-5 rounded-[2rem] bg-brand-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
              >
                VERIFY & CONTINUE
              </button>
            </div>
          </div>
        )}

        {step === 'instructions' && (
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
              <Scan size={40} />
            </div>
            <div className="text-center">
              <h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Instructions</h4>
              <div className="mt-4 space-y-3 text-left bg-slate-50 dark:bg-dark-950 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">Ensure good lighting on your face.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">Remove glasses, masks, or caps.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">Look directly at the camera.</p>
                </div>
              </div>
            </div>
            <button 
              onClick={startCamera}
              className="w-full py-5 rounded-[2rem] bg-emerald-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
            >
              START CAMERA
            </button>
          </div>
        )}

        {step === 'capture' && (
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
                  <span className="text-xs font-black uppercase tracking-widest">Processing Face...</span>
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
                onClick={() => { stopCamera(); setStep('instructions'); }}
                className="flex-1 py-5 rounded-[2rem] bg-slate-100 dark:bg-white/5 text-slate-500 font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                BACK
              </button>
              <button 
                onClick={captureAndProcess}
                disabled={loading}
                className="flex-[2] py-5 rounded-[2rem] bg-brand-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Camera size={18} /> CAPTURE FACE
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-brand-500">
                <Scan size={32} className="animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Analyzing Face</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 px-4 leading-relaxed">
                Extracting facial features and securing your data...
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12 text-center space-y-6">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-in zoom-in duration-500">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Registration Complete</h4>
              <p className="text-[10px] text-emerald-500 font-black uppercase mt-2 px-4 leading-relaxed tracking-widest">
                Face ID has been successfully linked to your profile.
              </p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Modal>
  );
};
