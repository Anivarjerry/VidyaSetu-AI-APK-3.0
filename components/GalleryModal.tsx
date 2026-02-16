
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Calendar, Image as ImageIcon, Camera, Loader2, Lock, Eye, Tag } from 'lucide-react';
import { fetchGalleryImages, uploadGalleryPhoto, fetchGalleryUsage, incrementGalleryView } from '../services/dashboardService';
import { GalleryItem } from '../types';
import { useModalBackHandler } from '../hooks/useModalBackHandler';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  userId: string;
  canUpload: boolean; // Principal/Teacher only
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, schoolId, userId, canUpload }) => {
  useModalBackHandler(isOpen, onClose);

  const [view, setView] = useState<'months' | 'photos' | 'detail' | 'upload'>('months');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Usage tracking
  const [viewUsage, setViewUsage] = useState({ view_count: 0, limit: 10 });
  const [isLocked, setIsLocked] = useState(false);

  // Upload Form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [tag, setTag] = useState('Event');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      checkUsage();
      // Default to current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      setSelectedMonth(currentMonth);
      setView('months');
    } else {
        document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const checkUsage = async () => {
      // Principal/Teacher/Admin don't have limits usually, but logic applies generally
      if (canUpload) return; 

      const usage = await fetchGalleryUsage(userId);
      setViewUsage(usage);
      if (usage.view_count >= usage.limit) setIsLocked(true);
  };

  const handleMonthSelect = (month: string) => {
      setSelectedMonth(month);
      loadPhotos(month);
  };

  const loadPhotos = async (month: string) => {
      setLoading(true);
      const data = await fetchGalleryImages(schoolId, month);
      setPhotos(data);
      setView('photos');
      setLoading(false);
  };

  const handlePhotoClick = async (photo: GalleryItem) => {
      if (canUpload) {
          // Staff can view freely
          setSelectedPhoto(photo);
          setView('detail');
          return;
      }

      if (isLocked) {
          alert("Monthly view limit reached (10/10). Gallery is locked for students/parents.");
          return;
      }
      
      const allowed = await incrementGalleryView(userId);
      if (allowed) {
          setSelectedPhoto(photo);
          setView('detail');
          checkUsage(); // Update count locally
      } else {
          setIsLocked(true);
          alert("Monthly view limit reached.");
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setUploadFile(file);
      }
  };

  // SMART COMPRESSION FUNCTION
  const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  
                  // Target Max Dimension (HD Quality)
                  const MAX_DIMENSION = 1280; 

                  // Calculate new dimensions while maintaining aspect ratio
                  if (width > height) {
                      if (width > MAX_DIMENSION) {
                          height *= MAX_DIMENSION / width;
                          width = MAX_DIMENSION;
                      }
                  } else {
                      if (height > MAX_DIMENSION) {
                          width *= MAX_DIMENSION / height;
                          height = MAX_DIMENSION;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      // Compress to JPEG with 0.7 quality (Good balance)
                      // This usually reduces a 5MB file to ~150-200KB
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                      resolve(dataUrl);
                  } else {
                      reject(new Error("Compression failed"));
                  }
              };
              img.onerror = (error) => reject(error);
          };
          reader.onerror = (error) => reject(error);
      });
  };

  const handleUpload = async () => {
      if (!uploadFile || !caption) return;
      setUploading(true);
      try {
          // Use the new compressImage function instead of raw base64
          const compressedBase64 = await compressImage(uploadFile);
          
          const result = await uploadGalleryPhoto({
              school_id: schoolId,
              image_data: compressedBase64,
              caption: caption,
              tag: tag,
              month_year: selectedMonth,
              uploaded_by: userId
          });

          if (result.success) {
              alert("Photo Uploaded Successfully!");
              setUploadFile(null);
              setCaption('');
              setView('photos');
              loadPhotos(selectedMonth);
          } else {
              alert("Upload Failed: " + result.message);
          }
      } catch (e) { alert("Error processing image."); }
      setUploading(false);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Background with premium fade and blur */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm premium-modal-backdrop" onClick={onClose} />
      
      {/* Pop-up area */}
      <div 
        className="glass-card shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] w-full max-w-md premium-modal-content transition-all relative overflow-hidden flex flex-col max-h-[85vh] z-[10000] border border-white/20 bg-white dark:bg-dark-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase leading-tight">SCHOOL GALLERY</h3>
          <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-all active:scale-90"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar bg-white dark:bg-dark-900 flex-1">
            <div className="h-full flex flex-col">
                {/* Header Stats */}
                <div className="flex justify-between items-center px-2 mb-4 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    {!canUpload ? (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                            <Eye size={14} />
                            <span>Views: {viewUsage.view_count}/{viewUsage.limit}</span>
                        </div>
                    ) : (
                        <div className="text-[10px] font-black uppercase text-slate-400">Manage Photos</div>
                    )}
                    
                    {canUpload && (
                        <button onClick={() => setView('upload')} className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">
                            <Upload size={12} /> Add New
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar relative">
                    
                    {/* VIEW 1: MONTH SELECTION */}
                    {view === 'months' && (
                        <div className="space-y-3 premium-subview-enter">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-2">Select Month</p>
                            {/* Generate last 6 months */}
                            {Array.from({length: 6}).map((_, i) => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - i);
                                const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                                const val = d.toISOString().slice(0, 7);
                                return (
                                    <button key={val} onClick={() => handleMonthSelect(val)} className="w-full p-5 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/5 rounded-[2rem] flex items-center justify-between shadow-sm active:scale-95 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all"><Calendar size={24} /></div>
                                            <span className="font-black text-slate-800 dark:text-white uppercase">{label}</span>
                                        </div>
                                        <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg font-bold text-slate-400">OPEN</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* VIEW 2: PHOTO GRID */}
                    {view === 'photos' && (
                        <div className="premium-subview-enter">
                            <button onClick={() => setView('months')} className="mb-4 text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 hover:text-brand-500"><X size={12} /> Back to Months</button>
                            {loading ? (
                                <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-brand-500" /></div>
                            ) : photos.length === 0 ? (
                                <div className="text-center py-20 opacity-40 uppercase text-[10px] font-black tracking-widest">No photos uploaded</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {photos.map(p => (
                                        <div key={p.id} onClick={() => handlePhotoClick(p)} className="aspect-square rounded-3xl overflow-hidden relative shadow-sm border border-slate-100 dark:border-white/5 cursor-pointer active:scale-95 transition-all group">
                                            <img src={p.image_data} alt="gallery" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <span className="text-[9px] font-black text-white uppercase truncate">{p.tag}</span>
                                            </div>
                                            {(!canUpload && isLocked) && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><Lock className="text-rose-500" /></div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW 3: DETAIL VIEW */}
                    {view === 'detail' && selectedPhoto && (
                        <div className="premium-subview-enter flex flex-col h-full">
                            <button onClick={() => setView('photos')} className="mb-4 text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 hover:text-brand-500"><X size={12} /> Back to Grid</button>
                            <div className="rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 dark:border-white/5 mb-4 bg-black">
                                <img src={selectedPhoto.image_data} alt="Full view" className="w-full h-auto max-h-[50vh] object-contain" />
                            </div>
                            <div className="p-5 bg-white dark:bg-dark-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-brand-500/10 text-brand-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Tag size={10} /> {selectedPhoto.tag}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(selectedPhoto.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 italic leading-relaxed">"{selectedPhoto.caption}"</p>
                            </div>
                        </div>
                    )}

                    {/* VIEW 4: UPLOAD FORM */}
                    {view === 'upload' && (
                        <div className="premium-subview-enter space-y-4">
                            <button onClick={() => setView('photos')} className="mb-2 text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><X size={12} /> Cancel</button>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="h-48 rounded-[2.5rem] border-2 border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-white/5 cursor-pointer hover:border-brand-500 transition-colors"
                            >
                                {uploadFile ? (
                                    <div className="text-center">
                                        <ImageIcon size={32} className="mx-auto mb-2 text-brand-500" />
                                        <span className="text-xs font-bold text-brand-600">Image Selected</span>
                                        <p className="text-[9px] font-black text-slate-400 mt-1 uppercase">Ready to Compress</p>
                                    </div>
                                ) : (
                                    <>
                                        <Camera size={32} className="mb-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Tap to Pick Photo</span>
                                        <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase">Supports High Res</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tag</label>
                                <select value={tag} onChange={(e) => setTag(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20">
                                    <option>Event</option>
                                    <option>Function</option>
                                    <option>Competition</option>
                                    <option>Birthday</option>
                                    <option>Trip</option>
                                    <option>Achievement</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Caption</label>
                                <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Short description..." className="w-full p-4 bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>

                            <button onClick={handleUpload} disabled={uploading || !uploadFile} className="w-full py-4 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {uploading ? <><Loader2 className="animate-spin" /> Processing...</> : "Upload to Gallery"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
