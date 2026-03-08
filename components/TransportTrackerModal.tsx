
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Vehicle } from '../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { Truck, MapPin, RefreshCw, Navigation, ExternalLink, ShieldAlert, Clock, X, Maximize2, Minimize2 } from 'lucide-react';
import { fetchVehicles, fetchVehicleHistory } from '../services/dashboardService';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
import 'leaflet/dist/leaflet.css';

interface TransportTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
}

// Custom Truck Icon for Leaflet
const truckIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Component to handle map centering and zooming
const MapController: React.FC<{ center: [number, number] | null }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom() < 10 ? 16 : map.getZoom(), {
        animate: true,
        duration: 1
      });
    }
  }, [center, map]);
  return null;
};

export const TransportTrackerModal: React.FC<TransportTrackerModalProps> = ({ isOpen, onClose, schoolId }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<{latitude: number, longitude: number}[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Interpolation state for smooth movement
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const currentPosRef = useRef<[number, number] | null>(null);
  const targetPosRef = useRef<[number, number] | null>(null);
  const animationRef = useRef<number | null>(null);

  const pollingInterval = useRef<number | null>(null);
  const CACHE_KEY = `vidyasetu_transport_${schoolId}`;

  const isVehicleLive = (updatedAt: string | undefined) => {
    if (!updatedAt) return false;
    const lastUpdate = new Date(updatedAt).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - lastUpdate) / (1000 * 60);
    return diffInMinutes < 3;
  };

  useEffect(() => {
    if (isOpen) {
      loadVehicles();
      pollingInterval.current = window.setInterval(() => {
        autoRefresh();
      }, 10000);
    } else {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    }
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedVehicle?.id) {
        loadHistory(selectedVehicle.id);
        if (selectedVehicle.last_lat && selectedVehicle.last_lng) {
            const newTarget: [number, number] = [selectedVehicle.last_lat, selectedVehicle.last_lng];
            if (!currentPosRef.current) {
                currentPosRef.current = newTarget;
                setCurrentPos(newTarget);
            }
            targetPosRef.current = newTarget;
            startAnimation();
        }
    } else {
        setHistory([]);
        setCurrentPos(null);
        currentPosRef.current = null;
        targetPosRef.current = null;
    }
  }, [selectedVehicle?.id]);

  // Smooth interpolation logic
  const startAnimation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    const animate = () => {
        if (!targetPosRef.current || !currentPosRef.current) return;
        
        const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;
        const step = 0.05; // Smoothing factor
        
        const nextLat = lerp(currentPosRef.current[0], targetPosRef.current[0], step);
        const nextLng = lerp(currentPosRef.current[1], targetPosRef.current[1], step);
        
        const dist = Math.sqrt(Math.pow(nextLat - targetPosRef.current[0], 2) + Math.pow(nextLng - targetPosRef.current[1], 2));
        
        if (dist < 0.000001) {
            currentPosRef.current = targetPosRef.current;
            setCurrentPos(targetPosRef.current);
            return;
        }
        
        const nextPos: [number, number] = [nextLat, nextLng];
        currentPosRef.current = nextPos;
        setCurrentPos(nextPos);
        animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const loadVehicles = async () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            setVehicles(JSON.parse(cached));
            setLoading(false);
        } catch(e) {}
    } else {
        setLoading(true);
    }

    const data = await fetchVehicles(schoolId);
    setVehicles(data);
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    setLoading(false);
  };

  const loadHistory = async (vId: string) => {
    const data = await fetchVehicleHistory(vId);
    setHistory(data);
  };

  const autoRefresh = async () => {
    const data = await fetchVehicles(schoolId);
    setVehicles(data);
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    if (selectedVehicle) {
       const updated = data.find(v => v.id === selectedVehicle.id);
       if (updated) {
           setSelectedVehicle(updated);
           if (updated.last_lat && updated.last_lng) {
               targetPosRef.current = [updated.last_lat, updated.last_lng];
               startAnimation();
           }
       }
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await autoRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const polylinePath = useMemo(() => {
    return history.map(h => [h.latitude, h.longitude] as [number, number]);
  }, [history]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SCHOOL TRANSPORT" maxWidth={isFullScreen ? "max-w-full" : "max-w-2xl"}>
      <div className={`space-y-4 ${isFullScreen ? 'h-[80vh] flex flex-col' : ''}`}>
        {selectedVehicle ? (
          <div className={`space-y-6 premium-subview-enter ${isFullScreen ? 'flex-1 flex flex-col' : ''}`}>
             {/* Status Header */}
             <div className={`p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl relative overflow-hidden transition-colors duration-500 ${isVehicleLive(selectedVehicle.updated_at) ? 'bg-emerald-500 shadow-emerald-100' : 'bg-slate-400 shadow-slate-100'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                       <Truck size={32} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black uppercase leading-tight">{selectedVehicle.vehicle_number}</h3>
                       <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">
                          {selectedVehicle.tracking_mode === 'device' ? 'GPS DEVICE TRACKING' : 'PHONE APP TRACKING'}
                       </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
                        {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    <button onClick={() => setSelectedVehicle(null)} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
                        <X size={20} />
                    </button>
                </div>
             </div>

             {/* Map View */}
             <div className={`relative rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-dark-800 shadow-2xl ${isFullScreen ? 'flex-1' : 'h-[400px]'}`}>
                <MapContainer
                    center={currentPos || [20.5937, 78.9629]}
                    zoom={currentPos ? 16 : 5}
                    style={{ width: '100%', height: '100%', zIndex: 0 }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {currentPos && (
                        <>
                            <MapController center={currentPos} />
                            <Marker position={currentPos} icon={truckIcon} />
                            <Polyline 
                                positions={polylinePath}
                                pathOptions={{
                                    color: "#10b981",
                                    weight: 4,
                                    opacity: 0.8
                                }}
                            />
                        </>
                    )}
                </MapContainer>
                
                {/* Overlay Info */}
                <div className="absolute bottom-6 left-6 right-6 flex gap-3 z-[1000]">
                    <div className="flex-1 bg-white/90 dark:bg-dark-800/90 backdrop-blur-md p-4 rounded-3xl border border-white/50 shadow-lg flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                            <Navigation size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {selectedVehicle.tracking_mode === 'device' ? 'DEVICE ID' : 'DRIVER'}
                            </p>
                            <p className="font-black text-slate-800 dark:text-white truncate uppercase">
                                {selectedVehicle.tracking_mode === 'device' ? (selectedVehicle.device_id || 'N/A') : (selectedVehicle.driver_name || 'N/A')}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/90 dark:bg-dark-800/90 backdrop-blur-md p-4 rounded-3xl border border-white/50 shadow-lg flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVehicleLive(selectedVehicle.updated_at) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                            <MapPin size={20} className={isVehicleLive(selectedVehicle.updated_at) ? 'animate-bounce' : ''} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS</p>
                            <p className={`font-black uppercase ${isVehicleLive(selectedVehicle.updated_at) ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {isVehicleLive(selectedVehicle.updated_at) ? 'LIVE' : 'OFFLINE'}
                            </p>
                        </div>
                    </div>
                </div>
             </div>

             {!isVehicleLive(selectedVehicle.updated_at) && (
                <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 flex items-center gap-4 text-rose-600 dark:text-rose-400">
                   <ShieldAlert size={32} className="shrink-0" />
                   <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1">Signal Lost</p>
                      <p className="text-xs font-bold leading-tight italic">The vehicle is currently offline. Last known position is shown on the map.</p>
                   </div>
                </div>
             )}

             {!isFullScreen && (
                <button onClick={() => setSelectedVehicle(null)} className="w-full py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-brand-500 transition-colors">Back to Vehicle List</button>
             )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{vehicles.length} Total Vehicles</span>
               <button onClick={handleManualRefresh} className={`p-2 bg-emerald-500/10 text-emerald-500 rounded-xl active:scale-90 transition-all border border-emerald-500/20 shadow-lg shadow-emerald-500/5`}>
                  <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
               </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3 no-scrollbar">
              {loading ? (
                 <div className="text-center py-12"><RefreshCw className="animate-spin mx-auto text-brand-500" /></div>
              ) : vehicles.length === 0 ? (
                 <div className="text-center py-12 opacity-30 uppercase font-black text-[10px] tracking-widest">No transport linked</div>
              ) : (
                vehicles.map(v => {
                  const live = isVehicleLive(v.updated_at);
                  return (
                    <div key={v.id} onClick={() => setSelectedVehicle(v)} className="bg-white dark:bg-dark-800 p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between cursor-pointer hover:border-brand-500 transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${live ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <Truck size={24} />
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase leading-tight">{v.vehicle_number}</h4>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{v.driver_name || 'No Driver'}</p>
                        </div>
                      </div>
                      {live ? (
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live
                         </div>
                      ) : (
                          <div className="px-3 py-1 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-full text-[9px] font-black uppercase">Offline</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
