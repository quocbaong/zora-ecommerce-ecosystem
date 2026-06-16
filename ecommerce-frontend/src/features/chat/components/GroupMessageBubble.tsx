import { useState } from 'react';
import { Pin, RotateCcw, Trash2, SmilePlus, Reply, MoreHorizontal, Phone, Video, PhoneMissed, CheckCircle2, Clock, Users, Lock, Crown, Shield, Forward, Maximize2 } from 'lucide-react';
import type { GroupMessage, GroupMember, Poll, GroupRole } from '../types/group';
import MediaLightbox from './MediaLightbox';

function ImageContent({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="img"
        className="max-w-xs rounded-lg cursor-zoom-in"
        onClick={() => setOpen(true)}
      />
      {open && <MediaLightbox src={src} type="image" onClose={() => setOpen(false)} />}
    </>
  );
}

function VideoContent({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative inline-block group">
        <video src={src} controls className="max-w-xs rounded-lg block bg-black" preload="metadata" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition"
          title="Xem phóng to"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && <MediaLightbox src={src} type="video" onClose={() => setOpen(false)} />}
    </>
  );
}

function GifContent({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="gif"
        className="max-w-[220px] rounded-xl cursor-zoom-in"
        onClick={() => setOpen(true)}
      />
      {open && <MediaLightbox src={src} type="image" onClose={() => setOpen(false)} />}
    </>
  );
}

function formatCallDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function GroupCallCard({ content, isOwn }: { content: string; isOwn: boolean }) {
  let data: { callType?: string; status?: string; duration?: number; groupName?: string } | null = null;
  try { data = JSON.parse(content); } catch { return null; }
  if (!data) return null;

  const isVideo = data.callType === 'video';
  const isMissed = data.status === 'missed';
  const Icon = isMissed ? PhoneMissed : isVideo ? Video : Phone;
  const label = isMissed
    ? (isVideo ? 'Cuộc gọi video nhóm nhỡ' : 'Cuộc gọi thoại nhóm nhỡ')
    : (isVideo ? 'Cuộc gọi video nhóm' : 'Cuộc gọi thoại nhóm');

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm min-w-[220px] ${
      isOwn ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-800'
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
        isMissed ? 'bg-red-100 text-red-500' : isVideo ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={`text-sm font-medium ${isMissed ? 'text-red-400' : isOwn ? 'text-white' : 'text-gray-800'}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
          {isMissed ? 'Không có người tham gia' : formatCallDuration(data.duration ?? 0)}
        </p>
      </div>
    </div>
  );
}

function PollCard({
  message,
  poll,
  onVote,
  onUnvote,
}: {
  message: GroupMessage;
  poll: Poll | undefined;
  onVote?: (pollId: string, optionIds: string[]) => void;
  onUnvote?: (pollId: string) => void;
}) {
  const pollId = message.content;

  if (!poll) {
    return (
      <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl min-w-[220px]">
        <span className="text-xs text-gray-400 italic">📊 Đang tải bình chọn...</span>
      </div>
    );
  }

  const getOptionText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') {
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed.text === 'string') {
            return parsed.text;
          }
        } catch (e) {}
      }
      return text;
    }
    if (typeof text === 'object') {
      return text.text || text.label || JSON.stringify(text);
    }
    return String(text);
  };

  const isClosed = !!poll.closedAt;
  const myVote: string[] = poll.myVote ?? [];
  const totalVotes = poll.options.reduce((sum, o) => sum + Math.max(0, o.voteCount), 0);
  const hasVoted = myVote.length > 0;

  const handleOptionClick = (optionId: string) => {
    if (isClosed || message.recalled) return;
    if (myVote.includes(optionId)) {
      onUnvote?.(pollId);
    } else {
      if (poll.isMultiple) {
        const next = myVote.includes(optionId)
          ? myVote.filter((id) => id !== optionId)
          : [...myVote, optionId];
        onVote?.(pollId, next);
      } else {
        onVote?.(pollId, [optionId]);
      }
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-w-[240px] max-w-xs">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-50 flex items-start gap-2">
        <span className="text-base shrink-0">📊</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 break-words">{poll.question}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {poll.isMultiple && (
              <span className="text-[10px] text-blue-500 font-medium">Nhiều lựa chọn</span>
            )}
            {isClosed && (
              <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" /> Đã kết thúc
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-3 py-2 space-y-1.5">
        {poll.options.map((opt) => {
          const optVoteCount = Math.max(0, opt.voteCount);
          const pct = totalVotes > 0 ? Math.round((optVoteCount / totalVotes) * 100) : 0;
          const isMyChoice = myVote.includes(opt.optionId);
          const canVote = !isClosed && !message.recalled;

          return (
            <button
              key={opt.optionId}
              onClick={() => handleOptionClick(opt.optionId)}
              disabled={!canVote}
              className={`w-full text-left rounded-xl overflow-hidden transition border ${
                isMyChoice
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/40'
              } ${!canVote ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="relative px-3 py-2">
                {/* Progress bar */}
                {(hasVoted || isClosed) && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ${
                      isMyChoice ? 'bg-orange-200/60' : 'bg-gray-200/60'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${isMyChoice ? 'text-orange-700' : 'text-gray-700'}`}>
                    {getOptionText(opt.text)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isMyChoice && <CheckCircle2 className="w-3 h-3 text-orange-500" />}
                    {(hasVoted || isClosed) && (
                      <span className={`text-[10px] font-semibold ${isMyChoice ? 'text-orange-600' : 'text-gray-400'}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Users className="w-3 h-3" /> {totalVotes} lượt bình chọn
          </span>
          {hasVoted && !isClosed && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnvote?.(pollId); }}
              className="text-[10px] text-orange-500 hover:text-orange-700 font-medium"
            >
              Bỏ phiếu
            </button>
          )}
        </div>
        {poll.autoCloseAt && !isClosed && (
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Kết thúc lúc {new Date(poll.autoCloseAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

function ContactCard({ content, onStartDM }: { content: string; onStartDM?: (userId: string) => void }) {
  let data: { userId?: string; name?: string; avatarUrl?: string } | null = null;
  try { data = JSON.parse(content); } catch { return null; }
  if (!data?.userId) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm min-w-[200px] max-w-xs">
      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
        {data.avatarUrl
          ? <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" />
          : (data.name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{data.name || data.userId}</p>
        <p className="text-[11px] text-gray-400 truncate">{data.userId}</p>
      </div>
      {onStartDM && (
        <button
          onClick={() => onStartDM(data!.userId!)}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 hover:border-teal-400 rounded-lg px-2 py-1 transition shrink-0"
        >
          Nhắn tin
        </button>
      )}
    </div>
  );
}

function ReminderCard({ content }: { content: string }) {
  let data: { reminderId?: string; title?: string; remindAt?: number; participants?: string[]; fired?: boolean } | null = null;
  try { data = JSON.parse(content); } catch { return null; }
  if (!data) return null;

  const isFired = !!data.fired;
  const remindDate = data.remindAt ? new Date(data.remindAt) : null;
  const dateStr = remindDate
    ? remindDate.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-sm min-w-[220px] max-w-xs ${
      isFired ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
        isFired ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-500'
      }`}>
        🔔
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold break-words ${isFired ? 'text-orange-800' : 'text-gray-800'}`}>
          {isFired ? '🔔 Nhắc hẹn: ' : ''}{data.title}
        </p>
        {dateStr && (
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {dateStr}
          </p>
        )}
        {(data.participants?.length ?? 0) > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3" /> {data.participants!.length} thành viên được nhắc
          </p>
        )}
        {isFired && (
          <span className="inline-block mt-1 text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
            Đã tới giờ!
          </span>
        )}
      </div>
    </div>
  );
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface RenderContext {
  pollCache?: Record<string, Poll>;
  profileCache?: Record<string, { name: string; avatarUrl?: string }>;
  onVote?: (pollId: string, optionIds: string[]) => void;
  onUnvote?: (pollId: string) => void;
  onStartDM?: (userId: string) => void;
}

interface Props {
  message: GroupMessage;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
  senderRole?: GroupRole;
  members: GroupMember[];
  profileCache?: Record<string, { name: string; avatarUrl?: string }>;
  currentUserId: string;
  pollCache?: Record<string, Poll>;
  highlightAdmin?: boolean;
  onVote?: (pollId: string, optionIds: string[]) => void;
  onUnvote?: (pollId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onRecall: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onReply: (message: GroupMessage) => void;
  onForward?: (message: GroupMessage) => void;
  onViewProfile?: (userId: string) => void;
  onStartDM?: (userId: string) => void;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function renderContent(msg: GroupMessage, members: GroupMember[], isOwn: boolean, ctx: RenderContext = {}) {
  if (msg.recalled) {
    return <span className="text-xs text-gray-400 italic">Tin nhắn đã thu hồi</span>;
  }

  switch (msg.type) {
    case 'IMAGE':
      return <ImageContent src={msg.content} />;
    case 'VIDEO':
      return <VideoContent src={msg.content} />;
    case 'AUDIO':
      return <audio src={msg.content} controls className="w-56" />;
    case 'PDF':
      return (
        <a href={msg.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 underline text-sm">
          📄 Xem file PDF
        </a>
      );
    case 'GIF':
      return <GifContent src={msg.content} />;
    case 'POLL': {
      const poll = ctx.pollCache?.[msg.content];
      return (
        <PollCard
          message={msg}
          poll={poll}
          onVote={ctx.onVote}
          onUnvote={ctx.onUnvote}
        />
      );
    }
    case 'REMINDER':
      return <ReminderCard content={msg.content} />;
    case 'CONTACT':
      return <ContactCard content={msg.content} onStartDM={ctx.onStartDM} />;
    case 'CALL':
      return <GroupCallCard content={msg.content} isOwn={isOwn} />;
    case 'SYSTEM':
      const sysContent = typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content;
      return <span className="text-xs text-gray-400 italic">{sysContent}</span>;
    default: {
      // Important message — big red bold
      const baseClass = msg.important
        ? 'whitespace-pre-wrap break-words text-base font-bold text-red-600'
        : 'whitespace-pre-wrap break-words';
        
      let safeContent = msg.content;
      if (typeof msg.content === 'object') {
        console.error('CRITICAL: msg.content is an object!', msg.content);
        safeContent = JSON.stringify(msg.content);
      }
      
      // Parse @mentions — highlight any @<member-name> pattern regardless of
      // whether it was added via the mention picker (msg.mentions). This keeps
      // the orange color consistent when users type @ manually.
      if (typeof safeContent !== 'string' || !safeContent.includes('@')) {
        return <span className={baseClass}>{safeContent}</span>;
      }
      // Normalize to NFC — Vietnamese chars (ễ, ạ, ố...) can be stored as
      // either NFC (single code point) or NFD (base + combining mark) depending
      // on input source (macOS keyboard, paste, etc.). Without normalization,
      // visually-identical strings fail startsWith comparison and only ASCII
      // names like "Son" match.
      const nfc = (s: string) => s.normalize('NFC');
      const text = nfc(safeContent);
      // Build list of all group members' display names, longest-first so
      // multi-word names (e.g. "Nguyễn Quốc Bảo") match before partial names.
      const mentionList = members
        .map((m) => ({
          uid: m.userId,
          name: nfc(m.nickname || ctx.profileCache?.[m.userId]?.name || m.userId),
        }))
        .filter((m) => m.name)
        .sort((a, b) => b.name.length - a.name.length);

      const segments: React.ReactNode[] = [];
      let pos = 0;
      let key = 0;
      while (pos < text.length) {
        if (text[pos] === '@') {
          const matched = mentionList.find((m) => text.startsWith('@' + m.name, pos))
            || mentionList.find((m) => text.startsWith('@' + m.uid, pos));
          if (matched) {
            segments.push(
              <span key={key++} className="text-orange-500 font-semibold bg-orange-50 rounded px-0.5">
                @{matched.name}
              </span>
            );
            pos += matched.name.length + 1; // +1 for '@'
            continue;
          }
        }
        // Collect plain text until the next '@' or end of string
        const nextAt = text.indexOf('@', pos + 1);
        const end = nextAt === -1 ? text.length : nextAt;
        segments.push(text.slice(pos, end));
        pos = end;
      }
      return <span className={baseClass}>{segments}</span>;
    }
  }
}

export default function GroupMessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatar,
  senderRole,
  members,
  profileCache,
  currentUserId,
  pollCache,
  highlightAdmin = false,
  onVote,
  onUnvote,
  onReaction,
  onRecall,
  onDelete,
  onPin,
  onUnpin,
  onReply,
  onForward,
  onViewProfile,
  onStartDM,
}: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const canRecall = isOwn; // Only the sender can recall their own message

  const totalReactions = Object.values(message.reactions || {}).flat().length;
  const myReactions = new Set(
    Object.entries(message.reactions || {})
      .filter(([, users]) => users.includes(currentUserId))
      .map(([emoji]) => emoji)
  );

  const ctx: RenderContext = { pollCache, onVote, onUnvote, onStartDM, profileCache };
  const replyTo = message.replyTo ?? null;
  const replySenderName = replyTo
    ? members.find((m) => m.userId === replyTo.senderId)?.nickname || profileCache?.[replyTo.senderId]?.name || 'Ai do'
    : '';


  // SYSTEM messages render as a centered pill — no bubble chrome
  if (message.type === 'SYSTEM') {
    const resolveName = (uid?: string) => {
      if (!uid) return 'Người dùng';
      const m = members.find((x) => x.userId === uid);
      return m?.nickname || profileCache?.[uid]?.name || 'Người dùng';
    };
    let displayText = message.content;
    try {
      const parsed = typeof message.content === 'string' ? JSON.parse(message.content) : null;
      if (parsed && parsed.action) {
        const target = resolveName(parsed.userId);
        const actor = resolveName(parsed.actorId);
        if (parsed.action === 'MEMBER_ADDED') displayText = `${target} được ${actor} thêm vào nhóm`;
        else if (parsed.action === 'MEMBER_REMOVED') displayText = `${target} đã bị ${actor} xoá khỏi nhóm`;
        else if (parsed.action === 'MEMBER_LEFT') displayText = `${target} đã rời nhóm`;
      }
    } catch { /* not JSON, render raw */ }
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {displayText}
        </span>
      </div>
    );
  }

  // POLL / REMINDER / CALL — render without orange/white bubble wrapper (card has own styling)
  const isCardType = message.type === 'POLL' || message.type === 'REMINDER' || message.type === 'CALL' || message.type === 'CONTACT'
    || message.type === 'IMAGE' || message.type === 'VIDEO' || message.type === 'GIF' || message.type === 'PDF' || message.type === 'AUDIO';

  return (
    <div className={`flex items-end gap-2 mb-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar — only for others, clickable to view profile */}
      {!isOwn && (
        <button
          type="button"
          onClick={() => onViewProfile?.(message.senderId)}
          className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 overflow-hidden hover:ring-2 hover:ring-orange-300 transition-all focus:outline-none cursor-pointer"
          title={`Xem trang cá nhân ${senderName}`}
        >
          {senderAvatar
            ? <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
            : senderName.charAt(0).toUpperCase()}
        </button>
      )}

      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {message.isForwarded && (
          <div className="flex items-center gap-1 opacity-70 text-[10px] text-gray-400 font-medium mb-0.5 select-none">
            <span>➡️</span>
            <span>{message.forwardedFrom} đã chuyển tiếp một tin nhắn</span>
          </div>
        )}

        {/* Sender name + admin badge */}
        {!isOwn && (
          <div className="flex items-center gap-1 mb-0.5 ml-1">
            <span className="text-[11px] text-gray-400">{senderName}</span>
            {highlightAdmin && senderRole === 'OWNER' && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-yellow-600 bg-yellow-50 border border-yellow-200 px-1 py-0.5 rounded-full leading-none">
                <Crown className="w-2.5 h-2.5" /> Trưởng nhóm
              </span>
            )}
            {highlightAdmin && senderRole === 'DEPUTY' && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded-full leading-none">
                <Shield className="w-2.5 h-2.5" /> Phó nhóm
              </span>
            )}
          </div>
        )}

        {/* Reply preview */}
        {message.replyTo ? (
          <div className={`text-xs px-2 py-1 mb-1 rounded-lg border-l-2 border-orange-400 bg-orange-50 text-gray-500 max-w-full truncate ${isOwn ? 'text-right' : ''}`}>
            <span className="font-semibold text-orange-500">
              {replySenderName}
            </span>: {typeof message.replyTo.content === 'string' 
                ? message.replyTo.content.slice(0, 60) 
                : typeof message.replyTo.content === 'object' 
                  ? JSON.stringify(message.replyTo.content).slice(0, 60) 
                  : ''}
          </div>
        ) : null}

        {/* Bubble */}
        <div className="relative">
          {isCardType ? (
            // Card-style messages: no bubble wrapper
            <div className="relative">
              {renderContent(message, members, isOwn, ctx)}
              {/* Hover toolbar */}
              {!message.recalled && (
                <div className={`absolute top-0 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'} hidden group-hover:flex items-center gap-0.5 bg-white border border-gray-100 rounded-xl shadow-md px-1 py-0.5 z-10`}>
                  <div className="relative">
                    <button
                      onClick={() => { setShowEmoji((v) => !v); setShowMenu(false); }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                    {showEmoji && (
                      <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white border rounded-xl shadow-lg p-1.5 z-10`}>
                        {EMOJI_LIST.map((e) => (
                          <button
                            key={e}
                            onClick={() => { onReaction(message.messageId, e); setShowEmoji(false); }}
                            className={`text-base hover:scale-125 transition-transform ${myReactions.has(e) ? 'opacity-50' : ''}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => { setShowMenu((v) => !v); setShowEmoji(false); }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {showMenu && (
                      <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} bg-white border rounded-xl shadow-lg py-1 z-10 min-w-[140px]`}>
                        {!message.recalled && (
                          <button
                            onClick={() => { message.isPinned ? onUnpin(message.messageId) : onPin(message.messageId); setShowMenu(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Pin className="w-3.5 h-3.5" />
                            {message.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
                          </button>
                        )}
                        {onForward && !message.recalled && (
                          <button
                            onClick={() => { onForward(message); setShowMenu(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Forward className="w-3.5 h-3.5" />
                            Chuyển tiếp
                          </button>
                        )}
                        <button
                          onClick={() => { onDelete(message.messageId); setShowMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-red-500 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Xoá phía tôi
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`relative px-3 py-2 rounded-2xl shadow-sm ${
                message.important
                  ? 'bg-red-50 border-2 border-red-400 text-red-700'
                  : isOwn
                    ? 'bg-orange-500 text-white rounded-br-none text-sm'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none text-sm'
              } ${message.recalled ? 'opacity-60' : ''}`}
            >
              {renderContent(message, members, isOwn, ctx)}

              {/* Pinned badge */}
              {message.isPinned && (
                <Pin className="inline w-3 h-3 ml-1 opacity-60" />
              )}
            </div>
          )}

          {/* Hover toolbar for regular bubbles */}
          {!isCardType && !message.recalled && (
            <div className={`absolute top-0 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'} hidden group-hover:flex items-center gap-0.5 bg-white border border-gray-100 rounded-xl shadow-md px-1 py-0.5`}>
              {/* Emoji */}
              <div className="relative">
                <button
                  onClick={() => { setShowEmoji((v) => !v); setShowMenu(false); }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                >
                  <SmilePlus className="w-3.5 h-3.5" />
                </button>
                {showEmoji && (
                  <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white border rounded-xl shadow-lg p-1.5 z-10`}>
                    {EMOJI_LIST.map((e) => (
                      <button
                        key={e}
                        onClick={() => { onReaction(message.messageId, e); setShowEmoji(false); }}
                        className={`text-base hover:scale-125 transition-transform ${myReactions.has(e) ? 'opacity-50' : ''}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply */}
              <button
                onClick={() => onReply(message)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>

              {/* More */}
              <div className="relative">
                <button
                  onClick={() => { setShowMenu((v) => !v); setShowEmoji(false); }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {showMenu && (
                  <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} bg-white border rounded-xl shadow-lg py-1 z-10 min-w-[140px]`}>
                    <button
                      onClick={() => { message.isPinned ? onUnpin(message.messageId) : onPin(message.messageId); setShowMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      {message.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
                    </button>
                    {onForward && !message.recalled && (
                      <button
                        onClick={() => { onForward(message); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Forward className="w-3.5 h-3.5" />
                        Chuyển tiếp
                      </button>
                    )}
                    {canRecall && (
                      <button
                        onClick={() => { onRecall(message.messageId); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-orange-600 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Thu hồi
                      </button>
                    )}
                    <button
                      onClick={() => { onDelete(message.messageId); setShowMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-red-500 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xoá phía tôi
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {totalReactions > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions || {}).map(([emoji, users]) =>
              users.length > 0 ? (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.messageId, emoji)}
                  className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition ${
                    users.includes(currentUserId)
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {emoji} <span>{users.length}</span>
                </button>
              ) : null
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
