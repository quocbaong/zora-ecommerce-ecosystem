import React, { useState, useEffect } from 'react';
import { X, Search, Send, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useConversations } from '../hooks/useChat';
import { chatService } from '../services/chatService';
import { userService } from '@/features/user/services/userService';
import type { ProductCardContent } from '../types';

import { formatLastMessage } from './ConversationItem';

interface Props {
  product: ProductCardContent;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

const ShareProductModal: React.FC<Props> = ({ product, onClose }) => {
  const user = useAuthStore((s) => s.user);
  const { data: conversations = [], isLoading } = useConversations();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, { name: string; avatarUrl?: string }>>({});

  // Fetch profiles for the "other side" of each conversation
  useEffect(() => {
    if (!user?.id) return;
    const ids = new Set<string>();
    conversations.forEach((c) => {
      const otherId = c.userId === user.id ? c.sellerId : c.userId;
      if (otherId && !profileCache[otherId]) ids.add(otherId);
    });
    ids.forEach((id) => {
      userService
        .getProfileById(id)
        .then((p) => setProfileCache((prev) => ({ ...prev, [id]: { name: p.fullName || id, avatarUrl: p.avatarUrl } })))
        .catch(() => setProfileCache((prev) => ({ ...prev, [id]: { name: id } })));
    });
  }, [conversations, user?.id]);

  const filtered = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const otherId = conv.userId === user?.id ? conv.sellerId : conv.userId;
    const name = (otherId ? profileCache[otherId]?.name : undefined) ?? '';
    const last = conv.lastMessage ?? '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || last.toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      await chatService.sendMessage(selected, {
        type: 'PRODUCT',
        content: JSON.stringify(product),
      });
      toast.success('Đã chia sẻ sản phẩm');
      onClose();
    } catch {
      toast.error('Không thể chia sẻ sản phẩm');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Chia sẻ sản phẩm</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product preview */}
        <div className="mx-5 mt-3 mb-2 flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Tag className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
            <p className="text-sm font-bold text-orange-500">{formatCurrency(product.price)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-2">
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

        {/* Conversation list */}
        <div className="overflow-y-auto max-h-64 px-5 pb-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {conversations.length === 0 ? 'Bạn chưa có cuộc trò chuyện nào' : 'Không tìm thấy cuộc trò chuyện phù hợp'}
            </p>
          ) : (
            filtered.map((conv) => {
              const otherId = conv.userId === user?.id ? conv.sellerId : conv.userId;
              const profile = otherId ? profileCache[otherId] : undefined;
              const name = profile?.name ?? (otherId ?? 'Người dùng');
              const isSelected = selected === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelected(isSelected ? null : conv.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors ${
                    isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 overflow-hidden shrink-0">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-orange-600' : 'text-gray-800'}`}>{name}</p>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-400 truncate">{formatLastMessage(conv.lastMessage)}</p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Huỷ
          </button>
          <button
            onClick={handleSend}
            disabled={!selected || sending}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Đang gửi...' : 'Chia sẻ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareProductModal;
