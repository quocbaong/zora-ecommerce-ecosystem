import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { chatService } from '../services/chatService';
import { pollService } from '../services/pollService';
import { userService } from '@/features/user/services/userService';
import {
  useGroupMessages, useSendGroupMessage, useRecallGroupMessage, useDeleteGroupMessage,
  useAddGroupReaction, usePinMessage, useUnpinMessage, useMarkGroupAsRead,
  useGroupMembers, usePinnedMessages, useLeaveGroup,
} from '../hooks/useGroup';
import { useGroupSocket } from '../hooks/useGroupSocket';
import GroupChatHeader from './GroupChatHeader';
import GroupMessageBubble from './GroupMessageBubble';
import GroupChatInput from './GroupChatInput';
import GroupMembersPanel from './GroupMembersPanel';
import GroupSettingsPanel from './GroupSettingsPanel';
import PinnedMessagesPanel from './PinnedMessagesPanel';
import PinnedBanner from './PinnedBanner';
import MuteGroupModal from './MuteGroupModal';
import AddMembersModal from './AddMembersModal';
import UserProfilePanel from './UserProfilePanel';
import CreatePollModal from './CreatePollModal';
import CreateReminderModal from './CreateReminderModal';
import ContactPickerModal from './ContactPickerModal';
import GroupForwardModal from './GroupForwardModal';
import type { Group, GroupMessage, GroupMember, ReplyTo, Poll } from '../types/group';
import type { ActiveCallInfo } from '@/stores/groupCallStore';

interface Props {
  group: Group;
  onStartDM?: (userId: string) => void;
  callDisabled?: boolean;
  activeCall?: ActiveCallInfo | null;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onJoinCall?: () => void;
}

function groupMessagesByDate(messages: GroupMessage[]) {
  const groups: { date: string; messages: GroupMessage[] }[] = [];
  let current = '';
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== current) { current = d; groups.push({ date: msg.createdAt, messages: [msg] }); }
    else groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

function formatDateSep(ts: string) {
  const date = new Date(ts);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function GroupChatWindow({
  group,
  onStartDM,
  callDisabled = false,
  activeCall = null,
  onAudioCall,
  onVideoCall,
  onJoinCall,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const groupId = group.groupId;

  // Panels
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [showMute, setShowMute] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<GroupMessage | null>(null);
  const [profileCache, setProfileCache] = useState<Record<string, { name: string; avatarUrl?: string }>>({});
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [pollCache, setPollCache] = useState<Record<string, Poll>>({});
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [unreadWhileScrolledUp, setUnreadWhileScrolledUp] = useState(0);

  // Socket
  const { emitGroupTyping } = useGroupSocket(groupId, {
    onPollData: (pollId, poll) => {
      // Preserve myVote from existing cache — re-emitted polls from backend don't carry myVote
      setPollCache((prev) => ({
        ...prev,
        [pollId]: { ...poll, myVote: prev[pollId]?.myVote ?? poll.myVote },
      }));
    },
    onPollUpdated: (_, pollId, options, closed) => {
      setPollCache((prev) => {
        const existing = prev[pollId];
        if (!existing) return prev;
        return { ...prev, [pollId]: { ...existing, options, closedAt: closed ? new Date().toISOString() : null } };
      });
    },
  });

  // Data — useGroupMessages syncs server data into store; store is single source of truth
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = useGroupMessages(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: pins = [] } = usePinnedMessages(groupId);
  const activeMessages = useGroupStore((s) => s.groupMessages[groupId] ?? []);
  const typingUsers = useGroupStore((s) => s.groupTypingUsers[groupId] ?? {});
  const myMember = members.find((m) => m.userId === user?.id) as GroupMember | undefined;
  const isAdminOrDeputy = myMember?.role === 'OWNER' || myMember?.role === 'DEPUTY';
  const postingBlocked = group.allowMemberPost === false && !isAdminOrDeputy;
  const highlightAdmin = group.highlightAdminMessages === true;

  // Mutations
  const sendMessage = useSendGroupMessage(groupId);
  const recallMessage = useRecallGroupMessage(groupId);
  const deleteMessage = useDeleteGroupMessage(groupId);
  const addReaction = useAddGroupReaction(groupId);
  const pinMessage = usePinMessage(groupId);
  const unpinMessage = useUnpinMessage(groupId);
  const markAsRead = useMarkGroupAsRead(groupId);
  const leaveGroup = useLeaveGroup();

  // Scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageStateRef = useRef<{ groupId: string | null; lastMessageId: string | null }>({
    groupId: null,
    lastMessageId: null,
  });
  // True once the user has scrolled noticeably away from the bottom. Stays
  // true until they manually scroll back to the bottom (or click the jump
  // button). Prevents auto-scroll from fighting the user's reading position.
  const userScrolledUpRef = useRef(false);
  // Debounce timer for scrollToBottom — multiple new messages arriving in
  // quick succession (e.g. add-many-members emits several SYSTEM messages)
  // would otherwise trigger overlapping smooth-scroll animations → jumpy UX.
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // Debounce: coalesce rapid-fire calls (multi-message burst) into one
    // animation by waiting 60ms for the burst to settle, then scrolling once.
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      scrollDebounceRef.current = null;
      // Re-check: if user started scrolling up during the debounce wait,
      // don't yank them down — respect their intent.
      if (userScrolledUpRef.current) return;
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        if (behavior === 'smooth') {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        } else {
          container.scrollTop = container.scrollHeight;
        }
      });
    }, behavior === 'smooth' ? 60 : 0);
    setShowJumpToLatest(false);
    setUnreadWhileScrolledUp(0);
    // Manual reset: scrollToBottom is "user intent to be at bottom", clear flag
    userScrolledUpRef.current = false;
  }, []);

  // After group switch, late-loading content (poll cards, images) may grow
  // scrollHeight slightly after the initial scrollToBottom. Instead of using
  // a ResizeObserver (which had unexplained race conditions causing scroll),
  // just schedule a couple of extra scrollToBottom('auto') calls. The ref
  // check inside scrollToBottom prevents them from firing if the user
  // scrolled up in the meantime.
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        if (userScrolledUpRef.current) return;
        const container = scrollContainerRef.current;
        if (!container) return;
        container.scrollTop = container.scrollHeight;
      }, 300),
      setTimeout(() => {
        if (userScrolledUpRef.current) return;
        const container = scrollContainerRef.current;
        if (!container) return;
        container.scrollTop = container.scrollHeight;
      }, 800),
    ];
    return () => {
      timers.forEach(clearTimeout);
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };
  }, [groupId]);

  const scrollToMessage = useCallback(async (messageId: string) => {
    // Fast path — message already rendered
    let el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
      return;
    }

    // Slow path — message is in an older page that hasn't been loaded yet.
    // Iteratively fetch older pages until the message DOM node appears or
    // there's nothing left to load. Capped at 30 page fetches as a safety net.
    let attempts = 0;
    while (attempts < 30) {
      if (!hasNextPage) break;
      await fetchNextPage();
      // Wait one tick for DOM to flush
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 2000);
        return;
      }
      attempts += 1;
    }
  }, [fetchNextPage, hasNextPage]);

  // Track previous scrollTop to detect direction; pagination should only fire
  // when user is genuinely scrolling UP (not during a programmatic down-scroll
  // that briefly passes through scrollTop < 50 — that would auto-load the
  // OLDEST messages even though the user just wanted to jump to latest).
  const lastScrollTopRef = useRef(0);
  // Continuously tracks distance from bottom. The effect uses this snapshot
  // (taken BEFORE a new message DOM was added) to decide whether to auto-scroll.
  const lastDistanceFromBottomRef = useRef(0);

  const handleScroll = useCallback(async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distance = target.scrollHeight - (target.scrollTop + target.clientHeight);
    const scrollingDown = target.scrollTop > lastScrollTopRef.current;
    lastScrollTopRef.current = target.scrollTop;
    lastDistanceFromBottomRef.current = distance;

    // Direction-aware tracking:
    //   ANY upward motion (> 5px from bottom) → user is reading old msgs
    //   Reaching bottom while scrolling down → reset
    if (!scrollingDown && distance > 5) {
      userScrolledUpRef.current = true;
    } else if (scrollingDown && distance < 10) {
      userScrolledUpRef.current = false;
      setShowJumpToLatest(false);
      setUnreadWhileScrolledUp(0);
    }

    // Pagination: only when user actively scrolled UP to the top, NOT when a
    // programmatic scroll-to-bottom passes through scrollTop < 50 going down.
    if (!scrollingDown && target.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      const scrollHeightBefore = target.scrollHeight;
      const scrollTopBefore = target.scrollTop;
      await fetchNextPage();
      requestAnimationFrame(() => {
        const scrollHeightAfter = target.scrollHeight;
        target.scrollTop = scrollHeightAfter - scrollHeightBefore + scrollTopBefore;
        lastScrollTopRef.current = target.scrollTop;
      });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const lastMessageId = activeMessages[activeMessages.length - 1]?.messageId ?? null;
  useEffect(() => {
    if (activeMessages.length === 0 || !lastMessageId) return;

    const prev = prevMessageStateRef.current;
    const isGroupSwitch = prev.groupId !== groupId;
    const hasNewLatestMessage = prev.lastMessageId !== null && prev.lastMessageId !== lastMessageId;

    prevMessageStateRef.current = { groupId, lastMessageId };

    if (isGroupSwitch || prev.lastMessageId === null) {
      userScrolledUpRef.current = false;
      lastDistanceFromBottomRef.current = 0;
      scrollToBottom('auto');
      setUnreadWhileScrolledUp(0);
      return;
    }

    if (!hasNewLatestMessage) return;

    const lastMsg = activeMessages[activeMessages.length - 1];
    const isOwnMessage = lastMsg?.senderId === user?.id;

    // For incoming: auto-scroll ONLY when ALL signals say the user is at the
    // literal bottom. Strict threshold (< 10px from bottom pre-message) plus
    // ref check. Any doubt → show V button. Predictable beats clever.
    const wasLiterallyAtBottom =
      !userScrolledUpRef.current && lastDistanceFromBottomRef.current < 10;

    if (isOwnMessage || wasLiterallyAtBottom) {
      scrollToBottom('smooth');
    } else {
      setShowJumpToLatest(true);
      setUnreadWhileScrolledUp((c) => c + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, activeMessages.length, lastMessageId, scrollToBottom]);

  // Mark as read on mount + when new foreign message arrives
  const lastReadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || activeMessages.length === 0) return;
    const last = activeMessages[activeMessages.length - 1];
    if (last.senderId !== user.id && last.messageId !== lastReadRef.current) {
      lastReadRef.current = last.messageId;
      markAsRead.mutate();
    }
  }, [activeMessages, user?.id]);

  const memberMap = Object.fromEntries(members.map((m) => [m.userId, m]));

  // Lazy-load poll data (including myVote) for all POLL messages in chat
  useEffect(() => {
    const pollMessages = activeMessages.filter((m) => m.type === 'POLL' && !m.recalled);
    pollMessages.forEach((m) => {
      if (!pollCache[m.content]) {
        pollService.getPoll(groupId, m.content)
          .then((poll) => setPollCache((prev) => ({ ...prev, [poll.pollId]: poll })))
          .catch(() => {});
      }
    });
  }, [activeMessages]);

  const handleVote = useCallback(async (pollId: string, optionIds: string[]) => {
    // Optimistic update
    setPollCache((prev) => {
      const existing = prev[pollId];
      if (!existing) return prev;
      return { ...prev, [pollId]: { ...existing, myVote: optionIds } };
    });
    try {
      const updated = await pollService.vote(groupId, pollId, optionIds);
      setPollCache((prev) => ({
        ...prev,
        [pollId]: { ...prev[pollId], ...updated, myVote: optionIds }
      }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể bình chọn');
      // Revert
      setPollCache((prev) => {
        const existing = prev[pollId];
        if (!existing) return prev;
        return { ...prev, [pollId]: { ...existing, myVote: [] } };
      });
    }
  }, [groupId]);

  const handleUnvote = useCallback(async (pollId: string) => {
    // Optimistic update
    setPollCache((prev) => {
      const existing = prev[pollId];
      if (!existing) return prev;
      return { ...prev, [pollId]: { ...existing, myVote: [] } };
    });
    try {
      const updated = await pollService.unvote(groupId, pollId);
      setPollCache((prev) => ({
        ...prev,
        [pollId]: { ...prev[pollId], ...updated, myVote: [] }
      }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể bỏ phiếu');
    }
  }, [groupId]);

  /** Display name: nickname (if set) > fullName > userId */
  const getSenderName = (userId: string) => {
    const member = memberMap[userId];
    if (member?.nickname) return member.nickname;
    // Don't fall back to the raw userId (UUID) — show a friendly placeholder
    // while the profile is loading so we never leak the id in the UI.
    return profileCache[userId]?.name || 'Người dùng';
  };

  const getSenderAvatar = (userId: string) => profileCache[userId]?.avatarUrl;

  // Typing indicator
  const typingNames = Object.keys(typingUsers)
    .filter((uid) => typingUsers[uid] && uid !== user?.id)
    .map((uid) => getSenderName(uid));
  const someoneTyping = typingNames.length > 0;

  // Upload file helper
  const handleUploadFile = async (file: File) => {
    const res = await chatService.uploadFile(file, groupId);
    const url = res?.url;
    if (!url) return;
    const type = file.type.startsWith('image/') ? 'IMAGE'
      : file.type.startsWith('video/') ? 'VIDEO'
      : file.type.startsWith('audio/') ? 'AUDIO'
      : 'PDF';
    sendMessage.mutate({ type: type as never, content: url });
  };

  const handleSend = (content: string, type = 'TEXT', replyTo: ReplyTo | null = null, mentions: string[] = [], important = false) => {
    sendMessage.mutate({ type: type as never, content, replyTo, mentions, important } as never);
    setReplyingTo(null);
  };

  const handleSendContact = (contactId: string, contactName: string, contactAvatar?: string) => {
    sendMessage.mutate({
      type: 'CONTACT' as never,
      content: JSON.stringify({ userId: contactId, name: contactName, avatarUrl: contactAvatar }),
    } as never);
  };

  const handleLeaveGroup = useCallback(() => {
    const confirmMessage = myMember?.role === 'OWNER'
      ? (group.memberCount <= 1
          ? `Rời khỏi "${group.name}"? Vì đây là thành viên cuối cùng, nhóm sẽ bị xoá.`
          : `Rời khỏi "${group.name}"? Quyền trưởng nhóm sẽ được chuyển cho thành viên khác.`)
      : `Rời khỏi "${group.name}"?`;
    if (!window.confirm(confirmMessage)) return;
    leaveGroup.mutate(groupId);
  }, [group.memberCount, group.name, groupId, leaveGroup, myMember?.role]);

  // Fetch display names for all group members AND any userIds referenced in
  // SYSTEM messages (members who left no longer appear in `members`, so we
  // must fetch their profile explicitly to avoid showing "Người dùng").
  useEffect(() => {
    const memberIds = members.map((m) => m.userId);
    const systemUserIds: string[] = [];
    for (const msg of activeMessages) {
      if (msg.type !== 'SYSTEM' || typeof msg.content !== 'string') continue;
      try {
        const data = JSON.parse(msg.content);
        if (data?.userId) systemUserIds.push(data.userId);
        if (data?.actorId) systemUserIds.push(data.actorId);
      } catch { /* non-JSON SYSTEM (e.g. CALL) — skip */ }
    }
    const all = Array.from(new Set([...memberIds, ...systemUserIds]));
    const missing = all.filter((id) => id && !profileCache[id]);
    if (missing.length === 0) return;
    missing.forEach((id) => {
      userService.getProfileById(id)
        .then((p) => setProfileCache((prev) => ({ ...prev, [id]: { name: p.fullName || 'Người dùng', avatarUrl: p.avatarUrl } })))
        .catch(() => setProfileCache((prev) => ({ ...prev, [id]: { name: 'Người dùng' } })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, activeMessages]);

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <GroupChatHeader
          group={group}
          myMember={myMember}
          pinnedCount={pins.length}
          callDisabled={callDisabled}
          leaveDisabled={leaveGroup.isPending}
          memberCount={members.length}
          onShowMembers={() => { setShowMembers((v) => !v); setShowSettings(false); setShowPins(false); }}
          onShowPins={() => { setShowPins((v) => !v); setShowMembers(false); setShowSettings(false); }}
          onShowSettings={() => { setShowSettings((v) => !v); setShowMembers(false); setShowPins(false); }}
          onShowMute={() => setShowMute(true)}
          onLeaveGroup={handleLeaveGroup}
          activeCall={activeCall}
          onAudioCall={onAudioCall ?? (() => {})}
          onVideoCall={onVideoCall ?? (() => {})}
          onJoinCall={onJoinCall}
        />

        {/* Pinned messages banner — always visible when there's at least 1 pin */}
        <PinnedBanner
          groupId={groupId}
          pins={pins}
          onJumpToMessage={scrollToMessage}
        />

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3"
          onScroll={handleScroll}
        >
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {groupMessagesByDate(activeMessages).map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400">{formatDateSep(group.date)}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {group.messages.map((msg) => (
                <div
                  key={msg.messageId}
                  id={`msg-${msg.messageId}`}
                  className={`rounded-lg transition-colors duration-700 ${highlightedMessageId === msg.messageId ? 'bg-yellow-100' : ''}`}
                >
                  <GroupMessageBubble
                    message={msg}
                    isOwn={msg.senderId === user?.id}
                    senderName={getSenderName(msg.senderId)}
                    senderAvatar={getSenderAvatar(msg.senderId)}
                    senderRole={memberMap[msg.senderId]?.role}
                    members={members}
                    profileCache={profileCache}
                    currentUserId={user?.id ?? ''}
                    pollCache={pollCache}
                    highlightAdmin={highlightAdmin}
                    onVote={handleVote}
                    onUnvote={handleUnvote}
                    onReaction={(id, emoji) => addReaction.mutate({ messageId: id, emoji })}
                    onRecall={(id) => recallMessage.mutate(id)}
                    onDelete={(id) => deleteMessage.mutate(id)}
                    onPin={(id) => pinMessage.mutate(id)}
                    onUnpin={(id) => unpinMessage.mutate(id)}
                    onReply={(m) => setReplyingTo(m)}
                    onForward={(m) => setForwardingMsg(m)}
                    onViewProfile={(userId) => setViewProfileUserId(userId)}
                    onStartDM={onStartDM}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Typing indicator */}
          {someoneTyping && (
            <div className="flex items-end gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                {(typingNames[0] || '?').charAt(0).toUpperCase()}
              </div>
              <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          )}

          {/* Group "Đã xem" receipt — avatars of readers shown below last my message */}
          {(() => {
            const lastMine = [...activeMessages].reverse().find((m) => m.senderId === user?.id && !m.recalled);
            if (!lastMine) return null;
            const readers = useGroupStore.getState().groupReadState[groupId];
            if (!readers) return null;
            const readerIds = [...readers].filter((uid) => uid !== user?.id);
            if (readerIds.length === 0) return null;
            return (
              <div className="flex justify-end items-center gap-1 pr-3 -mt-1 mb-1 flex-wrap">
                {readerIds.slice(0, 5).map((uid) => {
                  const p = profileCache[uid];
                  return p?.avatarUrl ? (
                    <img key={uid} src={p.avatarUrl} alt={p.name} title={`${p.name} đã xem`} className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-white" />
                  ) : (
                    <div key={uid} title={`${p?.name ?? uid} đã xem`} className="w-3.5 h-3.5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white">
                      {(p?.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                  );
                })}
                {readerIds.length > 5 && (
                  <span className="text-[9px] text-gray-400">+{readerIds.length - 5}</span>
                )}
                <span className="text-[10px] text-gray-400">Đã xem</span>
              </div>
            );
          })()}

          <div ref={messagesEndRef} />
        </div>

        {showJumpToLatest && (
          <div className="absolute bottom-24 right-6 z-10">
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-orange-500"
              aria-label="Xuống tin nhắn mới nhất"
            >
              <ChevronDown className="h-6 w-6" />
              {unreadWhileScrolledUp > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center shadow">
                  {unreadWhileScrolledUp > 99 ? '99+' : unreadWhileScrolledUp}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Input */}
        <GroupChatInput
          onSend={handleSend}
          onUploadFile={handleUploadFile}
          onTyping={() => emitGroupTyping(groupId)}
          onOpenPoll={() => setShowPoll(true)}
          onOpenReminder={() => setShowReminder(true)}
          members={members}
          profileCache={profileCache}
          currentUserId={user?.id ?? ''}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          disabled={sendMessage.isPending || postingBlocked}
          postingBlocked={postingBlocked}
          onOpenContactPicker={() => setShowContactPicker(true)}
        />
      </div>

      {/* Slide-in panels */}
      {showMembers && (
        <GroupMembersPanel
          groupId={groupId}
          currentUserId={user?.id ?? ''}
          myRole={myMember?.role}
          profileCache={profileCache}
          onClose={() => setShowMembers(false)}
          onAddMembers={() => { setShowAddMembers(true); setShowMembers(false); }}
          onStartDM={onStartDM}
          onViewProfile={(uid) => { setViewProfileUserId(uid); setShowMembers(false); }}
        />
      )}
      {showSettings && (
        <GroupSettingsPanel
          group={group}
          myMember={myMember}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showPins && (
        <PinnedMessagesPanel
          groupId={groupId}
          onClose={() => setShowPins(false)}
          onScrollToMessage={scrollToMessage}
        />
      )}

      {/* Modals */}
      {showMute && (
        <MuteGroupModal
          groupId={groupId}
          myMember={myMember}
          onClose={() => setShowMute(false)}
        />
      )}
      {showAddMembers && (
        <AddMembersModal
          groupId={groupId}
          onClose={() => setShowAddMembers(false)}
        />
      )}
      {showPoll && (
        <CreatePollModal
          groupId={groupId}
          onClose={() => setShowPoll(false)}
        />
      )}
      {showReminder && (
        <CreateReminderModal
          groupId={groupId}
          members={members}
          profileCache={profileCache}
          onClose={() => setShowReminder(false)}
        />
      )}

      {showContactPicker && (
        <ContactPickerModal
          currentUserId={user?.id ?? ''}
          onSend={handleSendContact}
          onClose={() => setShowContactPicker(false)}
        />
      )}

      {/* User Profile Panel */}
      {viewProfileUserId && (
        <UserProfilePanel
          userId={viewProfileUserId}
          onClose={() => setViewProfileUserId(null)}
          onStartDM={onStartDM}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMsg && (
        <GroupForwardModal
          message={forwardingMsg}
          currentGroupId={groupId}
          profileCache={profileCache}
          onClose={() => setForwardingMsg(null)}
        />
      )}
    </div>
  );
}
