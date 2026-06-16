import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useGroupCallStore } from '@/stores/groupCallStore';

interface Props {
  onAccept: () => void;
  onReject: () => void;
}

const GroupIncomingCallNotification: React.FC<Props> = ({ onAccept, onReject }) => {
  const { groupName, callType, callerName } = useGroupCallStore();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ringtone
  useEffect(() => {
    const playBeep = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 480;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch { /* ignore */ }
    };

    playBeep();
    ringIntervalRef.current = setInterval(playBeep, 2000);

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[200] w-80 bg-gray-900 rounded-2xl shadow-2xl p-4 animate-slide-up border border-white/10">
      <div className="flex items-start gap-3">
        {/* Pulsing icon */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
            {callType === 'video' ? (
              <Video className="w-5 h-5 text-orange-400" />
            ) : (
              <Phone className="w-5 h-5 text-orange-400" />
            )}
          </div>
          <span className="absolute inset-0 rounded-full bg-orange-400/20 animate-ping" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{groupName}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {callerName} đang {callType === 'video' ? 'gọi video nhóm' : 'gọi thoại nhóm'}...
          </p>

          <div className="flex gap-2 mt-3">
            {/* Reject */}
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Từ chối
            </button>

            {/* Accept */}
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors"
            >
              {callType === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
              Tham gia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupIncomingCallNotification;
