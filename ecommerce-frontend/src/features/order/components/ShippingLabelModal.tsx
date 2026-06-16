import { useEffect, useRef, useState } from 'react';
import { QRCode } from 'antd';
import { MapPin, Package2, Phone, Printer, User, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sellerApplicationService, type SellerApplicationResponse } from '@/features/user/services/sellerApplicationService';
import { useAddresses, useProfile } from '@/features/user/hooks/useUser';
import type { Address } from '@/features/user/services/userService';
import type { Order } from '@/features/order/services/orderService';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/utils/format';

interface ShippingLabelModalProps {
  order: Order;
  onClose: () => void;
}

type ShippingLabelForm = {
  provider: string;
  senderShopName: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  itemSummary: string;
  orderCode: string;
  trackingNumber: string;
  paymentMethod: string;
  codAmount: string;
  note: string;
  deliveryDate: string;
};

function composeAddress(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join(', ');
}

function formatDateLabel(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getDefaultAddress(addresses?: Address[]) {
  if (!addresses || addresses.length === 0) return null;
  return addresses.find((address) => address.default) ?? addresses[0];
}

function buildItemSummary(order: Order) {
  if (!order.items || order.items.length === 0) return 'Không có thông tin sản phẩm';
  return order.items
    .map((item) => `${item.productName} x${item.quantity}`)
    .join(', ');
}

function buildSenderAddress(sellerApplication?: SellerApplicationResponse | null, address?: Address | null) {
  if (sellerApplication?.warehouseAddress) return sellerApplication.warehouseAddress;
  if (!address) return '';
  return composeAddress([address.street, address.ward, address.district, address.province]);
}

function buildInitialForm(
  order: Order,
  args: {
    authName?: string;
    authPhone?: string;
    sellerApplication?: SellerApplicationResponse | null;
    defaultAddress?: Address | null;
  }
): ShippingLabelForm {
  const { authName, authPhone, sellerApplication, defaultAddress } = args;
  const receiverAddress = order.shippingAddress?.fullAddress
    || composeAddress([
      order.shippingAddress?.street,
      order.shippingAddress?.ward,
      order.shippingAddress?.district,
      order.shippingAddress?.province,
    ]);
  const senderAddress = buildSenderAddress(sellerApplication, defaultAddress);
  const codAmount = order.paymentMethod === 'COD' ? String(Math.round(order.totalPrice)) : '0';

  return {
    provider: order.shippingProvider || 'ZORA Express',
    senderShopName: sellerApplication?.shopName || authName || 'ZORA Seller',
    senderName: authName || sellerApplication?.fullName || '',
    senderPhone: authPhone || defaultAddress?.phone || '',
    senderAddress,
    receiverName: order.shippingAddress?.fullName || '',
    receiverPhone: order.shippingAddress?.phoneNumber || '',
    receiverAddress,
    itemSummary: buildItemSummary(order),
    orderCode: order.id.slice(0, 8).toUpperCase(),
    trackingNumber: order.trackingNumber || '',
    paymentMethod: order.paymentMethod || 'COD',
    codAmount,
    note: order.paymentMethod === 'COD' ? 'Thu hộ khi giao hàng' : 'Đã thanh toán online',
    deliveryDate: formatDateLabel(order.estimatedDeliveryDate),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBarcodePattern(value: string) {
  const pattern: number[] = [2, 1, 2, 1, 2, 1];

  for (const char of value) {
    const code = char.charCodeAt(0);
    for (let shift = 0; shift < 7; shift += 1) {
      pattern.push(((code >> shift) & 1) === 1 ? 3 : 1);
      pattern.push(1);
    }
    pattern.push(2);
    pattern.push(1);
  }

  pattern.push(3, 1, 1, 2, 2, 1);
  return pattern;
}

function TrackingBarcode({ value }: { value: string }) {
  const pattern = buildBarcodePattern(value);
  const barHeight = 58;
  const totalWidth = pattern.reduce((sum, width) => sum + width, 0);
  let offset = 0;

  return (
    <svg
      width="100%"
      height={barHeight + 18}
      viewBox={`0 0 ${totalWidth} ${barHeight + 18}`}
      preserveAspectRatio="none"
      aria-label={`barcode-${value}`}
    >
      {pattern.map((width, index) => {
        const x = offset;
        offset += width;
        if (index % 2 !== 0) return null;

        return (
          <rect
            key={`${value}-${index}`}
            x={x}
            y={0}
            width={width}
            height={barHeight}
            fill="#111827"
          />
        );
      })}
      <text
        x={totalWidth / 2}
        y={barHeight + 14}
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fill="#111827"
      >
        {value}
      </text>
    </svg>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ color: '#6b7280', marginTop: 1 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function ShippingLabelPreview({
  form,
  previewRef,
}: {
  form: ShippingLabelForm;
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  const codAmount = Number(form.codAmount) || 0;
  const qrValue = JSON.stringify({
    trackingNumber: form.trackingNumber,
    orderCode: form.orderCode,
    receiver: form.receiverName,
    receiverPhone: form.receiverPhone,
  });

  return (
    <div
      ref={previewRef}
      style={{
        width: '100mm',
        minHeight: '148mm',
        background: '#ffffff',
        color: '#111827',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
        border: '1px solid #111827',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ borderBottom: '1px solid #111827', padding: '10px 12px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8 }}>ZORA EXPRESS</div>
            <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>{form.provider}</div>
          </div>
          <div style={{ minWidth: 132, flex: 1 }}>
            <TrackingBarcode value={form.trackingNumber || form.orderCode} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #111827' }}>
        <div style={{ padding: 10, borderRight: '1px solid #111827', display: 'grid', gap: 10 }}>
          <InfoRow icon={<Package2 size={12} />} label="Shop" value={form.senderShopName} />
          <InfoRow icon={<User size={12} />} label="Người gửi" value={form.senderName} />
          <InfoRow icon={<Phone size={12} />} label="SĐT gửi" value={form.senderPhone} />
          <InfoRow icon={<MapPin size={12} />} label="Địa chỉ lấy hàng" value={form.senderAddress} />
        </div>

        <div style={{ padding: 10, display: 'grid', gap: 10 }}>
          <InfoRow icon={<User size={12} />} label="Người nhận" value={form.receiverName} />
          <InfoRow icon={<Phone size={12} />} label="SĐT nhận" value={form.receiverPhone} />
          <InfoRow icon={<MapPin size={12} />} label="Địa chỉ giao" value={form.receiverAddress} />
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid #111827' }}>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.2 }}>Mã vận đơn</div>
        <div style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', lineHeight: 1.15, marginTop: 6 }}>
          {form.trackingNumber || 'Đang tạo mã'}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#4b5563', marginTop: 4 }}>
          Mã đơn: #{form.orderCode}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', minHeight: 168 }}>
        <div style={{ padding: '10px 12px', borderRight: '1px solid #111827', display: 'grid', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Hàng hoá</div>
            <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 4 }}>{form.itemSummary || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Ghi chú</div>
            <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 4 }}>{form.note || 'Không có ghi chú'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto' }}>
          <div style={{ borderBottom: '1px solid #111827', padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Thanh toán</div>
            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700 }}>{form.paymentMethod}</div>
          </div>

          <div style={{ borderBottom: '1px solid #111827', padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Thu hộ</div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800 }}>{formatPrice(codAmount)}</div>
          </div>

          <div style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QRCode
              value={qrValue}
              type="svg"
              bordered={false}
              size={104}
              color="#111827"
            />
          </div>

          <div style={{ borderTop: '1px solid #111827', padding: '8px 12px 10px', fontSize: 11 }}>
            <div><strong>Dự kiến giao:</strong> {form.deliveryDate || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShippingLabelModal({ order, onClose }: ShippingLabelModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const { data: addresses } = useAddresses();
  const { data: sellerApplication, isFetching: isFetchingSellerApplication } = useQuery({
    queryKey: ['seller-application', 'my'],
    queryFn: async () => {
      try {
        return await sellerApplicationService.getMyApplication();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const [hasEdited, setHasEdited] = useState(false);
  const [form, setForm] = useState<ShippingLabelForm>(() =>
    buildInitialForm(order, {
      authName: user?.fullName,
      authPhone: user?.phone,
    })
  );

  const defaultAddress = getDefaultAddress(addresses);

  useEffect(() => {
    setHasEdited(false);
  }, [order.id]);

  useEffect(() => {
    if (hasEdited) return;
    setForm(
      buildInitialForm(order, {
        authName: profile?.fullName || user?.fullName,
        authPhone: profile?.phone || user?.phone,
        sellerApplication,
        defaultAddress,
      })
    );
  }, [
    addresses,
    defaultAddress,
    hasEdited,
    order,
    profile?.fullName,
    profile?.phone,
    sellerApplication,
    user?.fullName,
    user?.phone,
  ]);

  const handleChange = (field: keyof ShippingLabelForm, value: string) => {
    setHasEdited(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePrint = () => {
    if (!previewRef.current) {
      toast.error('Không tìm thấy nội dung tem để in.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Trình duyệt đang chặn cửa sổ in.');
      return;
    }

    const title = escapeHtml(`Tem van don ${form.trackingNumber || form.orderCode}`);
    const bodyHtml = previewRef.current.outerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding: 16px;
            }
            @page {
              size: 100mm 150mm;
              margin: 4mm;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>${bodyHtml}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl lg:flex-row">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 lg:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">In vận đơn</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Tem giao hàng seller</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex w-full flex-col border-b border-slate-200 lg:w-[420px] lg:border-b-0 lg:border-r">
          <div className="hidden items-center justify-between border-b border-slate-200 px-6 py-5 lg:flex">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">In vận đơn</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Tem giao hàng seller</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kiểm tra nhanh thông tin rồi bấm in là ra tem ngay.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isFetchingSellerApplication
                ? 'Đang lấy thêm thông tin shop để tự điền tem...'
                : 'Bạn có thể sửa lại thông tin trước khi in nếu cần.'}
            </div>

            <div className="space-y-5">
              <section className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nguồn hàng</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">Thông tin người gửi</h3>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Đơn vị vận chuyển</span>
                    <input
                      value={form.provider}
                      onChange={(e) => handleChange('provider', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Tên shop</span>
                    <input
                      value={form.senderShopName}
                      onChange={(e) => handleChange('senderShopName', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Người gửi</span>
                      <input
                        value={form.senderName}
                        onChange={(e) => handleChange('senderName', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">SĐT gửi</span>
                      <input
                        value={form.senderPhone}
                        onChange={(e) => handleChange('senderPhone', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Địa chỉ lấy hàng</span>
                    <textarea
                      rows={3}
                      value={form.senderAddress}
                      onChange={(e) => handleChange('senderAddress', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Đích đến</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">Thông tin người nhận</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Người nhận</span>
                    <input
                      value={form.receiverName}
                      onChange={(e) => handleChange('receiverName', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">SĐT nhận</span>
                    <input
                      value={form.receiverPhone}
                      onChange={(e) => handleChange('receiverPhone', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Địa chỉ giao</span>
                  <textarea
                    rows={3}
                    value={form.receiverAddress}
                    onChange={(e) => handleChange('receiverAddress', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </section>

              <section className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vận đơn</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">Thông tin in trên tem</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Mã đơn</span>
                    <input
                      value={form.orderCode}
                      onChange={(e) => handleChange('orderCode', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Mã vận đơn</span>
                    <input
                      value={form.trackingNumber}
                      onChange={(e) => handleChange('trackingNumber', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Thanh toán</span>
                    <input
                      value={form.paymentMethod}
                      onChange={(e) => handleChange('paymentMethod', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Thu hộ (VND)</span>
                    <input
                      value={form.codAmount}
                      onChange={(e) => handleChange('codAmount', e.target.value.replace(/[^\d]/g, ''))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Thông tin hàng hoá</span>
                  <textarea
                    rows={3}
                    value={form.itemSummary}
                    onChange={(e) => handleChange('itemSummary', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Dự kiến giao</span>
                    <input
                      value={form.deliveryDate}
                      onChange={(e) => handleChange('deliveryDate', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Ghi chú</span>
                    <input
                      value={form.note}
                      onChange={(e) => handleChange('note', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>
                </div>
              </section>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                onClick={handlePrint}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                <Printer className="h-4 w-4" />
                In phiếu
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(135deg,#f8fafc_0%,#fef3e2_100%)]">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Preview</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Tem in theo mã vận đơn</h3>
            <p className="mt-1 text-sm text-slate-500">
              Phần này sẽ được in ra khi seller bấm nút `In phiếu`.
            </p>
          </div>

          <div className="flex-1 overflow-auto px-6 py-8">
            <div className="flex justify-center">
              <ShippingLabelPreview form={form} previewRef={previewRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
