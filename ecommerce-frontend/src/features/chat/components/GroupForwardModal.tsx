import React, { useState, useEffect } from 'react';
import { X, Forward, Search, Users, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/features/user/services/userService';
import { groupService } from '../services/groupService';
import { groupMessageService } from '../services/groupMessageService';
import { chatService } from '../services/chatService';
import type { Conversation } from '../types';
import type { GroupMessage } from '../types/group';

interface Props {
  message: GroupMessage;
  currentGroupId: string;
  onClose: () => void;
  profileCache?: Record<string, { name: string; fullName?: string; avatarUrl?: string }>;
}

interface Target {
  id: string;
  type: 'group' | 'conv';
  label: string;
  avatarUrl?: string;
}

const GroupForwardModal: React.FC<Props> = ({ message, currentGroupId, onClose, profileCache }) => {
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role === 'SELLER';
  const [search, setSearch] = useState('');
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedSenderName, setResolvedSenderName] = useState('Bạn');

  // States for inline sending
  const [targetStatus, setTargetStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'confirmed'>>({});
  const [sentMessageIds, setSentMessageIds] = useState<Record<string, string>>({});
  const [timers, setTimers] = useState<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let senderName = 'Bạn';
        if (message.senderId !== user?.id) {
          const cached = profileCache?.[message.senderId];
          if (cached) {
            senderName = cached.fullName || cached.name || 'Thành viên';
          } else {
            try {
              const profile = await userService.getProfileById(message.senderId);
              senderName = profile.fullName || 'Thành viên';
            } catch {
              senderName = 'Thành viên';
            }
          }
        }
        if (!cancelled) {
          setResolvedSenderName(senderName);
        }
        const [groups, conversations] = await Promise.all([
          groupService.getMyGroups(),
          chatService.getConversations(),
        ]);

        const convTargets = await Promise.all(
          (conversations as Conversation[]).map(async (c) => {
            let otherId = c.participants?.find((id) => id !== user?.id);
            if (!otherId) {
              otherId = c.userId === user?.id ? c.sellerId : c.userId;
            }
            let label = otherId ? (isSeller ? 'Người mua' : 'Người bán') : c.id;
            let avatarUrl: string | undefined;
            if (otherId) {
              const cached = profileCache?.[otherId];
              if (cached) {
                label = cached.fullName || cached.name || label;
                avatarUrl = cached.avatarUrl;
              } else {
                try {
                  const profile = await userService.getProfileById(otherId);
                  label = profile.fullName || label;
                  avatarUrl = profile.avatarUrl;
                } catch {
                  label = (isSeller ? 'Người mua' : 'Người bán') + ` (${otherId.slice(0, 8)})`;
                }
              }
            }
            return { id: c.id, type: 'conv' as const, label, avatarUrl };
          })
        );

        if (!cancelled) {
          const groupTargets: Target[] = groups
            .map((g) => ({ id: g.groupId, type: 'group' as const, label: g.name, avatarUrl: g.avatarUrl }));
          setTargets([...groupTargets, ...convTargets]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentGroupId, isSeller, profileCache, message.senderId, user?.id]);

  useEffect(() => {
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, [timers]);

  const filtered = targets.filter((t) => {
    if (!search.trim()) return true;
    return t.label.toLowerCase().includes(search.toLowerCase());
  });

  const handleSendItem = async (t: Target) => {
    const key = `${t.type}-${t.id}`;
    setTargetStatus((prev) => ({ ...prev, [key]: 'sending' }));

    try {
      let sentId = '';
      if (t.type === 'group') {
        const sentMsg = await groupMessageService.sendGroupMessage(t.id, {
          type: message.type as any,
          content: message.content,
          isForwarded: true,
          forwardedFrom: resolvedSenderName,
        });
        sentId = sentMsg.messageId;
      } else {
        const sentMsg = await chatService.sendMessage(t.id, {
          type: message.type as 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO',
          content: message.content,
          isForwarded: true,
          forwardedFrom: resolvedSenderName,
        });
        sentId = sentMsg.id;
      }

      setSentMessageIds((prev) => ({ ...prev, [key]: sentId }));
      setTargetStatus((prev) => ({ ...prev, [key]: 'sent' }));

      const timer = setTimeout(() => {
        setTargetStatus((prev) => {
          if (prev[key] === 'sent') {
            return { ...prev, [key]: 'confirmed' };
          }
          return prev;
        });
      }, 5000);

      setTimers((prev) => ({ ...prev, [key]: timer }));
    } catch (err) {
      setTargetStatus((prev) => ({ ...prev, [key]: 'idle' }));
    }
  };

  const handleUndoItem = async (t: Target) => {
    const key = `${t.type}-${t.id}`;
    const sentId = sentMessageIds[key];
    if (!sentId) return;

    if (timers[key]) {
      clearTimeout(timers[key]);
    }

    setTargetStatus((prev) => ({ ...prev, [key]: 'sending' }));

    try {
      if (t.type === 'group') {
        await groupMessageService.recallGroupMessage(t.id, sentId);
      } else {
        await chatService.recallMessage(t.id, sentId);
      }
      setTargetStatus((prev) => ({ ...prev, [key]: 'idle' }));
    } catch (err) {
      setTargetStatus((prev) => ({ ...prev, [key]: 'confirmed' }));
    }
  };

  const renderRowButton = (t: Target) => {
    const key = `${t.type}-${t.id}`;
    const status = targetStatus[key] || 'idle';

    switch (status) {
      case 'sending':
        return (
          <div className="w-20 h-7 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        );
      case 'sent':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleUndoItem(t); }}
            className="w-20 py-1 rounded-full border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shrink-0"
          >
            Hoàn tác
          </button>
        );
      case 'confirmed':
        return (
          <span className="w-20 py-1 text-center text-xs font-semibold text-gray-400 shrink-0 select-none">
            Đã gửi
          </span>
        );
      case 'idle':
      default:
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleSendItem(t); }}
            className="w-20 py-1 rounded-full bg-orange-500 hover:bg-orange-600 text-xs font-semibold text-white transition-colors shrink-0"
          >
            Gửi
          </button>
        );
    }
  };

  const previewText = () => {
    if (message.recalled) return 'Tin nhắn đã thu hồi';
    switch (message.type) {
      case 'IMAGE': return '📷 Hình ảnh';
      case 'VIDEO': return '🎥 Video';
      case 'PDF':   return '📄 Tài liệu';
      case 'AUDIO': return '🎤 Giọng nói';
      case 'POLL':  return '📊 Khảo sát / Bình chọn';
      case 'REMINDER': return '⏰ Nhắc nhở';
      case 'CALL':  return '📞 Cuộc gọi';
      case 'CONTACT': return '👤 Danh thiếp';
      case 'GIF':   return '🖼️ Ảnh GIF';
      default: return message.content.slice(0, 80);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Chuyển tiếp tin nhắn</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview */}
        <div className="mx-5 mt-3 mb-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-100 shrink-0">
          <p className="text-xs text-orange-400 mb-0.5">Nội dung chuyển tiếp</p>
          <p className="text-sm text-gray-700 line-clamp-2">{previewText()}</p>
        </div>

        {/* Search */}
        <div className="px-5 py-2 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm cuộc trò chuyện..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Target list */}
        <div className="overflow-y-auto flex-1 px-5 pb-2">
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Không có cuộc trò chuyện nào</p>
          ) : (
            filtered.map((t) => (
              <div
                key={`${t.type}-${t.id}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 overflow-hidden shrink-0">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.label} className="w-full h-full object-cover" />
                  ) : t.type === 'group' ? (
                    <Users className="w-4 h-4 text-gray-500" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate text-gray-800">{t.label}</p>
                  <p className="text-xs text-gray-400">{t.type === 'group' ? 'Nhóm' : 'Nhắn tin'}</p>
                </div>
                {renderRowButton(t)}
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupForwardModal;
