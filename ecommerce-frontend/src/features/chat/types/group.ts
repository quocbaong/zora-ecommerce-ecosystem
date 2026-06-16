export type GroupRole = 'OWNER' | 'DEPUTY' | 'MEMBER';

export type GroupMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'PDF'
  | 'AUDIO'
  | 'POLL'
  | 'REMINDER'
  | 'SYSTEM'
  | 'CALL'
  | 'CONTACT'
  | 'GIF';

export interface Group {
  groupId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdBy: string;
  memberCount: number;
  rules?: string;
  allowMemberPost?: boolean;        // default true — false = only owner/deputy can post
  highlightAdminMessages?: boolean; // default false — badge owner/deputy messages
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessage?: string;
  lastMessageType?: string;
  lastMessageSenderId?: string;
  /** Attached by listGroupsByUser — caller's own member metadata */
  memberMeta?: GroupMemberMeta;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: GroupRole;
  roleSK?: string;
  nickname?: string;
  joinedAt: string;
  mutedUntil?: string | null;
  muteMentionsOnly?: boolean;
  clearedAt?: number;
  unreadCount?: number;
}

/** Lightweight version attached to Group.memberMeta */
export interface GroupMemberMeta {
  role: GroupRole;
  nickname?: string;
  unreadCount?: number;
  mutedUntil?: string | null;
}

export interface ReplyTo {
  messageId: string;
  senderId: string;
  content: string;
  type: GroupMessageType;
}

export interface GroupMessage {
  messageId: string;
  groupId: string;
  senderId: string;
  senderRole?: string;
  type: GroupMessageType;
  content: string;
  recalled: boolean;
  deletedBy?: string[];
  reactions: Record<string, string[]>;
  replyTo?: ReplyTo | null;
  mentions?: string[];
  isPinned: boolean;
  important?: boolean;
  createdAt: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
  // shard keys (internal)
  PK?: string;
  SK?: string;
}

export interface PollOption {
  optionId: string;
  text: string;
  voteCount: number;
}

export interface Poll {
  pollId: string;
  groupId: string;
  messageId: string;
  question: string;
  options: PollOption[];
  isMultiple: boolean;
  createdBy: string;
  createdAt: string;
  closedAt?: string | null;
  autoCloseAt?: number | null; // epoch ms, optional deadline
  /** Populated by getPoll endpoint — optionIds the current user has voted */
  myVote?: string[];
}

export interface PinnedMessage {
  messageId: string;
  groupId: string;
  pinnedBy: string;
  pinnedAt: string;
  senderId: string;
  type: GroupMessageType;
  content: string;
  PK?: string;
  SK?: string;
}

export interface Reminder {
  reminderId: string;
  groupId: string;
  createdBy: string;
  title: string;
  remindAt: number; // epoch ms
  remindAtDate: string; // YYYY-MM-DD
  participants: string[];
  done: boolean;
  createdAt: string;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  avatarUrl?: string;
  initialMemberIds?: string[];
}

export interface SendGroupMessagePayload {
  type: GroupMessageType;
  content: string;
  replyTo?: ReplyTo | null;
  mentions?: string[];
  isForwarded?: boolean;
  forwardedFrom?: string;
}
