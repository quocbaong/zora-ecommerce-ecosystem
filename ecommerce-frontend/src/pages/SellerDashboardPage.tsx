import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  TrendingUp,
  Bell,
  MessageCircle,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Plus,
  BarChart2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useSellerStats,
  useSellerRevenue,
  useTopProducts,
  useLowStockProducts,
} from '@/features/order/hooks/useSellerDashboard';
import {
  useSellerOrders,
  useUpdateOrderStatus,
} from '@/features/order/hooks/useSellerOrders';
import { useNotificationStore } from '@/stores/notificationStore';
import { useMarkNotificationRead, useMarkAllNotificationsRead } from '@/features/notification/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/utils/format';
import type { Order } from '@/features/order/services/orderService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  // Backend gửi LocalDateTime theo giờ UTC nhưng không có hậu tố 'Z' → ép parse theo UTC
  const hasZone = /[zZ]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr);
  const diff = Date.now() - new Date(hasZone ? dateStr : `${dateStr}Z`).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

const orderStatusLabels: Record<Order['status'], string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  DISPUTED: 'Khiếu nại',
  REFUNDED: 'Hoàn tiền',
};

const orderStatusColors: Record<Order['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPING: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  DISPUTED: 'bg-orange-100 text-orange-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

// ─── "Danh sách cần làm" stats grid ──────────────────────────────────────────

interface TodoStatProps {
  label: string;
  value: number | string;
  highlight?: boolean;
  to?: string;
}

function TodoStat({ label, value, highlight, to }: TodoStatProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors cursor-pointer ${highlight ? 'border-orange-200 bg-orange-50 hover:bg-orange-100' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
      <span className={`text-2xl font-bold ${highlight ? 'text-orange-500' : 'text-gray-800'}`}>
        {value}
      </span>
      <span className="text-xs text-gray-500 text-center mt-0.5 leading-tight">{label}</span>
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

// ─── KPI column (Phân tích bán hàng) ─────────────────────────────────────────

interface KpiColProps {
  label: string;
  value: string | number;
  loading: boolean;
}

function KpiCol({ label, value, loading }: KpiColProps) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      {loading ? (
        <div className="animate-pulse h-6 w-20 bg-gray-200 rounded" />
      ) : (
        <span className="text-base font-bold text-gray-800 truncate">{value}</span>
      )}
    </div>
  );
}

// ─── Revenue Chart (Phân tích bán hàng) ──────────────────────────────────────

function AnalyticsSection({ stats, statsLoading, orders }: {
  stats: { totalRevenue: number; totalOrders: number; activeProducts: number } | undefined;
  statsLoading: boolean;
  orders: Order[];
}) {
  const [range, setRange] = useState<'day' | 'month'>('day');
  const { data, isLoading } = useSellerRevenue(range);

  const conversionRate = useMemo(() => {
    if (!orders.length) return '—';
    const done = orders.filter((o) => ['DELIVERED', 'CONFIRMED', 'SHIPPING'].includes(o.status)).length;
    return `${((done / orders.length) * 100).toFixed(1)}%`;
  }, [orders]);

  const estimatedVisits = useMemo(() => {
    const n = stats?.totalOrders ?? 0;
    return n > 0 ? (n * 12.5).toFixed(0) : '0';
  }, [stats]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800">Phân tích bán hàng</h2>
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          {(['day', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${range === r ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {r === 'day' ? 'Ngày' : 'Tháng'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl mb-4" />
      ) : !data?.length ? (
        <div className="h-40 flex items-center justify-center text-gray-300 text-sm mb-4">
          Chưa có dữ liệu doanh thu
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160} className="mb-4">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FA7E1E" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#FA7E1E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)
              }
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              formatter={(value) => [formatPrice(value as number), 'Doanh thu']}
              labelStyle={{ fontSize: 11, color: '#334155' }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#FA7E1E" strokeWidth={2} fill="url(#revGrad2)" dot={false} activeDot={{ r: 3, fill: '#FA7E1E' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-gray-100">
        <KpiCol label="Doanh số" value={formatPrice(stats?.totalRevenue ?? 0)} loading={statsLoading} />
        <KpiCol label="Lượt truy cập" value={estimatedVisits} loading={statsLoading} />
        <KpiCol label="Đơn hàng" value={stats?.totalOrders ?? 0} loading={statsLoading} />
        <KpiCol label="Tỷ lệ chuyển đổi" value={conversionRate} loading={statsLoading} />
      </div>
    </div>
  );
}

// ─── "Danh sách cần làm" ──────────────────────────────────────────────────────

function TodoListWidget({ orders }: { orders: Order[] }) {
  const { data: lowStock = [] } = useLowStockProducts(5);

  const counts = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return {
      pending: list.filter((o) => o.status === 'PENDING').length,
      confirmed: list.filter((o) => o.status === 'CONFIRMED').length,
      delivered: list.filter((o) => o.status === 'DELIVERED').length,
      cancelled: list.filter((o) => o.status === 'CANCELLED').length,
      shipping: list.filter((o) => o.status === 'SHIPPING').length,
    };
  }, [orders]);

  const totalTodo = counts.pending + lowStock.length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">Danh sách cần làm</h2>
          {totalTodo > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {totalTodo} việc
            </span>
          )}
        </div>
        <Link to="/seller/orders" className="text-xs text-orange-500 hover:underline flex items-center gap-0.5">
          Xem tất cả <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <TodoStat label="Chờ xác nhận" value={counts.pending} highlight={counts.pending > 0} to="/seller/orders" />
        <TodoStat label="Chờ lấy hàng" value={counts.confirmed} to="/seller/orders" />
        <TodoStat label="Đã xử lý" value={counts.delivered} />
        <TodoStat label="Đơn huỷ" value={counts.cancelled} />
        <TodoStat label="Đang giao" value={counts.shipping} to="/seller/orders" />
        <TodoStat label="Trả hàng / Hoàn tiền" value={0} />
        <TodoStat label="Sản phẩm hết hàng" value={lowStock.length} highlight={lowStock.length > 0} to="/seller/products" />
        <TodoStat label="Khuyến mãi chờ xử lý" value={0} />
      </div>
    </div>
  );
}

// ─── Recent Orders (compact) ──────────────────────────────────────────────────

function RecentOrdersWidget() {
  const { data: orders = [], isLoading, isFetching, refetch } = useSellerOrders();
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
  const navigate = useNavigate();

  const sorted = useMemo(() => {
    const list = Array.isArray(orders) ? [...orders] : [];
    return list
      .sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 6);
  }, [orders]);

  const pendingCount = useMemo(
    () => (Array.isArray(orders) ? orders : []).filter((o) => o.status === 'PENDING').length,
    [orders]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">Đơn hàng gần đây</h2>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <Bell className="w-2.5 h-2.5" />
              {pendingCount} mới
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className={`p-1 rounded text-gray-400 hover:text-gray-600 transition-colors ${isFetching ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link to="/seller/orders" className="text-xs text-orange-500 hover:underline flex items-center gap-0.5">
            Tất cả <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 py-2">
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-5 w-16 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : !sorted.length ? (
        <div className="py-6 text-center text-gray-300 text-sm">Chưa có đơn hàng nào</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {sorted.map((order) => (
            <div
              key={order.id}
              className={`flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 -mx-1 px-1 rounded-lg ${order.status === 'PENDING' ? 'bg-yellow-50/50' : ''}`}
            >
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/seller/orders')}>
                <p className="text-xs font-medium text-gray-700 truncate">
                  #{order.id.substring(0, 8).toUpperCase()}
                </p>
                <p className="text-[11px] text-gray-400">
                  {formatPrice(order.totalPrice)} · {timeAgo(order.createdAt)}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${orderStatusColors[order.status]}`}>
                {orderStatusLabels[order.status]}
              </span>
              {order.status === 'PENDING' && (
                <button
                  onClick={() => updateStatus({ id: order.id, status: 'CONFIRMED' })}
                  disabled={isPending}
                  className="shrink-0 text-[10px] bg-green-500 hover:bg-green-600 text-white font-semibold px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  Xác nhận
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top Products (compact) ───────────────────────────────────────────────────

function TopProductsWidget() {
  const { data, isLoading } = useTopProducts(5);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800">Top sản phẩm</h2>
        <Link to="/seller/products" className="text-xs text-orange-500 hover:underline flex items-center gap-0.5">
          Xem thêm <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-2.5 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="py-6 text-center text-gray-300 text-sm">Chưa có dữ liệu</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {data.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className={`text-xs font-bold w-4 text-center shrink-0 ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-300'}`}>
                {idx + 1}
              </span>
              <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0">
                {item.productImage ? (
                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{item.productName}</p>
                <p className="text-[10px] text-gray-400">Đã bán: {item.totalSold}</p>
              </div>
              <p className="text-[11px] font-semibold text-green-600 shrink-0">{formatPrice(item.totalRevenue)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notifications Panel (right column) ──────────────────────────────────────

function NotificationsPanel() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAll } = useMarkAllNotificationsRead();

  const recent = notifications.slice(0, 15);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-bold text-gray-800">Thông báo</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAll()}
            className="text-[11px] text-orange-500 hover:underline"
          >
            Đọc tất cả
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!recent.length ? (
          <div className="py-12 flex flex-col items-center gap-2 text-gray-300">
            <Bell className="w-8 h-8" />
            <p className="text-xs">Không có thông báo</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && markRead(notif.id)}
                className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${!notif.isRead ? 'bg-orange-50/50' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? 'bg-orange-500' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${!notif.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
                    {notif.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{timeAgo(notif.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alerts (low stock + pending) ────────────────────────────────────────────

function AlertsWidget() {
  const { data: lowStock = [] } = useLowStockProducts(3);
  const { data: orders = [] } = useSellerOrders();
  const pendingOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []).filter((o) => o.status === 'PENDING'),
    [orders]
  );

  if (!lowStock.length && !pendingOrders.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-bold text-gray-800">Cần xử lý ngay</h2>
        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {lowStock.length + pendingOrders.length}
        </span>
      </div>
      <div className="space-y-2">
        {pendingOrders.length > 0 && (
          <Link
            to="/seller/orders"
            className="flex items-center gap-3 p-2.5 bg-yellow-50 border border-yellow-100 rounded-lg hover:bg-yellow-100 transition-colors group"
          >
            <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-yellow-800">{pendingOrders.length} đơn chờ xác nhận</p>
            </div>
            <ArrowRight className="w-3 h-3 text-yellow-400 group-hover:text-yellow-600" />
          </Link>
        )}
        {lowStock.map((product) => (
          <Link
            key={product.id}
            to="/seller/products"
            className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors group"
          >
            <Package className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700 truncate">{product.name}</p>
              <p className="text-[10px] text-red-500">Còn {product.stock} sản phẩm</p>
            </div>
            <ArrowRight className="w-3 h-3 text-red-300 group-hover:text-red-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Actions bar ────────────────────────────────────────────────────────

function QuickActionsBar() {
  const actions = [
    { label: 'Thêm sản phẩm', icon: Plus, to: '/seller/products', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { label: 'Xem đơn hàng', icon: ShoppingBag, to: '/seller/orders', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
    { label: 'Sản phẩm', icon: Package, to: '/seller/products', color: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
    { label: 'Chat', icon: MessageCircle, to: '/chat', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { label: 'Doanh thu', icon: BarChart2, to: '/seller/revenue', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { label: 'Xu hướng', icon: TrendingUp, to: '/seller/trends', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap gap-2 justify-start">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl min-w-[72px] ${action.color} transition-colors`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold text-center leading-tight">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: orders = [] } = useSellerOrders();
  const ordersArr = Array.isArray(orders) ? orders : [];
  const user = useAuthStore((s) => s.user);

  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-full bg-gray-100 p-5">
      {/* Page title */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-800">
          Xin chào, {user?.fullName || 'Người bán'} 👋
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{today}</p>
      </div>

      {/* Two-column layout: left (content) + right (notifications) */}
      <div className="flex gap-5 items-start">

        {/* Left / main column */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Quick actions */}
          <QuickActionsBar />

          {/* Danh sách cần làm */}
          <TodoListWidget orders={ordersArr} />

          {/* Phân tích bán hàng */}
          <AnalyticsSection stats={stats} statsLoading={statsLoading} orders={ordersArr} />

          {/* Recent orders + Top products side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <RecentOrdersWidget />
            <TopProductsWidget />
          </div>

          {/* Alerts */}
          <AlertsWidget />
        </div>

        {/* Right / notifications column */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );
}
