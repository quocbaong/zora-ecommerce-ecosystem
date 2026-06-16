import React, { useState, useRef } from 'react';
import { X, Users, Search, Check, Loader2 } from 'lucide-react';
import { useCreateGroup } from '../hooks/useGroup';
import { useGetFriends } from '../hooks/useFriend';
import { useAuthStore } from '@/stores/authStore';

interface ParticipantProfile {
  id: string;
  fullName?: string;
  avatarUrl?: string;
}

interface Props {
  onClose: () => void;
  profileCache?: Record<string, ParticipantProfile>;
}

export default function CreateGroupModal({ onClose, profileCache = {} }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createGroup = useCreateGroup();
  const { data: friends = [], isLoading: loadingFriends } = useGetFriends();

  const { user } = useAuthStore();

  // Each friend entry is a conversation object; resolve the one that is not current user
  const friendItems = friends
    .map((f) => {
      const uid = f.userId === user?.id ? f.sellerId : f.userId;
      if (!uid) return null;
      const profile = profileCache[uid];
      return { uid, name: profile?.fullName || uid, avatarUrl: profile?.avatarUrl };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const filtered = friendItems.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (uid: string) =>
    setSelected((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selected.length < 2) return;

    createGroup.mutate(
      { name: name.trim(), description: description.trim(), avatarUrl: '', initialMemberIds: selected },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Tạo nhóm mới
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0 hover:opacity-90 transition"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase() || <Users className="w-7 h-7" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div className="flex-1 space-y-2">
              <input
                type="text"
                placeholder="Tên nhóm *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                required
              />
              <input
                type="text"
                placeholder="Mô tả nhóm (tuỳ chọn)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((uid) => {
                const f = friendItems.find((x) => x.uid === uid);
                return (
                  <span
                    key={uid}
                    className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full"
                  >
                    {f?.name || uid}
                    <button type="button" onClick={() => toggle(uid)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Friend search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm bạn bè để thêm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Friend list */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {loadingFriends ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-4">Không tìm thấy bạn bè</p>
            ) : (
              filtered.map((f) => {
                const isSelected = selected.includes(f.uid);
                return (
                  <button
                    key={f.uid}
                    type="button"
                    onClick={() => toggle(f.uid)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                      isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0">
                      {f.avatarUrl ? (
                        <img src={f.avatarUrl} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        f.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="flex-1 text-sm text-left text-gray-700">{f.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-orange-500" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Hint */}
          <p className="text-[11px] text-gray-400 text-center">
            Cần đặt tên nhóm và chọn tối thiểu 2 thành viên ({selected.length}/2)
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim() || selected.length < 2 || createGroup.isPending}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {createGroup.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo nhóm
          </button>
        </form>
      </div>
    </div>
  );
}
