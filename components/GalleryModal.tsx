
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
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
    if (isOpen) {
      checkUsage();
      // Default to current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      setSelectedMonth(currentMonth);
      setView('months');
    }
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
          // Limit 800KB client check to avoid Supabase payload limits
          if (file.size > 800000) { 
              alert("Image too large. Please pick under 800KB.");
              return;
          }
          setUploadFile(file);
      }
  };

  const convertBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const handleUpload = async () => {
      if (!uploadFile || !caption) return;
      setUploading(true);
      try {
          const base64 = await convertBase64(uploadFile);
          const result = await uploadGalleryPhoto({
              school_id: schoolId,
              image_data: base64,
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

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SCHOOL GALLERY">
      <div className="h-[75vh] flex flex-col">
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
                            </div>
                        ) : (
                            <>
                                <Camera size={32} className="mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Tap to Pick Photo</span>
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
                        {uploading ? <Loader2 className="animate-spin" /> : "Upload to Gallery"}
                    </button>
                </div>
            )}
        </div>
      </div>
    </Modal>
  );
};
