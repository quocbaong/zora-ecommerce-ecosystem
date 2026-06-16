
import { X, Pin, Trash2 } from 'lucide-react';
import { usePinnedMessages, useUnpinMessage } from '../hooks/useGroup';

interface Props {
  groupId: string;
  onClose: () => void;
  onScrollToMessage?: (messageId: string) => void;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PinnedMessagesPanel({ groupId, onClose, onScrollToMessage }: Props) {
  const { data: pins = [], isLoading } = usePinnedMessages(groupId);
  const unpin = useUnpinMessage(groupId);

  return (
    <div className="flex flex-col h-full w-72 border-l border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
          <Pin className="w-4 h-4 text-orange-500" />
          Tin nhắn đã ghim ({pins.length})
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex justify-center py-8 text-gray-400 text-xs">Đang tải...</div>
        ) : pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
            <Pin className="w-8 h-8 opacity-30" />
            <p className="text-xs">Chưa có tin nhắn nào được ghim</p>
          </div>
        ) : (
          pins.map((pin) => (
            <div
              key={pin.messageId}
              className="flex items-start gap-2.5 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 group"
            >
              <button
                className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                onClick={() => onScrollToMessage?.(pin.messageId)}
                title="Nhảy tới tin nhắn"
              >
                <Pin className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 line-clamp-2 break-words group-hover:text-orange-600 transition-colors">
                    {pin.type === 'IMAGE' ? '📷 Hình ảnh'
                      : pin.type === 'VIDEO' ? '🎬 Video'
                      : pin.type === 'AUDIO' ? '🎵 Âm thanh'
                      : pin.type === 'PDF' ? '📄 File PDF'
                      : pin.content || '(Tin nhắn đã thu hồi)'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(pin.pinnedAt)}</p>
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
          ))
        )}
      </div>
    </div>
  );
}
