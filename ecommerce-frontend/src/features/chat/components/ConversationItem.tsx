import React from 'react';
import type { Conversation } from '../types';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
  otherParticipantName?: string;
  otherParticipantAvatar?: string;
  isOnline?: boolean;
}

function timeAgo(ts?: string | number): string {
  if (!ts) return '';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  if (diffHours < 24) return `${diffHours} giờ`;
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function formatLastMessage(msg?: any): string {
  if (!msg) return 'Bắt đầu cuộc trò chuyện';

  // If msg is stringified JSON, try to parse it
  if (typeof msg === 'string') {
    // Legacy data: friend-request JSON was stored raw and the backend
    // truncated to 100 chars → invalid JSON that JSON.parse can't handle.
    // Detect by prefix so the sidebar doesn't leak `{"fromUserId":"<uuid>"...`.
    const trimmed = msg.trimStart();
    if (trimmed.startsWith('{"fromUserId"') || trimmed.startsWith('{"toUserId"')) {
      return '[Lời mời kết bạn]';
    }
    try {
      const parsed = JSON.parse(msg);
      if (parsed && typeof parsed === 'object') {
        msg = parsed;
      }
    } catch (e) {}
  }
  
  if (typeof msg === 'object' && msg !== null) {
    if (msg.type === 'STICKER') return '[Nhãn dán]';
    if (msg.type === 'GIF') return '[Ảnh GIF]';
    if (msg.type === 'IMAGE' || msg.type === 'PICTURE') return '[Hình ảnh]';
    if (msg.type === 'VIDEO') return '[Video]';
    if (msg.type === 'VOICE' || msg.type === 'AUDIO') return '[Tin nhắn thoại]';
    if (msg.type === 'VOUCHER') return '[Voucher]';
    if (msg.type === 'PRODUCT') return '[Sản phẩm]';
    if (msg.type === 'ORDER') return '[Hóa đơn]';
    if (msg.type === 'CALL') return '[Cuộc gọi]';
    if (msg.type === 'FRIEND_REQUEST') return '[Lời mời kết bạn]';
    if (msg.type === 'FRIEND_ACCEPT') return '[Đã kết bạn]';
    // Fallback for legacy data where lastMessage was stored as raw friend-request JSON
    // (content shape: { fromUserId, toUserId } without a `type` field)
    if (!msg.type && msg.fromUserId && msg.toUserId) return '[Lời mời kết bạn]';
  }

  let text = msg;
  // Nếu msg là object (như { content: "..." })
  if (typeof msg === 'object' && msg !== null) {
    text = msg.content || JSON.stringify(msg);
  }

  if (typeof text !== 'string') return String(text);

  const lowerText = text.toLowerCase();

  // Detect GIF or Sticker from raw URL strings
  if (lowerText.includes('giphy.com') || lowerText.endsWith('.gif') || lowerText.includes('/giphy/') || lowerText.includes('/gifs/')) {
    if (lowerText.includes('sticker')) {
      return '[Nhãn dán]';
    }
    return '[Ảnh GIF]';
  }
  if (lowerText.includes('sticker')) {
    return '[Nhãn dán]';
  }

  // Detect general uploaded files/images/videos/audios
  if (
    lowerText.includes('/chat/upload') ||
    lowerText.includes('/api/chat/download') ||
    lowerText.endsWith('.png') ||
    lowerText.endsWith('.jpg') ||
    lowerText.endsWith('.jpeg') ||
    lowerText.endsWith('.webp') ||
    lowerText.endsWith('.mp3') ||
    lowerText.endsWith('.wav') ||
    lowerText.endsWith('.m4a') ||
    lowerText.endsWith('.aac') ||
    lowerText.endsWith('.opus') ||
    lowerText.endsWith('.mp4') ||
    lowerText.endsWith('.mov') ||
    lowerText.endsWith('.avi') ||
    lowerText.endsWith('.webm')
  ) {
    if (
      lowerText.endsWith('.mp3') ||
      lowerText.endsWith('.wav') ||
      lowerText.endsWith('.m4a') ||
      lowerText.endsWith('.aac') ||
      lowerText.endsWith('.opus') ||
      lowerText.includes('voice') ||
      lowerText.includes('audio')
    ) {
      return '[Tin nhắn thoại]';
    }
    if (
      lowerText.endsWith('.mp4') ||
      lowerText.endsWith('.mov') ||
      lowerText.endsWith('.avi') ||
      lowerText.endsWith('.webm') ||
      lowerText.includes('video')
    ) {
      return '[Video]';
    }
    return '[Hình ảnh]';
  }

  // Fallback: Backend có thể cắt ngắn chuỗi JSON (truncate) nên JSON.parse sẽ lỗi.
  // Dùng string match để nhận diện các payload đặc biệt.
  if (text.startsWith('{"id":') || text.includes('"productid":') || text.includes('"price":')) return '[Sản phẩm]';
  if (text.includes('"voucherid":')) return '[Voucher]';
  if (text.includes('"orderid":')) return '[Hóa đơn]';
  if (text.includes('"calltype":')) return '[Cuộc gọi]';

  try {
    let data = JSON.parse(text);
    // Xử lý trường hợp bị stringify 2 lần
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    if (data && typeof data === 'object') {
      if (data.id || data.productId) return '[Sản phẩm]';
      if (data.voucherId) return '[Voucher]';
      if (data.orderId) return '[Hóa đơn]';
      if (data.callType) return '[Cuộc gọi]';
    }
  } catch (e) {}
  
  return text;
}

const ConversationItem: React.FC<Props> = ({
  conversation,
  isActive,
  onClick,
  otherParticipantName,
  otherParticipantAvatar,
  isOnline = false,
}) => {
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role?.toUpperCase() === 'SELLER';
  const isDirect = conversation.conversationType === 'DIRECT';
  const fallbackName = isDirect ? 'Bạn bè' : (isSeller ? 'Người mua' : 'Người bán');
  const displayName = otherParticipantName || fallbackName;
  const initial = displayName.charAt(0).toUpperCase();
  // PRODUCT conv + current user không phải seller → bên kia là shop
  const isShopChat = !isDirect && !!conversation.sellerId && conversation.sellerId !== user?.id;
  // DIRECT conversations always use unreadUser (each participant has their own record)
  const unread = (isDirect || !isSeller) ? (conversation.unreadUser ?? 0) : (conversation.unreadSeller ?? 0);
  const timestamp = conversation.lastMessageAt || conversation.updatedAt;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-gray-100 last:border-0 ${
        isActive ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'hover:bg-gray-50'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
          {otherParticipantAvatar ? (
            <img src={otherParticipantAvatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base">{initial}</span>
          )}
        </div>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-1">
          <p className={`text-sm font-semibold truncate flex items-center gap-1.5 ${isActive ? 'text-orange-600' : 'text-gray-900'}`}>
            {isShopChat && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-600">
                Shop
              </span>
            )}
            <span className="truncate">{displayName}</span>
          </p>
          <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(timestamp)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-gray-500 truncate">
            {formatLastMessage(conversation.lastMessage)}
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

export default React.memo(ConversationItem);
