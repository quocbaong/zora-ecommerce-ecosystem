import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, Phone, User, ShieldCheck, Store, ExternalLink } from 'lucide-react';
import { userService, type UserProfile } from '@/features/user/services/userService';

interface Props {
  userId: string;
  onClose: () => void;
  onStartDM?: (userId: string) => void;
}

export default function UserProfilePanel({ userId, onClose, onStartDM }: Props) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setProfile(null);
    userService.getProfileById(userId)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const name = profile?.fullName || 'Người dùng';
  const initial = name.charAt(0).toUpperCase();
  const isSeller = profile?.role === 'SELLER';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-white border-l border-gray-100 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Thông tin cá nhân</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + name */}
            <div className="flex flex-col items-center px-5 py-8 border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-500 overflow-hidden mb-3 ring-4 ring-orange-50">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt={name} className="w-full h-full object-cover" />
                  : initial}
              </div>
              <p className="text-base font-bold text-gray-900 text-center">{name}</p>
              {/* Role badge */}
              <div className={`mt-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isSeller ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {isSeller ? <Store className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {isSeller ? 'Người bán' : 'Người dùng'}
              </div>
            </div>

            {/* Info rows */}
            <div className="px-5 py-4 space-y-3">
              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Số điện thoại</p>
                    <p className="text-sm text-gray-700 font-medium">{profile.phone}</p>
                  </div>
                </div>
              )}
              {profile?.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Email</p>
                    <p className="text-sm text-gray-700 font-medium truncate max-w-[160px]">{profile.email}</p>
                  </div>
                </div>
              )}
              {!profile?.phone && !profile?.email && (
                <p className="text-xs text-gray-400 text-center py-4">Chưa có thông tin bổ sung</p>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!loading && (onStartDM || isSeller) && (
          <div className="p-4 border-t border-gray-100 space-y-2">
            {isSeller && (
              <button
                onClick={() => { navigate(`/shop/${userId}`); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-orange-200 text-orange-600 hover:bg-orange-50 text-sm font-semibold rounded-xl transition-colors"
              >
                <Store className="w-4 h-4" />
                Xem trang shop
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {onStartDM && (
              <button
                onClick={() => { onStartDM(userId); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Nhắn tin
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
