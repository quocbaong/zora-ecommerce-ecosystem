import { useState } from 'react';
import { X, BellOff, Bell, Loader2 } from 'lucide-react';
import { useMuteGroup, useUnmuteGroup } from '../hooks/useGroup';
import type { GroupMember } from '../types/group';

interface Props {
  groupId: string;
  myMember?: GroupMember | null;
  onClose: () => void;
}

const DURATIONS = [
  { label: '1 giờ', ms: 60 * 60 * 1000 },
  { label: '8 giờ', ms: 8 * 60 * 60 * 1000 },
  { label: '1 ngày', ms: 24 * 60 * 60 * 1000 },
  { label: '1 tuần', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Mãi mãi', ms: -1 },
];

export default function MuteGroupModal({ groupId, myMember, onClose }: Props) {
  const [selectedMs, setSelectedMs] = useState(DURATIONS[0].ms);
  const [mentionsOnly, setMentionsOnly] = useState(false);

  const mute = useMuteGroup(groupId);
  const unmute = useUnmuteGroup(groupId);

  const isMuted = !!myMember?.mutedUntil;

  const handleMute = () => {
    mute.mutate({ durationMs: selectedMs, mentionsOnly }, { onSuccess: onClose });
  };

  const handleUnmute = () => {
    unmute.mutate(undefined, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <BellOff className="w-4 h-4 text-orange-500" />
            Tắt thông báo nhóm
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isMuted ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                <BellOff className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Đang tắt thông báo</p>
                  <p className="text-xs text-gray-500">
                    {myMember?.mutedUntil === 'FOREVER'
                      ? 'Mãi mãi'
                      : `Đến ${new Date(myMember?.mutedUntil!).toLocaleString('vi-VN')}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleUnmute}
                disabled={unmute.isPending}
                className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
              >
                {unmute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                Bật lại thông báo
              </button>
            </div>
          ) : (
            <>
              {/* Duration options */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Tắt trong</p>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.ms}
                      onClick={() => setSelectedMs(d.ms)}
                      className={`py-2 px-3 rounded-xl text-sm border transition ${
                        selectedMs === d.ms
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mentions only */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mentionsOnly}
                  onChange={(e) => setMentionsOnly(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-700">Vẫn nhận thông báo khi được @mention</span>
              </label>

              <button
                onClick={handleMute}
                disabled={mute.isPending}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {mute.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Xác nhận
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
