import React from 'react';
import { Crown, Shield } from 'lucide-react';
import type { Group } from '../types/group';

interface Props {
  group: Group;
  isActive: boolean;
  onClick: () => void;
}

function timeAgo(ts?: string): string {
  if (!ts) return '';
  const diffMs = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút`;
  if (h < 24) return `${h} giờ`;
  if (d === 1) return 'Hôm qua';
  if (d < 7) return `${d} ngày`;
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function previewByType(type?: string, content?: string): string {
  if (!type || type === 'TEXT') return content || '';
  if (type === 'IMAGE') return '[Hình ảnh]';
  if (type === 'VIDEO') return '[Video]';
  if (type === 'AUDIO') return '[Tin nhắn thoại]';
  if (type === 'PDF') return '[Tệp PDF]';
  if (type === 'GIF') return '[Ảnh GIF]';
  if (type === 'VOUCHER') return '[Voucher]';
  if (type === 'PRODUCT') return '[Sản phẩm]';
  if (type === 'CALL') return '[Cuộc gọi]';
  if (type === 'POLL') return '[Bình chọn]';
  if (type === 'REMINDER') return '[Nhắc hẹn]';
  if (type === 'SYSTEM') return content || '';
  return content || '';
}

const GroupConversationItem: React.FC<Props> = ({ group, isActive, onClick }) => {
  const initial = (group.name || '?').charAt(0).toUpperCase();
  const unread = group.memberMeta?.unreadCount ?? 0;
  const role = group.memberMeta?.role;
  const preview = previewByType(group.lastMessageType, group.lastMessage);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-gray-100 last:border-0 ${
        isActive ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'hover:bg-gray-50'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-base font-bold">
          {group.avatarUrl ? (
            <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {/* Role badge */}
        {role === 'OWNER' && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-yellow-400 rounded-full p-0.5">
            <Crown className="w-2.5 h-2.5 text-white" />
          </span>
        )}
        {role === 'DEPUTY' && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-blue-400 rounded-full p-0.5">
            <Shield className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-1">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-orange-600' : 'text-gray-900'}`}>
            {group.name}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(group.lastMessageAt || group.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-gray-500 truncate">
            {preview || `${group.memberCount} thành viên`}
          </p>
          {unread > 0 && (
            <span className="shrink-0 h-5 min-w-5 px-1 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default React.memo(GroupConversationItem);
