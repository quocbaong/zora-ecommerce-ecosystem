import { useRef } from 'react';
import { QRCode } from 'antd';
import { MapPin, Package2, Phone, Printer, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/features/order/services/orderService';
import { useAuthStore } from '@/stores/authStore';
import { useShop } from '@/features/shop/hooks/useShop';

interface ReturnShippingLabelModalProps {
  order: Order;
  onClose: () => void;
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
    >
      {pattern.map((width, index) => {
        const x = offset;
        offset += width;
        if (index % 2 !== 0) return null;
        return <rect key={`${value}-${index}`} x={x} y={0} width={width} height={barHeight} fill="#111827" />;
      })}
      <text x={totalWidth / 2} y={barHeight + 14} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#111827">
        {value}
      </text>
    </svg>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

export default function ReturnShippingLabelModal({ order, onClose }: ReturnShippingLabelModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const returnShipment = order.refundRequest?.returnShipment;
  const refundItems = order.refundRequest?.items || [];
  
  const sellerId = order.items?.[0]?.sellerId;
  const { data: shop } = useShop(sellerId || undefined);

  const trackingNumber = returnShipment?.trackingCode || 'CHƯA CÓ MÃ';
  const provider = returnShipment?.carrier || 'ZORA Express';
  
  const senderName = user?.fullName || order.shippingAddress?.fullName || 'Người Mua';
  const senderPhone = user?.phone || order.shippingAddress?.phoneNumber || '';
  const senderAddress = order.shippingAddress?.fullAddress || [order.shippingAddress?.street, order.shippingAddress?.ward, order.shippingAddress?.district, order.shippingAddress?.province].filter(Boolean).join(', ');

  const receiverName = shop?.shopName ? `Shop ${shop.shopName}` : 'Người Bán (Hoàn hàng)';
  const receiverPhone = 'Bảo mật bởi ZORA';
  const receiverAddress = 'Giao lại cho bưu tá ZORA (Địa chỉ bảo mật)';

  const itemSummary = order.items?.filter(i => refundItems.some(ri => ri.orderItemId === i.id)).map(i => `${i.productName} x${refundItems.find(ri => ri.orderItemId === i.id)?.quantity}`).join(', ') || 'Hàng hoàn trả';
  const orderCode = order.id.slice(0, 8).toUpperCase();

  const handlePrint = () => {
    if (!previewRef.current) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Trình duyệt đang chặn cửa sổ in.');
      return;
    }
    const title = escapeHtml(`Tem tra hang ${trackingNumber}`);
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
            html, body { margin: 0; padding: 0; background: #ffffff; }
            body { display: flex; justify-content: center; align-items: flex-start; padding: 16px; }
            @page { size: 100mm 150mm; margin: 4mm; }
            @media print { body { padding: 0; } }
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

  const qrValue = JSON.stringify({ trackingNumber, orderCode, type: 'RETURN' });

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/55 px-4 py-6 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] max-w-lg w-full">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">In phiếu giao hàng hoàn</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 bg-slate-50 flex justify-center items-center flex-1">
          <div
            ref={previewRef}
            style={{ width: '100mm', minHeight: '148mm', background: '#ffffff', color: '#111827', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
          >
            <div style={{ borderBottom: '1px solid #111827', padding: '10px 12px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8 }}>TRẢ HÀNG ZORA</div>
                  <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>{provider}</div>
                </div>
                <div style={{ minWidth: 132, flex: 1 }}>
                  <TrackingBarcode value={trackingNumber} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #111827' }}>
              <div style={{ padding: 10, borderRight: '1px solid #111827', display: 'grid', gap: 10 }}>
                <InfoRow icon={<User size={12} />} label="Người gửi (Buyer)" value={senderName} />
                <InfoRow icon={<Phone size={12} />} label="SĐT gửi" value={senderPhone} />
                <InfoRow icon={<MapPin size={12} />} label="Địa chỉ lấy hàng" value={senderAddress} />
              </div>
              <div style={{ padding: 10, display: 'grid', gap: 10 }}>
                <InfoRow icon={<Package2 size={12} />} label="Người nhận (Seller)" value={receiverName} />
                <InfoRow icon={<Phone size={12} />} label="SĐT nhận" value={receiverPhone} />
                <InfoRow icon={<MapPin size={12} />} label="Địa chỉ hoàn" value={receiverAddress} />
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderBottom: '1px solid #111827' }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.2 }}>Mã vận đơn hoàn</div>
              <div style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', lineHeight: 1.15, marginTop: 6 }}>
                {trackingNumber}
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#4b5563', marginTop: 4 }}>Mã đơn gốc: #{orderCode}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', minHeight: 168 }}>
              <div style={{ padding: '10px 12px', borderRight: '1px solid #111827', display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Hàng hoá trả lại</div>
                  <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 4 }}>{itemSummary}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto' }}>
                <div style={{ borderBottom: '1px solid #111827', padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Thu hộ</div>
                  <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800 }}>0 ₫</div>
                </div>
                <div style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QRCode value={qrValue} type="svg" bordered={false} size={104} color="#111827" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Đóng</button>
          <button onClick={handlePrint} className="flex-1 py-3 font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Printer className="w-5 h-5" /> In phiếu trả hàng
          </button>
        </div>
      </div>
    </div>
  );
}
