import { useState, useRef, useEffect } from 'react';
import { Pin, ChevronDown, X, Trash2 } from 'lucide-react';
import { useUnpinMessage } from '../hooks/useGroup';
import type { PinnedMessage } from '../types/group';

interface Props {
  groupId: string;
  pins: PinnedMessage[];
  onJumpToMessage: (messageId: string) => void;
}

function previewText(pin: PinnedMessage): string {
  if (pin.type === 'IMAGE') return '📷 Hình ảnh';
  if (pin.type === 'VIDEO') return '🎬 Video';
  if (pin.type === 'AUDIO') return '🎵 Âm thanh';
  if (pin.type === 'PDF') return '📄 File PDF';
  if (pin.type === 'GIF') return '[GIF]';
  return pin.content || '(Tin nhắn)';
}

function formatPinDate(ts: string) {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Zalo-style pinned messages banner — always visible at the top of the chat
 * when at least one message is pinned. Shows the most recently pinned message
 * by default; clicking expands to a dropdown listing every pinned message.
 */
export default function PinnedBanner({ groupId, pins, onJumpToMessage }: Props) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unpin = useUnpinMessage(groupId);

  // Close dropdown on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  if (pins.length === 0) return null;

  // pins is sorted DESC (newest first) by backend
  const latest = pins[0];

  return (
    <div ref={containerRef} className="relative shrink-0 border-b border-gray-100 bg-orange-50/40">
      {/* Compact bar — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-orange-50 transition text-left"
      >
        <Pin className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold text-orange-600">
              Tin nhắn đã ghim {pins.length > 1 && `(${pins.length})`}
            </p>
          </div>
          <p className="text-xs text-gray-700 truncate">{previewText(latest)}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded list — dropdown */}
      {expanded && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-20 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
            <p className="text-xs font-semibold text-gray-700">Tất cả tin nhắn đã ghim ({pins.length})</p>
            <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {pins.map((pin) => (
            <div
              key={pin.messageId}
              className="flex items-start gap-2.5 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-orange-50/50 group"
            >
              <button
                className="flex items-start gap-2 flex-1 min-w-0 text-left"
                onClick={() => { onJumpToMessage(pin.messageId); setExpanded(false); }}
              >
                <Pin className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 line-clamp-2 break-words group-hover:text-orange-600 transition-colors">
                    {previewText(pin)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatPinDate(pin.pinnedAt)}</p>
                </div>
              </button>
              <button
                onClick={() => unpin.mutate(pin.messageId)}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition shrink-0"
                title="Bỏ ghim"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
