import React, { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../stores/callStore';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  User, ShieldCheck, Wifi, Maximize2, Minimize2, MoreVertical
} from 'lucide-react';

const GlobalCallUI: React.FC = () => {
  const store = useCallStore();
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let interval: number;
    if (store.status === 'connected' && store.startTime) {
      interval = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - store.startTime!) / 1000));
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [store.status, store.startTime]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = store.localStream || null;
    }
  }, [store.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = store.remoteStream || null;
    }
  }, [store.remoteStream]);

  if (store.status === 'idle') return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const commonProps = {
    store,
    duration,
    formatTime,
    localVideoRef,
    remoteVideoRef,
    toggleMinimize: () => setIsMinimized(!isMinimized)
  };

  if (isMinimized && store.status === 'connected') {
    return <MinimizedCallCard {...commonProps} />;
  }

  return <FullScreenCallUI {...commonProps} />;
};

const MinimizedCallCard: React.FC<any> = ({ store, duration, formatTime, localVideoRef, toggleMinimize }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] w-80 bg-darkGreen/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in flex flex-col">
      <div className="relative h-40 bg-slate-900/50">
         {!store.isCamOff && (
           <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
         )}
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {store.isCamOff && <User className="text-white/20" size={48} />}
         </div>
         
         <div className="absolute top-2 right-2 flex gap-2">
            <button onClick={toggleMinimize} className="p-1.5 bg-black/40 text-white rounded-lg hover:bg-black/60 backdrop-blur-md transition-colors">
              <Maximize2 size={14} />
            </button>
         </div>
      </div>

      <div className="p-4 flex justify-between items-center bg-white/5 backdrop-blur-md">
         <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-softMint flex items-center justify-center text-darkGreen font-bold text-lg shadow-inner">
                {store.partner?.name.charAt(0)}
            </div>
            <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">{store.partner?.name}</p>
                <p className="text-primary text-xs font-mono">{formatTime(duration)}</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button onClick={store.toggleMute} className={`p-2.5 rounded-full transition-colors ${store.isMuted ? 'bg-white text-darkGreen' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {store.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button onClick={store.endCall} className="p-2.5 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-lg shadow-red-500/20">
              <PhoneOff size={16} />
            </button>
         </div>
      </div>
    </div>
  );
};

const FullScreenCallUI: React.FC<any> = ({ store, duration, formatTime, localVideoRef, remoteVideoRef, toggleMinimize }) => {
  const isIncoming = store.status === 'incoming';
  const isOutgoing = store.status === 'outgoing';
  const isConnected = store.status === 'connected';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm md:max-w-md h-full md:h-auto md:aspect-[9/16] max-h-[850px] bg-gradient-to-br from-slate-900 via-darkGreen to-slate-900 rounded-none md:rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"></div>

        <div className="relative z-10 p-6 flex justify-between items-start">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 text-xs font-medium">
              <ShieldCheck size={12} className="text-primary" /> Encrypted
           </div>
           {isConnected && (
             <button onClick={toggleMinimize} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                <Minimize2 size={20} />
             </button>
           )}
        </div>

        {store.error && (
          <div className="mx-6 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-100 text-xs px-3 py-2">
            {store.error}
          </div>
        )}

        <div className="flex-1 relative flex flex-col items-center justify-center z-10 p-8">
            {(isConnected || isOutgoing) && store.remoteStream ? (
              <div className="absolute inset-0">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
            ) : null}

            <div className="flex flex-col items-center relative z-10">
                <div className="relative">
                    {(isIncoming || isOutgoing) && (
                        <>
                            <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping delay-75"></div>
                            <div className="absolute -inset-4 rounded-full border border-primary/20 animate-pulse"></div>
                        </>
                    )}
                    
                    <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl relative z-10">
                        {store.partner?.avatar ? (
                            <img src={store.partner.avatar} alt={store.partner.name} className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} className="text-white/50" />
                        )}
                    </div>
                </div>

                <h2 className="mt-6 text-2xl font-bold text-white tracking-wide text-center">{store.partner?.name}</h2>
                <p className="text-primary/80 text-sm font-medium mt-1 mb-2">{store.partner?.role || 'Unknown'}</p>
                
                <div className="px-4 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 text-white/90 text-sm font-mono tracking-wider">
                    {isIncoming && 'Incoming Call...'}
                    {isOutgoing && 'Calling...'}
                    {isConnected && formatTime(duration)}
                    {store.status === 'ended' && 'Call Ended'}
                </div>
            </div>

            {!store.isCamOff && (isConnected || isOutgoing) && store.localStream && (
                <div className="absolute bottom-40 right-6 w-28 h-40 bg-black/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 shadow-xl z-20">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
            )}
        </div>

        <div className="relative z-20 bg-black/20 backdrop-blur-xl border-t border-white/10 p-8 pb-10">
            {isIncoming && (
                <div className="flex items-center justify-center gap-6 w-full">
                    <button 
                        onClick={store.rejectCall}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 backdrop-blur-lg flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-300 shadow-lg">
                            <PhoneOff size={28} />
                        </div>
                        <span className="text-white/70 text-xs font-semibold">Decline</span>
                    </button>

                    <button 
                        onClick={store.acceptCall}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 backdrop-blur-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-darkGreen transition-all duration-300 shadow-lg">
                            <Phone size={28} />
                        </div>
                        <span className="text-white/70 text-xs font-semibold">Accept</span>
                    </button>
                </div>
            )}

            {(isConnected || isOutgoing) && (
                <div className="flex flex-col gap-6">
                    <div className="flex justify-center gap-6">
                        <button 
                            onClick={store.toggleMute}
                            className={`p-4 rounded-full border backdrop-blur-md transition-all duration-300 ${
                                store.isMuted 
                                ? 'bg-white text-darkGreen border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                        >
                            {store.isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 backdrop-blur-md transition-colors">
                            <MoreVertical size={24} />
                        </button>

                        <button 
                            onClick={store.toggleCam}
                            className={`p-4 rounded-full border backdrop-blur-md transition-all duration-300 ${
                                store.isCamOff 
                                ? 'bg-white text-darkGreen border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                        >
                            {store.isCamOff ? <VideoOff size={24} /> : <Video size={24} />}
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button 
                            onClick={store.endCall}
                            className="w-full max-w-[200px] py-4 rounded-2xl bg-red-500/90 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 backdrop-blur-md flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            <PhoneOff size={24} /> End Call
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default GlobalCallUI;
