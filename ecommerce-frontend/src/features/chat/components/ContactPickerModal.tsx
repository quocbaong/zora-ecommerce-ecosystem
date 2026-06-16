import { useState } from 'react';
import { X, Search, UserSquare2 } from 'lucide-react';
import { useGetFriends } from '../hooks/useFriend';
import { userService } from '@/features/user/services/userService';
import { useEffect } from 'react';

interface Props {
  currentUserId: string;
  onSend: (contactId: string, contactName: string, contactAvatar?: string) => void;
  onClose: () => void;
}

interface FriendItem {
  uid: string;
  name: string;
  avatarUrl?: string;
}

export default function ContactPickerModal({ currentUserId, onSend, onClose }: Props) {
  const { data: friends = [], isLoading } = useGetFriends();
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatarUrl?: string }>>({});

  // Extract friend userIds (the person in the conversation that is not the current user)
  const friendIds = friends
    .map((f) => f.userId === currentUserId ? f.sellerId : f.userId)
    .filter((id): id is string => !!id);

  // Fetch profiles for friends
  useEffect(() => {
    friendIds.forEach((id) => {
      if (!profiles[id]) {
        userService.getProfileById(id)
          .then((p) => setProfiles((prev) => ({ ...prev, [id]: { name: p.fullName || id, avatarUrl: p.avatarUrl } })))
          .catch(() => setProfiles((prev) => ({ ...prev, [id]: { name: id } })));
      }
    });
  }, [friendIds.join(',')]);

  const friendItems: FriendItem[] = friendIds.map((uid) => ({
    uid,
    name: profiles[uid]?.name || uid,
    avatarUrl: profiles[uid]?.avatarUrl,
  }));

  const filtered = friendItems.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <UserSquare2 className="w-4 h-4 text-teal-500" /> Gửi danh thiếp
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bạn bè..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {/* Friend list */}
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {friendIds.length === 0 ? 'Chưa có bạn bè' : 'Không tìm thấy'}
            </div>
          ) : (
            filtered.map((f) => (
              <button
                key={f.uid}
                onClick={() => { onSend(f.uid, f.name, f.avatarUrl); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                  {f.avatarUrl
                    ? <img src={f.avatarUrl} alt={f.name} className="w-full h-full object-cover" />
                    : f.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400 truncate">{f.uid}</p>
                </div>
                <span className="text-xs text-teal-600 font-medium shrink-0">Gửi</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
