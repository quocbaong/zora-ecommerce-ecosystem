export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'GIF' | 'PDF' | 'INVOICE' | 'CALL';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  messageId?: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  status: MessageStatus;
  recalled: boolean;
  reactions: Record<string, string[]>;
  createdAt: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export interface Conversation {
  id: string;
  conversationType: 'DIRECT' | 'GROUP';
  userId?: string;
  sellerId?: string;
  participantIds?: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  friendshipStatus?: string;
}

export interface Group {
  groupId: string;
  name: string;
  avatarUrl?: string;
  ownerId: string;
  groupType: 'PRIVATE' | 'PUBLIC';
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  nickname?: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

export interface GroupMessage {
  messageId: string;
  groupId: string;
  senderId: string;
  type: MessageType;
  content: string;
  status: string;
  recalled: boolean;
  isSystem: boolean;
  createdAt: string;
  reactions: Record<string, string[]>;
  sender: {
    fullName?: string;
    avatarUrl?: string;
  };
  isForwarded?: boolean;
  forwardedFrom?: string;
}
