import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  MessageCircle,
  User,
  Bell,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Settings,
  Ticket,
  Megaphone,
  Wallet,
  Store,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import NotificationDropdown from '@/features/notification/components/NotificationDropdown';
import AiChatWidget from '@/features/ai/components/AiChatWidget';
import { useUnreadTitle } from '@/hooks/useUnreadTitle';
import { useChatStore } from '@/stores/chatStore';
import { useGroupStore } from '@/stores/groupStore';

const NAV_ITEMS = [
  { label: 'Tổng quan', icon: LayoutDashboard, to: '/seller' },
  { label: 'Quản lý đơn hàng', icon: ShoppingBag, to: '/seller/orders' },
  { label: 'Quản lý sản phẩm', icon: Package, to: '/seller/products' },
  { label: 'Doanh thu', icon: BarChart2, to: '/seller/revenue' },
  { label: 'Xu hướng', icon: TrendingUp, to: '/seller/trends' },
  { label: 'Danh mục shop', icon: Store, to: '/seller/shop-categories' },
  { label: 'Khuyến mãi', icon: Ticket, to: '/seller/vouchers' },
  { label: 'Quản lý Ví', icon: Wallet, to: '/seller/wallet' },
  { label: 'Quảng cáo banner', icon: Megaphone, to: '/seller/ads' },
  { label: 'Chat', icon: MessageCircle, to: '/chat' },
  { label: 'Trang cá nhân', icon: User, to: '/seller/profile' },
];

export default function SellerLayout() {
  useUnreadTitle();
  const { user, logout } = useAuthStore();
  const totalUnreadChat = useChatStore((s) => s.totalUnreadChat);
  const totalGroupUnread = useGroupStore((s) => s.totalGroupUnread);
  const chatUnread = (totalUnreadChat || 0) + (totalGroupUnread || 0);
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0 ${
          sidebarOpen ? 'w-56' : 'w-14'
        }`}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
          {sidebarOpen ? (
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold text-orange-500 tracking-tight">ZORA</span>
              <span className="text-[10px] text-gray-400 font-medium">Kênh Người Bán</span>
            </div>
          ) : (
            <span className="text-base font-bold text-orange-500 mx-auto">Z</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map(({ label, icon: Icon, to }) => {
            const active = to === '/seller'
              ? location.pathname === '/seller'
              : location.pathname.startsWith(to);
            const badge = to === '/chat' && chatUnread > 0 ? chatUnread : 0;
            return (
              <Link
                key={to}
                to={to}
                title={!sidebarOpen ? label : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative group ${
                  active
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-orange-500 rounded-r-full" />
                )}
                <div className="relative shrink-0">
                  <Icon className="w-4 h-4" />
                  {badge > 0 && !sidebarOpen && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[16px] text-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                {sidebarOpen && <span className="truncate">{label}</span>}
                {sidebarOpen && badge > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-5 text-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {sidebarOpen && active && badge === 0 && <ChevronRight className="w-3.5 h-3.5 ml-auto text-orange-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-gray-200 p-3 shrink-0">
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Đăng xuất' : undefined}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationDropdown />

            {/* Avatar dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-orange-500" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block truncate max-w-[120px]">
                  {user?.fullName || user?.email}
                </span>
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-800 truncate">{user?.fullName || 'Người bán'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/seller/profile"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Quản lý trang cá nhân
                  </Link>
                  <button
                    onClick={() => { setAvatarOpen(false); handleLogout(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <AiChatWidget />
      <Toaster position="top-right" richColors duration={2000} style={{ top: '80px' }} />
    </div>
  );
}
