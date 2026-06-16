
import { Users, Pin, Settings, Bell, BellOff, Phone, Video, LogOut } from 'lucide-react';
import type { Group, GroupMember } from '../types/group';
import type { ActiveCallInfo } from '@/stores/groupCallStore';

interface Props {
  group: Group;
  myMember?: GroupMember | null;
  pinnedCount?: number;
  callDisabled?: boolean;
  leaveDisabled?: boolean;
  activeCall?: ActiveCallInfo | null;
  onShowMembers: () => void;
  onShowPins: () => void;
  onShowSettings: () => void;
  onShowMute: () => void;
  onLeaveGroup: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onJoinCall?: () => void;
  memberCount?: number;
}

export default function GroupChatHeader({
  group,
  myMember,
  pinnedCount = 0,
  callDisabled = false,
  leaveDisabled = false,
  activeCall = null,
  onShowMembers,
  onShowPins,
  onShowSettings,
  onShowMute,
  onLeaveGroup,
  onAudioCall,
  onVideoCall,
  onJoinCall,
  memberCount,
}: Props) {
  const initial = (group.name || '?').charAt(0).toUpperCase();
  const isMuted = !!myMember?.mutedUntil;
  const canManage = myMember?.role === 'OWNER' || myMember?.role === 'DEPUTY';
  const count = memberCount !== undefined ? memberCount : group.memberCount;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
      {/* Left: avatar + name */}
      <button
        onClick={onShowSettings}
        className="flex items-center gap-3 hover:opacity-80 transition min-w-0"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
          {group.avatarUrl ? (
            <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate text-sm">{group.name}</p>
          <p className="text-xs text-gray-500">{count} thành viên</p>
        </div>
      </button>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Join ongoing call OR start a new call */}
        {activeCall && !callDisabled ? (
          <button
            onClick={onJoinCall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition animate-pulse"
            title="Tham gia cuộc gọi đang diễn ra"
          >
            {activeCall.callType === 'video'
              ? <Video className="w-3.5 h-3.5" />
              : <Phone className="w-3.5 h-3.5" />}
            Tham gia
          </button>
        ) : (
          <>
            <button
              onClick={onAudioCall}
              disabled={callDisabled}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Gọi thoại nhóm"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={onVideoCall}
              disabled={callDisabled}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Gọi video nhóm"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Pinned messages */}
        <button
          onClick={onShowPins}
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          title="Tin nhắn đã ghim"
        >
          <Pin className="w-4 h-4" />
          {pinnedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center font-bold">
              {pinnedCount > 9 ? '9+' : pinnedCount}
            </span>
          )}
        </button>

        {/* Members */}
        <button
          onClick={onShowMembers}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          title="Thành viên"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Mute */}
        <button
          onClick={onShowMute}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          title={isMuted ? 'Đang tắt thông báo' : 'Tắt thông báo'}
        >
          {isMuted ? <BellOff className="w-4 h-4 text-orange-400" /> : <Bell className="w-4 h-4" />}
        </button>

        <button
          onClick={onLeaveGroup}
          disabled={leaveDisabled}
          className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Rời nhóm"
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* Settings — OWNER/DEPUTY only */}
        {canManage && (
          <button
            onClick={onShowSettings}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            title="Cài đặt nhóm"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
