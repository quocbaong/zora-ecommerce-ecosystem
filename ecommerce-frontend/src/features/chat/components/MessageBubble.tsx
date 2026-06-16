import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FileText, RotateCcw, Trash2, Forward, SmilePlus, Flag,
  Copy, ShoppingBag, CheckCircle, Truck, Clock, XCircle, MoreHorizontal,
  Video, Phone, PhoneMissed, UserPlus, UserCheck, ShoppingCart, Tag, Ticket, Bookmark, BookmarkCheck, Maximize2,
} from 'lucide-react';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { useVoucherById, useSaveVoucher } from '@/features/shop/hooks/useShop';
import { useOrderById } from '@/features/order/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import type { Message, InvoiceContent, CallMessageContent, ProductCardContent, VoucherCardContent } from '../types';
import MediaLightbox from './MediaLightbox';

interface Props {
  message: Message;
  isMine: boolean;
  searchQuery?: string;
  friendshipStatus?: 'NONE' | 'PENDING' | 'ACCEPTED';
  onRecall?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onAcceptFriendRequest?: (conversationId: string) => void;
  onReport?: (message: Message) => void;
}

const ALL_EMOJIS = [
  '❤️','😂','😮','😢','😡','👍','🥰','😎','🤩','🥳',
  '🤔','😅','😭','😱','🤯','🤗','🙄','😏','😤','🥺',
  '👏','🙌','🤝','🔥','✨','💯','🎉','🙏','💪','👀',
];

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'Chờ xác nhận', color: 'text-yellow-600 bg-yellow-50', icon: <Clock className="w-3.5 h-3.5" /> },
  CONFIRMED: { label: 'Đã xác nhận',  color: 'text-blue-600 bg-blue-50',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  SHIPPING:  { label: 'Đang giao',    color: 'text-orange-600 bg-orange-50', icon: <Truck className="w-3.5 h-3.5" /> },
  DELIVERED: { label: 'Đã giao',      color: 'text-green-600 bg-green-50',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Đã huỷ',       color: 'text-red-600 bg-red-50',     icon: <XCircle className="w-3.5 h-3.5" /> },
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

// Highlight matching search text inside a string
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  );
}

// ── Emoji Picker Popup ────────────────────────────────────────────────────────
const PICKER_W = 224; // w-56 = 14rem = 224px
const PICKER_H = 120; // approximate height for 4 rows of emojis

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose, anchorRect }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  // Calculate left so picker stays within viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer aligning left edge with button left; shift left if overflows right
  let left = anchorRect.left;
  if (left + PICKER_W > vw - 8) left = vw - PICKER_W - 8;
  if (left < 8) left = 8;

  // Prefer above button; flip below if not enough space
  let top: number;
  if (anchorRect.top - PICKER_H - 8 >= 8) {
    top = anchorRect.top - PICKER_H - 8;
  } else {
    top = anchorRect.bottom + 8;
  }
  // Clamp vertically
  if (top + PICKER_H > vh - 8) top = vh - PICKER_H - 8;
  if (top < 8) top = 8;

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 9999, width: PICKER_W }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2"
    >
      <div className="grid grid-cols-8 gap-0.5">
        {ALL_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => { onSelect(e); onClose(); }}
            className="text-lg p-1 hover:bg-gray-100 rounded-lg transition-colors leading-none"
          >
            {e}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

// ── 3-dot Dropdown ────────────────────────────────────────────────────────────
const DROPDOWN_W = 168;
const DROPDOWN_H = 160; // approximate max height

interface DropdownProps {
  isMine: boolean;
  canRecall: boolean;
  canCopy: boolean;
  anchorRect: DOMRect;
  onRecall: () => void;
  onDelete: () => void;
  onForward: () => void;
  onCopy: () => void;
  onReport: () => void;
  onClose: () => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  isMine, canRecall, canCopy, anchorRect,
  onRecall, onDelete, onForward, onCopy, onReport, onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorRect.left;
  if (left + DROPDOWN_W > vw - 8) left = vw - DROPDOWN_W - 8;
  if (left < 8) left = 8;

  let top: number;
  if (anchorRect.top - DROPDOWN_H - 8 >= 8) {
    top = anchorRect.top - DROPDOWN_H - 8;
  } else {
    top = anchorRect.bottom + 8;
  }
  if (top + DROPDOWN_H > vh - 8) top = vh - DROPDOWN_H - 8;
  if (top < 8) top = 8;

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 9999, minWidth: DROPDOWN_W }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 py-1"
    >
      {canCopy && (
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
        >
          <Copy className="w-4 h-4 text-gray-400 shrink-0" /> Sao chép
        </button>
      )}
      <button
        onClick={() => { onForward(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <Forward className="w-4 h-4 text-gray-400 shrink-0" /> Chuyển tiếp
      </button>
      <button
        onClick={() => { onReport(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <Flag className="w-4 h-4 text-gray-400 shrink-0" /> Báo cáo
      </button>
      {isMine && canRecall && (
        <button
          onClick={() => { onRecall(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors text-left"
        >
          <RotateCcw className="w-4 h-4 shrink-0" /> Thu hồi
        </button>
      )}
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left border-t border-gray-100"
      >
        <Trash2 className="w-4 h-4 shrink-0" /> Xoá tin nhắn
      </button>
    </div>,
    document.body
  );
};

// ── Invoice Card ──────────────────────────────────────────────────────────────
const InvoiceCard: React.FC<{ content: string; isMine: boolean }> = ({ content, isMine }) => {
  let data: InvoiceContent | null = null;
  try { data = JSON.parse(content); } catch { return null; }
  if (!data) return null;
  // Live fetch order detail để status tự cập nhật khi seller đổi (socket order_status_updated
  // sẽ invalidate cache khiến card re-render ngay). Fallback dùng status từ JSON snapshot
  // nếu request fail (đỡ trống card).
  const { data: liveOrder } = useOrderById(data.orderId);
  const liveStatus = liveOrder?.status ?? data.status;
  const statusInfo = ORDER_STATUS_MAP[liveStatus] ?? { label: liveStatus, color: 'text-gray-600 bg-gray-50', icon: null };

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm w-64 ${isMine ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-white'}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${isMine ? 'border-gray-600 bg-gray-800' : 'border-gray-100 bg-orange-50'}`}>
        <ShoppingBag className={`w-4 h-4 ${isMine ? 'text-orange-400' : 'text-orange-500'}`} />
        <span className={`text-xs font-semibold ${isMine ? 'text-orange-300' : 'text-orange-600'}`}>Hoá đơn đơn hàng</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className={`text-xs ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>
          Mã đơn: <span className={`font-mono font-medium ${isMine ? 'text-gray-200' : 'text-gray-800'}`}>#{data.orderId.slice(-8).toUpperCase()}</span>
        </p>
        {data.items && data.items.length > 0 && (
          <div className="space-y-1">
            {data.items.slice(0, 2).map((item, i) => (
              <div key={i} className={`flex justify-between text-xs ${isMine ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="truncate flex-1 mr-2">{item.productName} x{item.quantity}</span>
                <span className="shrink-0">{formatCurrency(item.price)}</span>
              </div>
            ))}
            {data.items.length > 2 && <p className={`text-xs text-gray-400`}>+{data.items.length - 2} sản phẩm khác</p>}
          </div>
        )}
        <div className={`flex justify-between items-center pt-1 border-t ${isMine ? 'border-gray-600' : 'border-gray-100'}`}>
          <span className={`text-xs ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>Tổng cộng</span>
          <span className={`text-sm font-bold ${isMine ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(data.totalPrice)}</span>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.icon}{statusInfo.label}
        </div>
      </div>
    </div>
  );
};

// ── Product Card ──────────────────────────────────────────────────────────────
const ProductCard: React.FC<{ content: string; isMine: boolean }> = ({ content, isMine }) => {
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const userRole = useAuthStore((s) => s.user?.role);
  // Seller xem chat thì không phải khách mua → ẩn action mua hàng, chỉ giữ box thông tin.
  const isSeller = userRole?.toUpperCase() === 'SELLER';
  let data: any = null;
  try { data = JSON.parse(content); } catch { return null; }
  
  const productId = data?.productId || data?.id;
  if (!data || !productId) return null;
  const product = { ...data, productId };

  const handleBuy = () => {
    navigate(`/products/${product.productId}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart.mutate({
      productId: product.productId,
      quantity: 1,
      price: product.price,
      name: product.name,
      image: product.image ?? null,
    });
  };

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm w-64 ${isMine ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-white'}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isMine ? 'border-gray-600 bg-gray-800' : 'border-gray-100 bg-orange-50'}`}>
        <Tag className={`w-3.5 h-3.5 ${isMine ? 'text-orange-400' : 'text-orange-500'}`} />
        <span className={`text-xs font-semibold ${isMine ? 'text-orange-300' : 'text-orange-600'}`}>Sản phẩm</span>
      </div>

      <button onClick={handleBuy} className="block w-full text-left">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-40 object-cover" loading="lazy" />
        ) : (
          <div className={`w-full h-40 flex items-center justify-center ${isMine ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <Tag className="w-10 h-10 text-gray-300" />
          </div>
        )}
      </button>

      <div className="px-4 py-3 space-y-2">
        <p className={`text-sm font-medium line-clamp-2 ${isMine ? 'text-white' : 'text-gray-800'}`}>
          {product.name}
        </p>
        {product.shopName && (
          <p className={`text-[11px] ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>
            {product.shopName}
          </p>
        )}
        <p className={`text-base font-bold ${isMine ? 'text-orange-300' : 'text-orange-500'}`}>
          {formatCurrency(product.price)}
        </p>

        {!isSeller && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddToCart}
              disabled={addToCart.isPending}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                isMine
                  ? 'border-gray-500 text-gray-200 hover:bg-gray-600'
                  : 'border-orange-200 text-orange-600 hover:bg-orange-50'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Thêm vào giỏ
            </button>
            <button
              onClick={handleBuy}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
            >
              Mua ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Voucher Card ──────────────────────────────────────────────────────────────
const VoucherCard: React.FC<{ content: string; isMine: boolean }> = ({ content, isMine }) => {
  let parsed: VoucherCardContent | null = null;
  try { parsed = JSON.parse(content); } catch { return null; }
  if (!parsed?.voucherId) return null;
  const voucherId = parsed.voucherId;

  const { data: voucher, isLoading } = useVoucherById(voucherId);
  const saveMut = useSaveVoucher(voucher?.sellerId);

  if (isLoading) {
    return (
      <div className={`rounded-2xl border w-64 px-4 py-6 text-center text-xs ${isMine ? 'border-gray-700 bg-gray-700 text-gray-400' : 'border-gray-200 bg-white text-gray-400'}`}>
        Đang tải voucher...
      </div>
    );
  }
  if (!voucher) {
    return (
      <div className={`rounded-2xl border w-64 px-4 py-6 text-center text-xs ${isMine ? 'border-gray-700 bg-gray-700 text-gray-400' : 'border-gray-200 bg-white text-gray-400'}`}>
        Voucher không tồn tại
      </div>
    );
  }

  const isPercent = voucher.discountType === 'PERCENT';
  const headline = isPercent
    ? `Giảm ${voucher.discountValue}%`
    : `Giảm ${formatCurrency(voucher.discountValue)}`;

  const inactive = voucher.expired || voucher.usedUp || !voucher.active;
  let statusLabel: string | null = null;
  if (!voucher.active) statusLabel = 'Đã ngừng';
  else if (voucher.expired) statusLabel = 'Hết hạn';
  else if (voucher.usedUp) statusLabel = 'Đã dùng hết';

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm w-64 ${isMine ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-white'}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isMine ? 'border-gray-600 bg-gray-800' : 'border-gray-100 bg-orange-50'}`}>
        <Ticket className={`w-3.5 h-3.5 ${isMine ? 'text-orange-400' : 'text-orange-500'}`} />
        <span className={`text-xs font-semibold ${isMine ? 'text-orange-300' : 'text-orange-600'}`}>
          Voucher{voucher.targetUserId ? ' riêng cho bạn' : ''}
        </span>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <p className={`text-lg font-bold ${inactive ? 'text-gray-400 line-through' : (isMine ? 'text-orange-300' : 'text-orange-500')}`}>
          {headline}
        </p>
        {voucher.title && (
          <p className={`text-xs ${isMine ? 'text-gray-300' : 'text-gray-700'}`}>{voucher.title}</p>
        )}
        <p className={`text-[11px] font-mono ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>
          Mã: {voucher.code}
        </p>
        {voucher.minOrderAmount > 0 && (
          <p className={`text-[11px] ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>
            Đơn tối thiểu {formatCurrency(voucher.minOrderAmount)}
          </p>
        )}
        {voucher.discountType === 'PERCENT' && voucher.maxDiscount && voucher.maxDiscount > 0 && (
          <p className={`text-[11px] ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>
            Giảm tối đa {formatCurrency(voucher.maxDiscount)}
          </p>
        )}
        {voucher.expiresAt && (
          <p className={`text-[11px] ${isMine ? 'text-gray-400' : 'text-gray-400'}`}>
            HSD: {new Date(voucher.expiresAt).toLocaleString('vi-VN')}
          </p>
        )}

        {statusLabel ? (
          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
            {statusLabel}
          </div>
        ) : (
          <button
            onClick={() => saveMut.mutate(voucherId)}
            disabled={voucher.saved || saveMut.isPending || isMine}
            className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
              voucher.saved
                ? (isMine ? 'bg-gray-800 text-gray-400' : 'bg-orange-50 text-orange-600 border border-orange-200')
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {voucher.saved ? (
              <><BookmarkCheck className="w-3.5 h-3.5" /> Đã lưu</>
            ) : (
              <><Bookmark className="w-3.5 h-3.5" /> {saveMut.isPending ? 'Đang lưu...' : 'Lưu voucher'}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Call History Card ────────────────────────────────────────────────────────
function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const CallCard: React.FC<{ content: string; isMine: boolean }> = ({ content, isMine }) => {
  let data: CallMessageContent | null = null;
  try { data = JSON.parse(content); } catch { return null; }
  if (!data) return null;

  const isVideo = data.callType === 'video';
  const isMissed = data.status === 'missed';

  const Icon = isMissed ? PhoneMissed : isVideo ? Video : Phone;
  const label = isMissed
    ? (isVideo ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ')
    : (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại');

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm min-w-[200px] ${
      isMine
        ? 'bg-gray-800 border-gray-700 text-white'
        : 'bg-white border-gray-100 text-gray-800'
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
        isMissed
          ? 'bg-red-100 text-red-500'
          : isVideo
            ? 'bg-orange-100 text-orange-500'
            : 'bg-green-100 text-green-600'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={`text-sm font-medium ${isMissed ? 'text-red-400' : isMine ? 'text-white' : 'text-gray-800'}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>
          {isMissed ? 'Không có người trả lời' : formatCallDuration(data.duration)}
        </p>
      </div>
    </div>
  );
};

// ── Reactions Bar ─────────────────────────────────────────────────────────────
const ReactionsBar: React.FC<{ reactions: Record<string, string[]>; onReact?: (emoji: string) => void }> = ({ reactions, onReact }) => {
  const entries = Object.entries(reactions).filter(([, u]) => u.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => onReact?.(emoji)}
          className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs shadow-sm hover:bg-gray-50 transition-colors"
        >
          <span>{emoji}</span>
          {users.length > 1 && <span className="text-gray-500 text-[10px]">{users.length}</span>}
        </button>
      ))}
    </div>
  );
};

// ── Hover Toolbar (Messenger / Zalo style) ────────────────────────────────────
interface HoverToolbarProps {
  isMine: boolean;
  messageId: string;
  messageType: string;
  messageContent: string;
  onRecall?: (id: string) => void;
  onDelete?: (id: string) => void;
  onForward?: () => void;
  onReact?: (id: string, emoji: string) => void;
  onReport?: () => void;
}

const HoverToolbar: React.FC<HoverToolbarProps> = ({
  isMine, messageId, messageType, messageContent,
  onRecall, onDelete, onForward, onReact, onReport,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<DOMRect | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<DOMRect | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  const handleCopy = useCallback(() => {
    if (messageType === 'TEXT') navigator.clipboard.writeText(messageContent).catch(() => {});
  }, [messageType, messageContent]);

  const handleEmojiButtonClick = () => {
    if (emojiButtonRef.current) setEmojiAnchor(emojiButtonRef.current.getBoundingClientRect());
    setShowEmojiPicker((v) => !v);
    setShowDropdown(false);
  };

  const handleDropdownButtonClick = () => {
    if (dropdownButtonRef.current) setDropdownAnchor(dropdownButtonRef.current.getBoundingClientRect());
    setShowDropdown((v) => !v);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mx-1.5">
      {/* Smile+ icon → opens emoji picker */}
      <div className="relative">
        <button
          ref={emojiButtonRef}
          onClick={handleEmojiButtonClick}
          className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 transition-colors"
          title="Thả cảm xúc"
        >
          <SmilePlus className="w-4 h-4" />
        </button>
        {showEmojiPicker && emojiAnchor && (
          <EmojiPicker
            anchorRect={emojiAnchor}
            onSelect={(emoji) => onReact?.(messageId, emoji)}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>

      {/* 3-dot menu */}
      <div className="relative">
        <button
          ref={dropdownButtonRef}
          onClick={handleDropdownButtonClick}
          className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 transition-colors"
          title="Tuỳ chọn"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {showDropdown && dropdownAnchor && (
          <Dropdown
            isMine={isMine}
            canRecall={!!(isMine && onRecall)}
            canCopy={messageType === 'TEXT'}
            anchorRect={dropdownAnchor}
            onRecall={() => onRecall?.(messageId)}
            onDelete={() => onDelete?.(messageId)}
            onForward={() => onForward?.()}
            onCopy={handleCopy}
            onReport={() => onReport?.()}
            onClose={() => setShowDropdown(false)}
          />
        )}
      </div>
    </div>
  );
};

// ── Friend Request Card ────────────────────────────────────────────────────────
const FriendRequestCard: React.FC<{
  isMine: boolean;
  conversationId?: string;
  friendshipStatus?: 'NONE' | 'PENDING' | 'ACCEPTED';
  onAccept?: (conversationId: string) => void;
}> = ({ isMine, conversationId, friendshipStatus, onAccept }) => {
  const accepted = friendshipStatus === 'ACCEPTED';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm min-w-[220px] max-w-[260px] ${
      isMine ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-100'
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isMine ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
        <UserPlus className={`w-4 h-4 ${isMine ? 'text-orange-400' : 'text-orange-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isMine ? 'text-white' : 'text-gray-800'}`}>Lời mời kết bạn</p>
        {isMine ? (
          <p className={`text-xs mt-0.5 text-gray-400`}>Đã gửi lời mời</p>
        ) : accepted ? (
          <div className="mt-1.5 flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg w-fit cursor-default">
            <UserCheck className="w-3 h-3" />
            Đã chấp nhận
          </div>
        ) : (
          <button
            onClick={() => conversationId && onAccept?.(conversationId)}
            className="mt-1.5 flex items-center gap-1 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <UserCheck className="w-3 h-3" />
            Chấp nhận
          </button>
        )}
      </div>
    </div>
  );
};

// ── Friend Accept Card ─────────────────────────────────────────────────────────
const FriendAcceptCard: React.FC<{ isMine: boolean }> = ({ isMine }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm min-w-[200px] max-w-[260px] ${
    isMine ? 'bg-gray-800 border-gray-700' : 'bg-white border-green-100'
  }`}>
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isMine ? 'bg-green-500/20' : 'bg-green-100'}`}>
      <UserCheck className={`w-4 h-4 ${isMine ? 'text-green-400' : 'text-green-500'}`} />
    </div>
    <div>
      <p className={`text-sm font-semibold ${isMine ? 'text-white' : 'text-gray-800'}`}>Đã chấp nhận kết bạn</p>
      <p className={`text-xs mt-0.5 ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>Các bạn đã kết bạn với nhau</p>
    </div>
  </div>
);

// ── Main MessageBubble ────────────────────────────────────────────────────────
const MessageBubble: React.FC<Props> = ({
  message, isMine, searchQuery, friendshipStatus,
  onRecall, onDelete, onForward, onReact, onAcceptFriendRequest, onReport,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // ── Recalled state ──
  if (message.recalled) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="px-4 py-2 rounded-2xl text-xs italic text-gray-400 border border-dashed border-gray-300">
          Tin nhắn đã được thu hồi
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <>
            <div
              onClick={() => setLightboxOpen(true)}
              className={`rounded-2xl overflow-hidden shadow-sm ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
            >
              <img src={message.content} alt="Ảnh" className="max-w-[260px] max-h-[280px] object-cover block cursor-zoom-in" loading="lazy" />
            </div>
            {lightboxOpen && (
              <MediaLightbox src={message.content} type="image" onClose={() => setLightboxOpen(false)} />
            )}
          </>
        );
      case 'VIDEO':
        return (
          <>
            <div className={`relative rounded-2xl overflow-hidden shadow-sm group ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}>
              <video src={message.content} controls className="max-w-[280px] max-h-[200px] block bg-black" preload="metadata" />
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition"
                title="Xem phóng to"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {lightboxOpen && (
              <MediaLightbox src={message.content} type="video" onClose={() => setLightboxOpen(false)} />
            )}
          </>
        );
      case 'AUDIO':
        return (
          <div className={`px-3 py-2.5 rounded-2xl shadow-sm ${isMine ? 'bg-gray-800 rounded-br-none' : 'bg-white border border-gray-100 rounded-bl-none'}`}>
            <audio controls src={message.content} className="max-w-[260px] h-9" preload="metadata" />
          </div>
        );
      case 'PDF':
        return (
          <a
            href={message.content}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm hover:opacity-80 transition-opacity ${
              isMine ? 'bg-gray-800 border-gray-700 rounded-br-none' : 'bg-white border-gray-200 rounded-bl-none'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMine ? 'bg-orange-500' : 'bg-orange-100'}`}>
              <FileText className={`w-5 h-5 ${isMine ? 'text-white' : 'text-orange-500'}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate max-w-[160px] ${isMine ? 'text-white' : 'text-gray-800'}`}>
                {(() => {
                  const last = message.content.split('/').pop() ?? '';
                  const raw = last.split('_').slice(2).join('_');
                  try { return decodeURIComponent(raw) || 'Tài liệu PDF'; } catch { return raw || 'Tài liệu PDF'; }
                })()}
              </p>
              <p className={`text-xs ${isMine ? 'text-gray-400' : 'text-gray-500'}`}>PDF • Nhấn để mở</p>
            </div>
          </a>
        );
      case 'GIF':
        return (
          <>
            <div
              onClick={() => setLightboxOpen(true)}
              className={`rounded-2xl overflow-hidden shadow-sm ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
            >
              <img src={message.content} alt="GIF" className="max-w-[220px] rounded-xl block cursor-zoom-in" loading="lazy" />
            </div>
            {lightboxOpen && (
              <MediaLightbox src={message.content} type="image" onClose={() => setLightboxOpen(false)} />
            )}
          </>
        );
      case 'INVOICE':
        return <InvoiceCard content={message.content} isMine={isMine} />;
      case 'PRODUCT':
        return <ProductCard content={message.content} isMine={isMine} />;
      case 'VOUCHER':
        return <VoucherCard content={message.content} isMine={isMine} />;
      case 'CALL':
        return <CallCard content={message.content} isMine={isMine} />;
      case 'FRIEND_REQUEST':
        return (
          <FriendRequestCard
            isMine={isMine}
            conversationId={message.conversationId}
            friendshipStatus={friendshipStatus}
            onAccept={onAcceptFriendRequest}
          />
        );
      case 'FRIEND_ACCEPT':
        return <FriendAcceptCard isMine={isMine} />;
      default: {
        let safeContent = message.content;
        if (typeof safeContent === 'object') {
          console.error('CRITICAL: message.content is an object!', safeContent);
          safeContent = JSON.stringify(safeContent);
        }
        return (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words max-w-[280px] ${
              isMine
                ? 'bg-gray-800 text-white rounded-br-none'
                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
            }`}
          >
            {highlightText(safeContent, searchQuery ?? '')}
          </div>
        );
      }
    }
  };

  const toolbar = (
    <HoverToolbar
      isMine={isMine}
      messageId={message.id}
      messageType={message.type}
      messageContent={message.content}
      onRecall={onRecall}
      onDelete={onDelete}
      onForward={() => onForward?.(message)}
      onReact={onReact}
      onReport={() => onReport?.(message)}
    />
  );

  return (
    <div className={`flex items-end ${isMine ? 'justify-end' : 'justify-start'} mb-2 group`}>
      {/*
        isMine=true  → bubble right-aligned → toolbar on the LEFT  → render toolbar first
        isMine=false → bubble left-aligned  → toolbar on the RIGHT → render toolbar after
      */}
      {isMine && toolbar}

      {/* Bubble + reactions + time */}
      <div className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
        {message.isForwarded && (
          <div className="flex items-center gap-1 opacity-70 text-[10px] text-gray-400 font-medium mb-0.5 select-none">
            <span>➡️</span>
            <span>{message.forwardedFrom} đã chuyển tiếp một tin nhắn</span>
          </div>
        )}
        {renderContent()}
        <ReactionsBar
          reactions={message.reactions ?? {}}
          onReact={(emoji) => onReact?.(message.id, emoji)}
        />
        <span className="text-[11px] text-gray-400 px-1">{formatTime(message.createdAt)}</span>
      </div>

      {!isMine && toolbar}
    </div>
  );
};

export default React.memo(MessageBubble);
