import React, { useState, useEffect } from 'react';
import { X, Search, Crown, Shield, UserMinus, MessageSquare, ChevronDown, User, Check, XCircle } from 'lucide-react';
import { useGroupMembers, useRemoveMember, useChangeRole, usePendingMembers, useApproveMember, useRejectMember } from '../hooks/useGroup';
import { userService } from '@/features/user/services/userService';
import type { GroupMember, GroupRole } from '../types/group';

interface Props {
  groupId: string;
  currentUserId: string;
  myRole?: GroupRole;
  profileCache?: Record<string, { name: string; avatarUrl?: string }>;
  onClose: () => void;
  onAddMembers: () => void;
  onStartDM?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

const ROLE_LABEL: Record<GroupRole, string> = {
  OWNER: 'Trưởng nhóm',
  DEPUTY: 'Phó nhóm',
  MEMBER: 'Thành viên',
};

const ROLE_ICON: Record<GroupRole, React.ReactNode> = {
  OWNER: <Crown className="w-3 h-3 text-yellow-500" />,
  DEPUTY: <Shield className="w-3 h-3 text-blue-500" />,
  MEMBER: null,
};

export default function GroupMembersPanel({ groupId, currentUserId, myRole, profileCache = {}, onClose, onAddMembers, onStartDM, onViewProfile }: Props) {
  const [search, setSearch] = useState('');
  const [menuUserId, setMenuUserId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useGroupMembers(groupId);
  const { data: pendingMembers = [] } = usePendingMembers(groupId);
  const approveMember = useApproveMember(groupId);
  const rejectMember = useRejectMember(groupId);

  const removeMember = useRemoveMember(groupId);
  const changeRole = useChangeRole(groupId);

  const [localProfiles, setLocalProfiles] = useState<Record<string, { name: string; avatarUrl?: string }>>({});

  useEffect(() => {
    const all = [...members, ...pendingMembers];
    if (all.length === 0) return;
    const missing = all.map((m) => m.userId).filter((id) => id && !profileCache[id] && !localProfiles[id]);
    if (missing.length === 0) return;
    missing.forEach((id) => {
      userService.getProfileById(id)
        .then((p) => setLocalProfiles((prev) => ({ ...prev, [id]: { name: p.fullName || id, avatarUrl: p.avatarUrl } })))
        .catch(() => setLocalProfiles((prev) => ({ ...prev, [id]: { name: id } })));
    });
  }, [members, pendingMembers, profileCache]);

  const canManage = myRole === 'OWNER' || myRole === 'DEPUTY';

  // Filter out any PENDING role members from active members list
  const activeMembers = members.filter((m) => (m.role as string) !== 'PENDING');

  const filtered = activeMembers.filter((m) => {
    if (!m.userId) return false;
    const q = search.toLowerCase();
    const name = (m.nickname || profileCache[m.userId]?.name || localProfiles[m.userId]?.name || m.userId || '').toLowerCase();
    return name.includes(q);
  });

  const sections: { title: string; role: GroupRole }[] = [
    { title: 'Trưởng nhóm', role: 'OWNER' },
    { title: 'Phó nhóm', role: 'DEPUTY' },
    { title: 'Thành viên', role: 'MEMBER' },
  ];

  const handleRemove = (userId: string) => {
    if (!window.confirm('Xóa thành viên này khỏi nhóm?')) return;
    removeMember.mutate(userId, { onSuccess: () => setMenuUserId(null) });
  };

  const handleChangeRole = (userId: string, role: GroupRole) => {
    changeRole.mutate({ userId, role }, { onSuccess: () => setMenuUserId(null) });
  };

  return (
    <div className="flex flex-col h-full w-72 border-l border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800 text-sm">Thành viên ({activeMembers.length})</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm thành viên..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300"
          />
        </div>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex justify-center py-8 text-gray-400 text-xs">Đang tải...</div>
        ) : (
          <>
            {sections.map(({ title, role }) => {
              const group = filtered.filter((m) => m.role === role);
              if (group.length === 0) return null;
              return (
                <div key={role}>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-4 py-1.5">{title}</p>
                  {group.map((member) => (
                    <MemberRow
                      key={member.userId}
                      member={member}
                      displayName={member.nickname || profileCache[member.userId]?.name || localProfiles[member.userId]?.name || 'Người dùng'}
                      avatarUrl={profileCache[member.userId]?.avatarUrl || localProfiles[member.userId]?.avatarUrl}
                      isSelf={member.userId === currentUserId}
                      canManage={canManage && myRole === 'OWNER' || (canManage && member.role === 'MEMBER')}
                      isMenuOpen={menuUserId === member.userId}
                      onToggleMenu={() => setMenuUserId((v) => v === member.userId ? null : member.userId)}
                      onRemove={() => handleRemove(member.userId)}
                      onChangeRole={(r) => handleChangeRole(member.userId, r)}
                      onDM={() => { onStartDM?.(member.userId); setMenuUserId(null); }}
                      onViewProfile={() => { onViewProfile?.(member.userId); setMenuUserId(null); }}
                      myRole={myRole}
                    />
                  ))}
                </div>
              );
            })}

            {/* Pending approvals section for Trưởng nhóm (OWNER) - rendered BELOW the member list */}
            {myRole === 'OWNER' && pendingMembers.length > 0 && (
              <div className="border-t border-orange-100 bg-orange-50/50 pt-2 mt-4 pb-2">
                <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider px-4 py-2">
                  Yêu cầu chờ duyệt ({pendingMembers.length})
                </p>
                {pendingMembers.map((member) => {
                  const displayName = member.nickname || profileCache[member.userId]?.name || localProfiles[member.userId]?.name || 'Người dùng';
                  const avatarUrl = profileCache[member.userId]?.avatarUrl || localProfiles[member.userId]?.avatarUrl;
                  return (
                    <div key={member.userId} className="flex items-center justify-between px-4 py-2 hover:bg-orange-50 group">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0 overflow-hidden">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{displayName}</p>
                          <span className="text-[9px] text-gray-400">Yêu cầu tham gia</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => approveMember.mutate(member.userId)}
                          className="p-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition"
                          title="Phê duyệt"
                          disabled={approveMember.isPending}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => rejectMember.mutate(member.userId)}
                          className="p-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Từ chối"
                          disabled={rejectMember.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add members button - visible to all active group members */}
      {myRole !== undefined && (
        <div className="p-3 border-t">
          <button
            onClick={onAddMembers}
            className="w-full py-2 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition"
          >
            + Thêm thành viên
          </button>
        </div>
      )}
    </div>
  );
}

interface MemberRowProps {
  member: GroupMember;
  displayName: string;
  avatarUrl?: string;
  isSelf: boolean;
  canManage: boolean;
  isMenuOpen: boolean;
  myRole?: GroupRole;
  onToggleMenu: () => void;
  onRemove: () => void;
  onChangeRole: (role: GroupRole) => void;
  onDM: () => void;
  onViewProfile: () => void;
}

function MemberRow({ member, displayName, avatarUrl, isSelf, canManage, isMenuOpen, myRole, onToggleMenu, onRemove, onChangeRole, onDM, onViewProfile }: MemberRowProps) {

  return (
    <div className="relative flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 group">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 overflow-hidden">
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          : (displayName || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">
          {displayName} {isSelf && <span className="text-gray-400">(Bạn)</span>}
        </p>
        <div className="flex items-center gap-1">
          {ROLE_ICON[member.role]}
          <span className="text-[10px] text-gray-400">{ROLE_LABEL[member.role]}</span>
        </div>
      </div>

      {/* Context menu trigger */}
      <button
        onClick={onToggleMenu}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 transition"
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Context menu */}
      {isMenuOpen && (
        <div className="absolute right-3 top-full mt-0.5 bg-white border rounded-xl shadow-lg py-1 z-20 min-w-[160px]">
          <button onClick={onViewProfile} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-orange-500" /> Xem trang cá nhân
          </button>
          {!isSelf && (
            <button onClick={onDM} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Nhắn tin riêng
            </button>
          )}
          {canManage && member.role !== 'OWNER' && (
            <>
              {member.role === 'MEMBER' && myRole === 'OWNER' && (
                <button onClick={() => onChangeRole('DEPUTY')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-500" /> Đặt làm phó nhóm
                </button>
              )}
              {member.role === 'DEPUTY' && myRole === 'OWNER' && (
                <button onClick={() => onChangeRole('MEMBER')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
                  <UserMinus className="w-3.5 h-3.5" /> Hạ xuống thành viên
                </button>
              )}
              <button onClick={onRemove} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-red-500 flex items-center gap-2">
                <UserMinus className="w-3.5 h-3.5" /> Xóa khỏi nhóm
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
