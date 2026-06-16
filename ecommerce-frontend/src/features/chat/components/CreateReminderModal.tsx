import React, { useState } from 'react';
import { X, Bell, Check, Loader2 } from 'lucide-react';
import { useCreateReminder } from '../hooks/useGroup';
import type { GroupMember } from '../types/group';

interface Props {
  groupId: string;
  members: GroupMember[];
  profileCache?: Record<string, { name: string; avatarUrl?: string }>;
  onClose: () => void;
}

const QUICK_TIMES: { label: string; minutes: number }[] = [
  { label: '30 phút', minutes: 30 },
  { label: '1 tiếng', minutes: 60 },
  { label: '2 tiếng', minutes: 120 },
  { label: '3 tiếng', minutes: 180 },
  { label: '6 tiếng', minutes: 360 },
  { label: 'Ngày mai', minutes: 24 * 60 },
  { label: '3 ngày', minutes: 3 * 24 * 60 },
  { label: 'Tuần sau', minutes: 7 * 24 * 60 },
];

export default function CreateReminderModal({ groupId, members, profileCache = {}, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [datetime, setDatetime] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const createReminder = useCreateReminder(groupId);

  const toggle = (uid: string) =>
    setSelectedMembers((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);

  const applyQuick = (minutes: number) => {
    // For "Ngày mai" snap to same time tomorrow, others offset from now
    let d: Date;
    if (minutes === 24 * 60) {
      d = new Date();
      d.setDate(d.getDate() + 1);
      // keep current HH:MM
    } else {
      d = new Date(Date.now() + minutes * 60000);
    }
    setDatetime(d.toISOString().slice(0, 16));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !datetime) return;
    const remindAt = new Date(datetime).getTime();
    if (isNaN(remindAt) || remindAt <= Date.now()) return;
    createReminder.mutate(
      { title: title.trim(), remindAt, participants: selectedMembers },
      { onSuccess: onClose }
    );
  };

  const minDatetime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-orange-500" /> Tạo nhắc hẹn
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Tiêu đề *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên nhắc hẹn..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              required
            />
          </div>

          {/* Datetime with quick presets */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Thời gian *</label>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TIMES.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  onClick={() => applyQuick(p.minutes)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 font-medium transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              min={minDatetime}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              required
            />
          </div>

          {/* Members */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Nhắc thành viên</label>
            <div className="max-h-40 overflow-y-auto space-y-0.5 border border-gray-100 rounded-xl p-1">
              {members.map((m) => {
                const isSelected = selectedMembers.includes(m.userId);
                const displayName = m.nickname || profileCache[m.userId]?.name || 'Người dùng';
                const avatarUrl = profileCache[m.userId]?.avatarUrl;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggle(m.userId)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition ${isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                      {avatarUrl
                        ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        : displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-xs text-left text-gray-700">{displayName}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim() || !datetime || createReminder.isPending}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {createReminder.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo nhắc hẹn
          </button>
        </form>
      </div>
    </div>
  );
}
