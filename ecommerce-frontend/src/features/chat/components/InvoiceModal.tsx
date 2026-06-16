import React, { useState } from 'react';
import { X, ShoppingBag, CheckCircle, Truck, Clock, XCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '@/features/order/services/orderService';
import type { InvoiceContent } from '../types';

interface Props {
  onSend: (content: string) => void;
  onClose: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'Chờ xác nhận', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
  CONFIRMED: { label: 'Đã xác nhận',  color: 'text-blue-600 bg-blue-50 border-blue-200',     icon: <CheckCircle className="w-3 h-3" /> },
  SHIPPING:  { label: 'Đang giao',    color: 'text-orange-600 bg-orange-50 border-orange-200', icon: <Truck className="w-3 h-3" /> },
  DELIVERED: { label: 'Đã giao',      color: 'text-green-600 bg-green-50 border-green-200',  icon: <CheckCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'Đã huỷ',       color: 'text-red-500 bg-red-50 border-red-200',        icon: <XCircle className="w-3 h-3" /> },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const InvoiceModal: React.FC<Props> = ({ onSend, onClose }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'my'],
    queryFn: () => orderService.getMyOrders(),
  });

  const handleSend = () => {
    const order = orders?.find((o) => o.id === selected);
    if (!order) return;

    const payload: InvoiceContent = {
      orderId: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      items: order.items?.map((item) => ({
        productName: (item as unknown as { productName?: string; name?: string }).productName
          ?? (item as unknown as { productName?: string; name?: string }).name
          ?? 'Sản phẩm',
        quantity: item.quantity,
        price: item.price,
      })),
    };

    onSend(JSON.stringify(payload));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Gửi hoá đơn</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order list */}
        <div className="overflow-y-auto max-h-80 px-5 py-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : !orders || orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Bạn chưa có đơn hàng nào</p>
          ) : (
            orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, color: 'text-gray-600 bg-gray-50 border-gray-200', icon: null };
              const isSelected = selected === order.id;

              return (
                <button
                  key={order.id}
                  onClick={() => setSelected(isSelected ? null : order.id)}
                  className={`w-full text-left rounded-xl border p-3 mb-2 transition-all ${
                    isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs text-gray-500 font-mono">#{order.id.slice(-8).toUpperCase()}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.color}`}>
                      {statusInfo.icon}{statusInfo.label}
                    </span>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <p className="text-sm text-gray-700 truncate mb-1">
                      {((order.items[0] as unknown as { productName?: string; name?: string }).productName
                        ?? (order.items[0] as unknown as { productName?: string; name?: string }).name
                        ?? 'Sản phẩm')}
                      {order.items.length > 1 && ` +${order.items.length - 1}`}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(order.totalPrice)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Huỷ
          </button>
          <button
            onClick={handleSend}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Gửi hoá đơn
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
