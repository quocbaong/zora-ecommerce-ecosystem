export interface Conversation {
  id: string;           // normalized from conversationId
  participants: string[];
  productId?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  unreadUser?: number;
  unreadSeller?: number;
  // Raw backend fields for display
  userId?: string;      // buyer ID
  sellerId?: string;    // seller ID
  // Friend / direct conversation fields
  conversationType?: 'PRODUCT' | 'DIRECT';
  friendshipStatus?: 'NONE' | 'PENDING' | 'ACCEPTED';
}

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'INVOICE' | 'PRODUCT' | 'VOUCHER' | 'CALL' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'GIF';

export interface CallMessageContent {
  callId: string;
  callType: 'video' | 'audio';
  status: 'ended' | 'missed';
  duration: number; // seconds
}

export interface InvoiceContent {
  orderId: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  items?: { productName: string; quantity: number; price: number }[];
}

export interface ProductCardContent {
  productId: string;
  name: string;
  price: number;
  image?: string | null;
  sellerId?: string | null;
  shopName?: string | null;
}

export interface VoucherCardContent {
  voucherId: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  type: MessageType;
  content: string;
  recalled?: boolean;
  isDeleted?: boolean;
  reactions?: Record<string, string[]>; // { emoji: [userId, ...] }
  createdAt: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export interface SendMessagePayload {
  type: MessageType;
  content: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export interface CreateConversationPayload {
  sellerId: string;
  productId?: string;
}

// ── Shop FAQ (Quick Reply) ──────────────────────────────────────────────────
export interface ShopFaq {
  id: string;
  sellerId: string;
  question: string;
  answer: string;
  order: number;
}

export interface SaveShopFaqsPayload {
  faqs: Array<{
    id?: string;
    question: string;
    answer: string;
    order: number;
  }>;
}
