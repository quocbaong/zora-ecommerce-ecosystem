import * as XLSX from 'xlsx';
import type { Order } from '@/features/order/services/orderService';

const STATUS_LABELS: Record<Order['status'], string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  DISPUTED: 'Khiếu nại',
  REFUNDED: 'Hoàn tiền',
};

export function exportOrdersToExcel(orders: Order[], filename = 'don-hang') {
  const rows = orders.map((o, idx) => ({
    'STT': idx + 1,
    'Mã đơn': o.id.slice(0, 8).toUpperCase(),
    'Người mua': o.shippingAddress?.fullName ?? '',
    'Số điện thoại': o.shippingAddress?.phoneNumber ?? '',
    'Địa chỉ': [
      o.shippingAddress?.street,
      o.shippingAddress?.ward,
      o.shippingAddress?.district,
      o.shippingAddress?.province,
    ].filter(Boolean).join(', '),
    'Số sản phẩm': o.items?.length ?? 0,
    'Tổng tiền (VND)': o.totalPrice,
    'Phương thức TT': o.paymentMethod ?? '',
    'Trạng thái TT': o.paymentStatus ?? '',
    'Trạng thái đơn': STATUS_LABELS[o.status],
    'Mã vận đơn': o.trackingNumber ?? '',
    'Ngày đặt': o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');

  // Auto column widths
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, unknown>)[key] ?? '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}-${Date.now()}.xlsx`);
}
