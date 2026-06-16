import type { Order } from '@/features/order/services/orderService';
import { formatPrice } from '@/utils/format';

const STATUS_LABELS: Record<Order['status'], string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  DISPUTED: 'Khiếu nại',
  REFUNDED: 'Hoàn tiền',
};

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildLabelHtml(order: Order): string {
  const addr = [
    order.shippingAddress?.street,
    order.shippingAddress?.ward,
    order.shippingAddress?.district,
    order.shippingAddress?.province,
  ].filter(Boolean).join(', ');

  const items = (order.items ?? []).map((i) => `${escHtml(i.productName)} x${i.quantity}`).join(', ');
  const code = escHtml(order.id.slice(0, 8).toUpperCase());
  const tracking = escHtml(order.trackingNumber ?? code);

  return `
<div class="label">
  <div class="label-header">
    <div class="brand">ZORA EXPRESS</div>
    <div class="tracking">${tracking}</div>
  </div>
  <div class="label-body">
    <div class="section">
      <div class="label-text">NGƯỜI NHẬN</div>
      <div class="value">${escHtml(order.shippingAddress?.fullName ?? '—')}</div>
      <div class="value">${escHtml(order.shippingAddress?.phoneNumber ?? '—')}</div>
      <div class="value addr">${escHtml(addr || '—')}</div>
    </div>
    <div class="section">
      <div class="label-text">HÀNG HÓA</div>
      <div class="value items">${items || '—'}</div>
      <div class="price">${escHtml(formatPrice(order.totalPrice))}</div>
    </div>
    <div class="section footer">
      <span>Mã đơn: #${code}</span>
      <span>TT: ${escHtml(order.paymentMethod ?? 'COD')}</span>
      <span>${STATUS_LABELS[order.status]}</span>
    </div>
  </div>
</div>`;
}

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .label {
    width: 100mm; min-height: 100mm;
    border: 1.5px solid #111; margin: 4mm auto;
    page-break-after: always;
  }
  .label-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 10px; border-bottom: 1.5px solid #111; background: #111; color: #fff;
  }
  .brand { font-size: 13px; font-weight: 800; letter-spacing: 1px; }
  .tracking { font-size: 18px; font-weight: 900; font-family: monospace; }
  .label-body { padding: 8px 10px; }
  .section { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
  .section:last-child { border-bottom: none; }
  .label-text { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .value { font-size: 12px; font-weight: 600; line-height: 1.5; }
  .addr { font-weight: 400; font-size: 11px; }
  .items { font-weight: 400; font-size: 11px; }
  .price { font-size: 16px; font-weight: 800; margin-top: 4px; }
  .footer { display: flex; gap: 10px; flex-wrap: wrap; font-size: 10px; color: #555; }
  @media print {
    @page { size: 100mm 148mm; margin: 3mm; }
    body { padding: 0; }
  }
`;

export function printOrderLabels(orders: Order[]) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  const labelsHtml = orders.map(buildLabelHtml).join('\n');

  win.document.open();
  win.document.write(`<!doctype html><html lang="vi"><head>
    <meta charset="utf-8" />
    <title>In vận đơn hàng loạt (${orders.length} đơn)</title>
    <style>${PRINT_CSS}</style>
  </head><body>${labelsHtml}</body></html>`);
  win.document.close();
  win.focus();
  win.onload = () => { win.print(); win.close(); };
}
