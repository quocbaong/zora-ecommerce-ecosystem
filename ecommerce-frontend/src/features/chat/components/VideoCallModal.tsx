import React, { useEffect, useRef, useState } from 'react';
import {
  MicOff, Mic, VideoOff, Video, PhoneOff, Maximize2, Minimize2,
} from 'lucide-react';

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participantName: string;
  callType: 'video' | 'audio';
  callStatus: 'calling' | 'in_call';
  isInitiator: boolean;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

const VideoCallModal: React.FC<Props> = ({
  localStream,
  remoteStream,
  participantName,
  callType,
  callStatus,
  isInitiator,
  onHangUp,
  onToggleMute,
  onToggleCamera,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Assign streams after the video elements mount
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start call timer when in_call
  useEffect(() => {
    if (callStatus === 'in_call') {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleToggleMute = () => {
    setMuted((v) => !v);
    onToggleMute();
  };

  const handleToggleCamera = () => {
    setCameraOff((v) => !v);
    onToggleCamera();
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm ${fullscreen ? '' : 'p-4'}`}>
      <div className={`relative flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ${fullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-2xl aspect-video'}`}>

        {/* Remote video (full background) */}
        {callType === 'video' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-4xl font-bold text-white">
              {participantName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

        {/* Top bar: participant name + status */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-4">
          <div>
            <p className="text-white font-semibold text-base">{participantName}</p>
            <p className="text-gray-300 text-xs mt-0.5">
              {callStatus === 'calling'
                ? isInitiator ? 'Đang gọi...' : 'Đang kết nối...'
                : formatDuration(callDuration)}
            </p>
          </div>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Calling animation when waiting */}
        {callStatus === 'calling' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-white z-10 relative">
                  {participantName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute inset-0 rounded-full bg-orange-400/30 animate-ping" />
              </div>
              <p className="text-white text-sm font-medium">
                {isInitiator ? `Đang gọi cho ${participantName}...` : 'Đang kết nối...'}
              </p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        {callType === 'video' && (
          <div className="absolute bottom-20 right-4 w-28 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-lg z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {cameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Control bar */}
        <div className="relative z-10 mt-auto flex items-center justify-center gap-4 pb-6 pt-3">
          <button
            onClick={handleToggleMute}
            className={`flex flex-col items-center gap-1 group`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
              {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </div>
            <span className="text-xs text-gray-300">{muted ? 'Bỏ tắt' : 'Tắt mic'}</span>
          </button>

          {callType === 'video' && (
            <button onClick={handleToggleCamera} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${cameraOff ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
                {cameraOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
              </div>
              <span className="text-xs text-gray-300">{cameraOff ? 'Bật cam' : 'Tắt cam'}</span>
            </button>
          )}

          <button onClick={onHangUp} className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/40">
              <PhoneOff className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-gray-300">Kết thúc</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
