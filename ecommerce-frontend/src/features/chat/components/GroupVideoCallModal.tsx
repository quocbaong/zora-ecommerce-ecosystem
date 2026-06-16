import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Mic, VideoOff, Video, PhoneOff, Maximize2, Minimize2, Users } from 'lucide-react';
import type { GroupParticipant } from '../hooks/useGroupCall';

interface Props {
  localStream: MediaStream | null;
  participants: Record<string, GroupParticipant>;
  groupName: string;
  callType: 'video' | 'audio';
  localUserName?: string;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

function ParticipantVideo({ participant }: { participant: GroupParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const initial = (participant.name || '?').charAt(0).toUpperCase();

  return (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center aspect-video">
      {participant.stream ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center text-2xl font-bold text-white">
            {initial}
          </div>
          <span className="text-gray-400 text-xs">{participant.name}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-0.5 text-white text-[10px] truncate max-w-[80%]">
        {participant.name}
      </div>
    </div>
  );
}

const GroupVideoCallModal: React.FC<Props> = ({
  localStream,
  participants,
  groupName,
  callType,
  localUserName = 'Bạn',
  onHangUp,
  onToggleMute,
  onToggleCamera,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleToggleMute = () => { setMuted((v) => !v); onToggleMute(); };
  const handleToggleCamera = () => { setCameraOff((v) => !v); onToggleCamera(); };

  const participantList = Object.values(participants);
  const totalCount = participantList.length + 1; // +1 for self

  // Grid layout based on participant count
  const gridCols = totalCount <= 2 ? 'grid-cols-2'
    : totalCount <= 4 ? 'grid-cols-2'
    : totalCount <= 6 ? 'grid-cols-3'
    : 'grid-cols-4';

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm ${fullscreen ? '' : 'p-4'}`}>
      <div className={`relative flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ${fullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl h-[80vh]'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-900/80 backdrop-blur-sm z-10 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-400" />
            <span className="text-white font-semibold text-sm">{groupName}</span>
            <span className="text-gray-400 text-xs">· {formatDuration(callDuration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">{totalCount} người</span>
            <button
              onClick={() => setFullscreen((v) => !v)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video grid */}
        <div className={`flex-1 overflow-auto p-3 grid ${gridCols} gap-3 content-start`}>
          {/* Local video */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center aspect-video">
            {callType === 'video' && localStream ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-orange-500/70 flex items-center justify-center text-2xl font-bold text-white">
                  {(localUserName).charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-400 text-xs">{localUserName}</span>
              </div>
            )}
            {cameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-0.5 text-white text-[10px]">
              {localUserName} {muted && '🔇'}
            </div>
          </div>

          {/* Remote participants */}
          {participantList.map((p) => (
            <ParticipantVideo key={p.userId} participant={p} />
          ))}

          {/* Empty placeholder when waiting */}
          {participantList.length === 0 && (
            <div className="bg-gray-800/50 rounded-xl flex items-center justify-center aspect-video border border-dashed border-gray-700">
              <div className="text-center text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Đang chờ thành viên tham gia...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 py-4 border-t border-white/10 bg-gray-900">
          <button onClick={handleToggleMute} className="flex flex-col items-center gap-1">
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

export default GroupVideoCallModal;
