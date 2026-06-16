import { useState, useEffect } from 'react';
import { X, Search, Check, Loader2, UserPlus } from 'lucide-react';
import { useAddMembers, useGroupMembers } from '../hooks/useGroup';
import { useGetFriends } from '../hooks/useFriend';
import { userService } from '@/features/user/services/userService';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  groupId: string;
  onClose: () => void;
}

export default function AddMembersModal({ groupId, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, { name: string; avatarUrl?: string }>>({});

  const { user } = useAuthStore();
  const { data: friends = [], isLoading } = useGetFriends();
  const { data: members = [] } = useGroupMembers(groupId);
  const addMembers = useAddMembers(groupId);

  const existingIds = new Set(members.map((m) => m.userId));

  // Resolve friend's actual userId (the one that is not current user)
  const friendItems = friends
    .map((f) => {
      const uid = f.userId === user?.id ? f.sellerId : f.userId;
      return uid ? { uid } : null;
    })
    .filter((f): f is { uid: string } => f !== null && !existingIds.has(f.uid));

  // Fetch profiles for all friends
  useEffect(() => {
    const missing = friendItems.map((f) => f.uid).filter((id) => !profileCache[id]);
    if (missing.length === 0) return;
    missing.forEach((id) => {
      userService.getProfileById(id)
        .then((p) => setProfileCache((prev) => ({ ...prev, [id]: { name: p.fullName || 'Người dùng', avatarUrl: p.avatarUrl } })))
        .catch(() => setProfileCache((prev) => ({ ...prev, [id]: { name: 'Người dùng' } })));
    });
  }, [friends, members]);

  const filtered = friendItems.filter((f) => {
    const name = profileCache[f.uid]?.name || f.uid;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (uid: string) =>
    setSelected((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);

  const handleSubmit = () => {
    if (selected.length === 0) return;
    addMembers.mutate(selected, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4 text-orange-500" />
            Thêm thành viên
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((uid) => {
                const profile = profileCache[uid];
                return (
                  <span key={uid} className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                    {profile?.name || uid}
                    <button type="button" onClick={() => toggle(uid)}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bạn bè..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">Tất cả bạn bè đã trong nhóm</p>
            ) : (
              filtered.map((f) => {
                const profile = profileCache[f.uid];
                const name = profile?.name || f.uid;
                const isSelected = selected.includes(f.uid);
                return (
                  <button
                    key={f.uid}
                    onClick={() => toggle(f.uid)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0">
                      {profile?.avatarUrl
                        ? <img src={profile.avatarUrl} alt={name} className="w-full h-full object-cover" />
                        : name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-left text-gray-700">{name}</span>
                    {isSelected && <Check className="w-4 h-4 text-orange-500" />}
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selected.length === 0 || addMembers.isPending}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {addMembers.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Thêm ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
