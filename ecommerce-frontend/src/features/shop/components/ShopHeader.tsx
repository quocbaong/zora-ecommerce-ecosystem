import { useState } from 'react';
import { Store, MessageCircle, Plus, Check, X, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ShopInfo } from '../types';
import { useAuthStore } from '@/stores/authStore';
import { useFollowShop, useUnfollowShop } from '../hooks/useShop';
import { toast } from 'sonner';
import ReportShopModal from './ReportShopModal';

interface Props {
  shop: ShopInfo;
  productCount: number;
}

function joinedYears(joinedAt: string): string {
  const joined = new Date(joinedAt);
  const now = new Date();
  const months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth());
  if (months < 1) return 'Mới tham gia';
  if (months < 12) return `${months} tháng trước`;
  const years = Math.floor(months / 12);
  return `${years} năm trước`;
}

export default function ShopHeader({ shop, productCount }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const followMut = useFollowShop(shop.sellerId);
  const unfollowMut = useUnfollowShop(shop.sellerId);
  const isSelf = user?.id === shop.sellerId;
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleReportClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsReportOpen(true);
  };

  const handleFollow = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (shop.following) {
      unfollowMut.mutate(undefined, { onSuccess: () => toast.success('Đã bỏ theo dõi') });
    } else {
      followMut.mutate(undefined, { onSuccess: () => toast.success('Đã theo dõi shop') });
    }
  };

  const handleChat = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(`/chat?sellerId=${shop.sellerId}`);
  };

  return (
    <div
      className="relative rounded-xl bg-gradient-to-r from-primary to-orange-600 p-6 text-white shadow-md"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-white/30 bg-white">
            {shop.avatarUrl ? (
              <img src={shop.avatarUrl} alt={shop.shopName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary">
                <Store className="h-8 w-8" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{shop.shopName}</h1>
            <p className="mt-1 text-xs text-white/80">{joinedYears(shop.joinedAt)} tham gia</p>
            {!isSelf && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleFollow}
                  disabled={followMut.isPending || unfollowMut.isPending}
                  title={shop.following ? 'Nhấn để hủy theo dõi' : 'Theo dõi shop'}
                  className={`group flex items-center gap-1 rounded-md border px-4 py-1.5 text-xs font-semibold uppercase backdrop-blur-sm transition disabled:opacity-50 ${
                    shop.following
                      ? 'border-white/30 bg-transparent text-white/80 hover:border-red-300 hover:bg-red-500/20 hover:text-white'
                      : 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {shop.following ? (
                    <>
                      <Check className="h-3.5 w-3.5 group-hover:hidden" />
                      <X className="hidden h-3.5 w-3.5 group-hover:block" />
                      <span className="group-hover:hidden">Đang theo</span>
                      <span className="hidden group-hover:inline">Bỏ theo dõi</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Theo dõi
                    </>
                  )}
                </button>
                <button
                  onClick={handleChat}
                  className="flex items-center gap-1 rounded-md border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase backdrop-blur-sm transition hover:bg-white/20"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Chat
                </button>
                <button
                  onClick={handleReportClick}
                  className="flex items-center gap-1 rounded-md border border-red-400 bg-red-500/20 px-4 py-1.5 text-xs font-semibold uppercase backdrop-blur-sm transition hover:bg-red-500/40 text-white"
                >
                  <Flag className="h-3.5 w-3.5" /> Tố cáo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-2">
          <Stat label="Sản phẩm" value={productCount.toString()} />
          <Stat label="Người Theo Dõi" value={formatStat(shop.followerCount)} />
          <Stat label="Đang Theo" value={formatStat(shop.followingCount)} />
          <Stat label="Tham Gia" value={joinedYears(shop.joinedAt)} />
        </div>
      </div>

      {isReportOpen && (
        <ReportShopModal
          sellerId={shop.sellerId}
          shopName={shop.shopName}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/80">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
