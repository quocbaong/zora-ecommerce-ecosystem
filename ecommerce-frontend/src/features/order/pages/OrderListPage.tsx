import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronRight, ClipboardList } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { Order } from '../services/orderService';
import EmptyState from '@/components/common/EmptyState';

const STATUS_TABS: { key: Order['status'] | 'UNPAID' | ''; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'UNPAID', label: 'Chờ thanh toán' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Đã hủy' },
  { key: 'DISPUTED', label: 'Khiếu nại' },
  { key: 'REFUNDED', label: 'Đã hoàn tiền' },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<
  Order['status'],
  { label: string; className: string }
> = {
  PENDING:   { label: 'Chờ xác nhận', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  CONFIRMED: { label: 'Đã xác nhận',  className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SHIPPING:  { label: 'Đang giao',    className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  DELIVERED: { label: 'Đã giao',      className: 'bg-green-100 text-green-700 border-green-200' },
  CANCELLED: { label: 'Đã hủy',       className: 'bg-red-100 text-red-700 border-red-200' },
  DISPUTED:  { label: 'Khiếu nại',    className: 'bg-orange-100 text-orange-700 border-orange-200' },
  REFUNDED:  { label: 'Đã hoàn tiền', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const OrderSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
    <div className="flex justify-between mb-3">
      <div className="h-4 bg-gray-200 rounded w-32" />
      <div className="h-6 bg-gray-200 rounded-full w-24" />
    </div>
    <div className="h-3 bg-gray-200 rounded w-48 mb-4" />
    <div className="flex justify-between items-center">
      <div className="h-5 bg-gray-200 rounded w-28" />
      <div className="h-4 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

function getPaymentDeadline(createdAt: string, paymentMethod?: string): Date | null {
  if (!paymentMethod || paymentMethod === 'COD') return null;
  const timeString = createdAt.endsWith('Z') ? createdAt : `${createdAt}Z`;
  const date = new Date(timeString);
  if (paymentMethod === 'PAYOS') {
    date.setHours(date.getHours() + 12);
  } else if (paymentMethod === 'STRIPE' || paymentMethod === 'MOMO' || paymentMethod === 'ONLINE') {
    date.setMinutes(date.getMinutes() + 30);
  }
  return date;
}

const PaymentCountdownTimer = ({ deadline }: { deadline: Date }) => {
  const [timeLeft, setTimeLeft] = useState<number>(deadline.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(deadline.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (timeLeft <= 0) {
    return <span className="text-red-600 font-medium">Đã quá hạn</span>;
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const isUrgent = hours === 0;

  return (
    <span className={`font-mono text-sm ${isUrgent ? 'text-red-500 font-bold' : 'text-orange-500 font-medium'}`}>
      Còn lại: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
};

export default function OrderListPage() {
  const navigate = useNavigate();
  const { data: orders, isLoading, isError } = useOrders();
  const [activeTab, setActiveTab] = useState<Order['status'] | 'UNPAID' | ''>('');

  const filtered = (orders ?? []).filter((o) => {
    const isUnpaidOnline = o.paymentStatus === 'PENDING' && !!o.paymentMethod && o.paymentMethod !== 'COD';
    const isOverdueCancelled = o.status === 'CANCELLED' && isUnpaidOnline;
    const isPendingUnpaid = o.status === 'PENDING' && isUnpaidOnline;
    const isUnpaidTab = isPendingUnpaid || isOverdueCancelled;

    if (!activeTab) return true;
    if (activeTab === 'UNPAID') return isUnpaidTab;
    if (activeTab === 'PENDING') return o.status === 'PENDING' && !isPendingUnpaid;
    if (activeTab === 'CANCELLED') return o.status === 'CANCELLED' && !isOverdueCancelled;
    return o.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-7 h-7 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
        </div>

        {/* Status tabs */}
        <div className="flex overflow-x-auto gap-1 mb-6 border-b border-gray-200 pb-0">
          {STATUS_TABS.map((tab) => {
            const count = (orders ?? []).filter((o) => {
              const isUnpaidOnline = o.paymentStatus === 'PENDING' && !!o.paymentMethod && o.paymentMethod !== 'COD';
              const isOverdueCancelled = o.status === 'CANCELLED' && isUnpaidOnline;
              const isPendingUnpaid = o.status === 'PENDING' && isUnpaidOnline;
              const isUnpaidTab = isPendingUnpaid || isOverdueCancelled;

              if (!tab.key) return true;
              if (tab.key === 'UNPAID') return isUnpaidTab;
              if (tab.key === 'PENDING') return o.status === 'PENDING' && !isPendingUnpaid;
              if (tab.key === 'CANCELLED') return o.status === 'CANCELLED' && !isOverdueCancelled;
              return o.status === tab.key;
            }).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                  activeTab === tab.key
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            Không thể tải danh sách đơn hàng. Vui lòng thử lại.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <OrderSkeleton key={i} />)}
          </div>
        ) : !filtered.length ? (
          <div className="bg-white rounded-2xl shadow-sm py-20">
            <EmptyState
              icon={<Package className="w-16 h-16 text-gray-300" />}
              title={activeTab ? 'Không có đơn hàng nào' : 'Chưa có đơn hàng nào'}
              description={activeTab ? 'Không có đơn hàng ở trạng thái này.' : 'Hãy mua sắm và theo dõi đơn hàng của bạn tại đây'}
              actionLabel={activeTab ? undefined : 'Mua sắm ngay'}
              onAction={activeTab ? undefined : () => navigate('/products')}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const isUnpaidOnline = order.paymentStatus === 'PENDING' && !!order.paymentMethod && order.paymentMethod !== 'COD';
              const isOverdueCancelled = order.status === 'CANCELLED' && isUnpaidOnline;
              const isPendingUnpaid = order.status === 'PENDING' && isUnpaidOnline;
              const paymentDeadline = getPaymentDeadline(order.createdAt, order.paymentMethod);
              
              let status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
              if (isOverdueCancelled) {
                status = { label: 'Đã quá hạn', className: 'bg-red-100 text-red-700 border-red-200' };
              } else if (isPendingUnpaid) {
                status = { label: 'Chờ thanh toán', className: 'bg-red-100 text-red-700 border-red-200' };
              }
              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border border-transparent hover:border-orange-100 group"
                  aria-label={`Xem chi tiết đơn hàng ${order.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-400 font-mono mb-0.5 truncate max-w-[180px]">
                        #{order.id}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {isPendingUnpaid && paymentDeadline && (
                    <div className="mb-2">
                      <PaymentCountdownTimer deadline={paymentDeadline} />
                    </div>
                  )}
                  {isOverdueCancelled && (
                    <div className="mb-2">
                      <span className="text-red-600 font-medium text-sm">Đã quá hạn</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(order.totalPrice)}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-orange-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Xem chi tiết
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
