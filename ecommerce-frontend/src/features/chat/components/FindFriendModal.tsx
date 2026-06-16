import React, { useState } from 'react';
import { X, Search, UserPlus, Loader2, UserCheck } from 'lucide-react';
import { useSearchUser, useSendFriendRequest } from '../hooks/useFriend';
import type { FoundUser } from '../services/friendService';

interface FindFriendModalProps {
  onClose: () => void;
}

export default function FindFriendModal({ onClose }: FindFriendModalProps) {
  const [email, setEmail] = useState('');
  const { result, loading, error, search } = useSearchUser();
  const sendRequest = useSendFriendRequest();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed) search(trimmed);
  };

  const handleSendRequest = (user: FoundUser) => {
    sendRequest.mutate(user.id, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Tìm bạn bè</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search form */}
        <div className="px-6 py-5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email..."
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tìm'}
            </button>
          </form>

          {/* Error state */}
          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center shrink-0">
                {result.avatarUrl ? (
                  <img src={result.avatarUrl} alt={result.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-orange-500 font-bold text-lg">
                    {(result.fullName || result.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{result.fullName || 'Người dùng'}</p>
                <p className="text-xs text-gray-500 truncate">{result.email}</p>
              </div>

              <button
                onClick={() => handleSendRequest(result)}
                disabled={sendRequest.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                {sendRequest.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                Kết bạn
              </button>
            </div>
          )}

          {/* Tips */}
          {!result && !error && !loading && (
            <div className="mt-4 flex items-start gap-2.5 text-xs text-gray-400">
              <UserCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Nhập email để tìm và gửi lời mời kết bạn. Người nhận sẽ nhận được tin nhắn và có thể chấp nhận.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
