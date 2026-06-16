import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

interface Props {
  onAccept: (offer: RTCSessionDescriptionInit) => void;
  onReject: () => void;
  /** Stored offer from call_initiate so answerCall can use it */
  pendingOffer: RTCSessionDescriptionInit | null;
}

const IncomingCallNotification: React.FC<Props> = ({ onAccept, onReject, pendingOffer }) => {
  const { call } = useChatStore();
  const ringRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play ringtone via Web Audio API (simple beep pattern)
  useEffect(() => {
    if (call.callStatus !== 'incoming') return;

    let ctx: AudioContext | null = null;
    let stopped = false;

    const playBeep = () => {
      if (stopped) return;
      try {
        ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    };

    playBeep();
    ringRef.current = setInterval(playBeep, 2000);

    return () => {
      stopped = true;
      if (ringRef.current) clearInterval(ringRef.current);
      ctx?.close();
    };
  }, [call.callStatus]);

  if (call.callStatus !== 'incoming') return null;

  const isVideo = call.callType === 'video';

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 p-5 w-72">
        {/* Pulsing avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {(call.callerName || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="absolute inset-0 rounded-full bg-orange-400/30 animate-ping" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{call.callerName || 'Người dùng'}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {isVideo ? (
                <Video className="w-3.5 h-3.5 text-orange-400" />
              ) : (
                <Phone className="w-3.5 h-3.5 text-orange-400" />
              )}
              <p className="text-gray-400 text-xs">
                {isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            Từ chối
          </button>
          <button
            onClick={() => pendingOffer && onAccept(pendingOffer)}
            disabled={!pendingOffer}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            Nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
