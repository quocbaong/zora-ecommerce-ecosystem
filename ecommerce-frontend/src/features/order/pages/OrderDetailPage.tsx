import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Star,
  X,
  Package,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrderById, useCancelOrder, useConfirmDelivery, useRequestDispute, useChooseLogistics, useUpdatePaymentMethod } from '../hooks/useOrders';
import { Order, orderService } from '../services/orderService';
import { useCreateReview } from '@/features/product/hooks/useProducts';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import ReturnShippingLabelModal from '../components/ReturnShippingLabelModal';
import DisputeTimeline from '../components/DisputeTimeline';
import { Printer } from 'lucide-react';

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function calculateDeadline(dateStr: string, daysToAdd: number) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + daysToAdd);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `23:59 ngày ${dd}/${mm}/${yyyy}`;
}

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
    return <span className="font-medium">Đã quá hạn</span>;
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <span className="font-mono">
      {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
};

const STATUS_STEPS: {
  key: Order['status'];
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: 'PENDING',   label: 'Chờ xác nhận', icon: <Clock className="w-5 h-5" /> },
  { key: 'CONFIRMED', label: 'Đã xác nhận',   icon: <CheckCircle2 className="w-5 h-5" /> },
  { key: 'SHIPPING',  label: 'Đang giao',     icon: <Truck className="w-5 h-5" /> },
  { key: 'DELIVERED', label: 'Đã nhận hàng',  icon: <PackageCheck className="w-5 h-5" /> },
];

const STATUS_ORDER: Order['status'][] = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED'];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Chờ xác nhận', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  CONFIRMED: { label: 'Đã xác nhận',  className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SHIPPING:  { label: 'Đang giao',    className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  DELIVERED: { label: 'Đã giao',      className: 'bg-green-100 text-green-700 border-green-200' },
  CANCELLED: { label: 'Đã hủy',       className: 'bg-red-100 text-red-700 border-red-200' },
  DISPUTED:  { label: 'Đang khiếu nại', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  REFUNDED:  { label: 'Đã hoàn tiền', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const FALLBACK_BADGE = { label: 'Không xác định', className: 'bg-gray-100 text-gray-600 border-gray-200' };

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewSection({ order }: { order: Order }) {
  type ReviewState = { rating: number; comment: string; submitted: boolean };
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const { mutate: createReview, isPending } = useCreateReview();

  const items = order.items ?? [];
  if (!items.length) return null;

  const getReview = (productId: string): ReviewState =>
    reviews[productId] ?? { rating: 5, comment: '', submitted: false };

  const setField = (productId: string, field: keyof Omit<ReviewState, 'submitted'>, value: string | number) => {
    setReviews((prev) => {
      const current = prev[productId] ?? { rating: 5, comment: '', submitted: false };
      return { ...prev, [productId]: { ...current, [field]: value } };
    });
  };

  const handleSubmit = (productId: string, productName: string) => {
    const r = reviews[productId];
    if (!r?.rating) return;
    createReview(
      { productId, payload: { rating: r.rating, comment: r.comment } },
      {
        onSuccess: () => {
          setReviews((prev) => ({ ...prev, [productId]: { ...prev[productId], submitted: true } }));
          toast.success(`Đã đánh giá "${productName}"`);
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.reviewText ||
            error?.response?.data?.error ||
            'Gửi đánh giá thất bại, thử lại sau.';
          toast.error(message);
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Đánh giá sản phẩm</h2>
      <div className="space-y-5">
        {items.map((item) => {
          const r = getReview(item.productId);
          return (
            <div key={item.productId} className="flex gap-4 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                {item.productImage
                  ? <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate mb-2">{item.productName}</p>
                {r.submitted ? (
                  <p className="text-sm text-green-600 font-medium">✓ Đã đánh giá</p>
                ) : (
                  <>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setField(item.productId, 'rating', star)}>
                          <Star className={`w-5 h-5 transition-colors ${star <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={r.comment}
                      onChange={(e) => setField(item.productId, 'comment', e.target.value)}
                      placeholder="Nhận xét về sản phẩm..."
                      rows={2}
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 mb-2"
                    />
                    <button
                      onClick={() => handleSubmit(item.productId, item.productName)}
                      disabled={isPending}
                      className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Gửi đánh giá
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Return Logistics Section ─────────────────────────────────────────────────

function ReturnLogisticsModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [method, setMethod] = useState<'PICKUP' | 'DROP_OFF' | 'SELF_ARRANGE'>('PICKUP');
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const { mutate, isPending } = useChooseLogistics();

  const handleSubmit = () => {
    if (method === 'SELF_ARRANGE' && (!carrier || !trackingCode)) {
      toast.error('Vui lòng nhập hãng vận chuyển và mã vận đơn');
      return;
    }
    mutate({ id: orderId, payload: { shippingMethod: method, carrier: method === 'SELF_ARRANGE' ? carrier : 'ZORA Express', trackingCode: method === 'SELF_ARRANGE' ? trackingCode : '' } }, {
      onSuccess: () => {
        toast.success('Đã xác nhận phương thức trả hàng');
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Phương thức gửi trả hàng</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Yêu cầu trả hàng của bạn đã được Người bán chấp nhận. Vui lòng chọn phương thức gửi trả hàng trong vòng 6 ngày. Nếu quá hạn, khiếu nại sẽ bị hủy.
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-orange-500 transition-colors">
              <input type="radio" checked={method === 'PICKUP'} onChange={() => setMethod('PICKUP')} className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Bưu tá đến lấy (Pickup)</p>
                <p className="text-xs text-gray-500 mt-0.5">Miễn phí. ĐVVC sẽ liên hệ trước khi đến lấy hàng.</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-orange-500 transition-colors">
              <input type="radio" checked={method === 'DROP_OFF'} onChange={() => setMethod('DROP_OFF')} className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Gửi tại bưu cục (Drop-off)</p>
                <p className="text-xs text-gray-500 mt-0.5">Bạn tự mang hàng ra bưu cục gần nhất để gửi.</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-orange-500 transition-colors">
              <input type="radio" checked={method === 'SELF_ARRANGE'} onChange={() => setMethod('SELF_ARRANGE')} className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Tự sắp xếp (Kèm mã vận đơn)</p>
                <p className="text-xs text-gray-500 mt-0.5">Bạn tự thuê ĐVVC ngoài và cung cấp mã vận đơn.</p>
              </div>
            </label>
          </div>

          {method === 'SELF_ARRANGE' && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hãng vận chuyển</label>
                <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="VD: Viettel Post, GHTK..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition-colors bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mã vận đơn</label>
                <input value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="Nhập mã vận đơn..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono transition-colors bg-white" />
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-orange-200 disabled:opacity-50 mt-4"
          >
            {isPending ? 'Đang xử lý...' : 'Xác nhận giao hàng'}
          </button>
        </div>
      </div>
    </div>
  );
}

const DetailSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError } = useOrderById(id ?? '');
  const cancelOrderMutation = useCancelOrder();
  const confirmDeliveryMutation = useConfirmDelivery();
  const requestDisputeMutation = useRequestDispute();
  const updatePaymentMethodMutation = useUpdatePaymentMethod();
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeStep, setDisputeStep] = useState<1 | 2>(1);
  const [disputeSituation, setDisputeSituation] = useState('');
  const [disputeCategory, setDisputeCategory] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showReasonList, setShowReasonList] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const DISPUTE_SITUATIONS = [
    'Tôi đã nhận hàng & hàng có vấn đề (bể vỡ, sai mẫu, lỗi, khác mô tả...)',
    'Tôi chưa nhận hàng/nhận thiếu hàng',
  ];

  const handleRepay = async () => {
    if (!order) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payments/create?method=${order.paymentMethod}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: order.id, amount: order.totalPrice, currency: 'vnd' })
      });
      const data = await res.json();
      if (data.clientSecret) {
        window.location.href = data.clientSecret;
      } else {
        toast.error('Không thể tạo lại link thanh toán. Vui lòng thử phương thức khác.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối cổng thanh toán.');
    }
  };

  const DISPUTE_REASONS = [
    'Hàng lỗi, không hoạt động',
    'Hàng hết hạn sử dụng',
    'Khác với mô tả',
    'Hàng đã qua sử dụng',
    'Hàng giả, nhái',
    'Hàng nguyên vẹn nhưng không còn nhu cầu',
  ];

  const { isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const serverAddToCart = useAddToCart();

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const confirmCancelOrder = () => {
    if (!id || !order) return;
    cancelOrderMutation.mutate(id, {
      onSuccess: () => setShowCancelModal(false)
    });
  };

  const handleConfirmDelivery = () => {
    if (!id) return;
    confirmDeliveryMutation.mutate(id);
  };

  const handleDispute = () => {
    if (!id || !disputeSituation || !disputeCategory) {
      toast.error('Vui lòng chọn đầy đủ tình huống và lý do khiếu nại');
      return;
    }
    if (Object.keys(selectedItems).length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để trả hàng/hoàn tiền');
      return;
    }
    if (evidenceUrls.length === 0) {
      toast.error('Vui lòng cung cấp ít nhất 1 hình ảnh hoặc video làm bằng chứng');
      return;
    }
    const finalReason = `[${disputeSituation}] ${disputeCategory}${disputeReason.trim() ? ' - ' + disputeReason.trim() : ''}`;
    const finalType = disputeSituation === DISPUTE_SITUATIONS[1] ? 'REFUND_ONLY' : 'RETURN_AND_REFUND';
    const itemsPayload = Object.entries(selectedItems).map(([id, qty]) => ({ orderItemId: id, quantity: qty }));

    requestDisputeMutation.mutate({ 
      id, 
      type: finalType,
      reason: finalReason, 
      evidenceUrls,
      items: itemsPayload
    }, {
      onSuccess: () => {
        setShowDisputeModal(false);
        setDisputeStep(1);
        setDisputeSituation('');
        setDisputeCategory('');
        setDisputeReason('');
        setShowReasonList(false);
        setEvidenceUrls([]);
        setSelectedItems({});
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Filter files and check size
    const validFiles = Array.from(files).filter(file => {
      if (type === 'image') {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Ảnh ${file.name} vượt quá giới hạn 10MB`);
          return false;
        }
      } else {
        if (file.size > 30 * 1024 * 1024) {
          toast.error(`Video ${file.name} vượt quá giới hạn 30MB`);
          return false;
        }
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = validFiles.map(f => orderService.uploadEvidence(f));
      const urls = await Promise.all(uploadPromises);
      setEvidenceUrls(prev => [...prev, ...urls]);
      toast.success('Tải file lên thành công');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải file lên');
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRebuy = () => {
    if (!order?.items?.length) return;
    order.items.forEach((item) => {
      if (isAuthenticated) {
        serverAddToCart.mutate({
          productId: item.productId,
          name: item.productName,
          image: item.productImage ?? null,
          price: item.price,
          quantity: item.quantity,
          sellerId: item.sellerId || null,
        });
      } else {
        addItem({
          productId: item.productId,
          name: item.productName,
          image: item.productImage ?? '',
          price: item.price,
          quantity: item.quantity,
          sellerId: item.sellerId || undefined,
        });
      }
    });
    toast.success('Đã thêm sản phẩm vào giỏ hàng!');
    navigate('/cart');
  };

  const isCancelled = order?.status === 'CANCELLED';
  const currentStepIndex = order
    ? isCancelled
      ? -1
      : STATUS_ORDER.indexOf(order.status)
    : -1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="h-8 bg-gray-200 rounded w-40 mb-8 animate-pulse" />
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Không tìm thấy đơn hàng</h2>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 text-orange-500 font-medium hover:underline"
          >
            Quay lại danh sách đơn hàng
          </button>
        </div>
      </div>
    );
  }

  const isUnpaidOnline = order.paymentStatus === 'PENDING' && order.paymentMethod !== 'COD';
  const isOverdueCancelled = order.status === 'CANCELLED' && isUnpaidOnline;
  const isPendingUnpaid = order.status === 'PENDING' && isUnpaidOnline;
  
  const paymentDeadline = order ? getPaymentDeadline(order.createdAt, order.paymentMethod) : null;
  const isOverdue = paymentDeadline ? paymentDeadline.getTime() < Date.now() : false;

  let badge = STATUS_BADGE[order.status] ?? FALLBACK_BADGE;
  if (isOverdueCancelled) {
    badge = { label: 'Đã quá hạn', className: 'bg-red-100 text-red-700 border-red-200' };
  } else if (isPendingUnpaid) {
    badge = { label: 'Chờ thanh toán', className: 'bg-red-100 text-red-700 border-red-200' };
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Back nav */}
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
          aria-label="Quay lại danh sách đơn hàng"
        >
          <ChevronLeft className="w-4 h-4" />
          Đơn hàng của tôi
        </button>

        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">#{order.id}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {isPendingUnpaid && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Vui lòng hoàn tất thanh toán trước <PaymentCountdownTimer deadline={getPaymentDeadline(order.createdAt, order.paymentMethod)!} />
                </p>
                <p className="text-xs text-red-600 mt-1">Quá hạn, đơn hàng sẽ bị tự động hủy.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={isOverdue}
                className="whitespace-nowrap px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCcw className="w-4 h-4" />
                Đổi phương thức
              </button>
              <button
                onClick={handleRepay}
                disabled={isOverdue}
                className="whitespace-nowrap px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Thanh toán ngay
              </button>
            </div>
          </div>
        )}

        {isOverdueCancelled && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Đơn hàng đã quá hạn thanh toán
                </p>
                <p className="text-xs text-red-600 mt-1">Hệ thống đã tự động khóa đơn hàng này.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Status Timeline */}
          {(!isCancelled && order.status !== 'DISPUTED' && order.status !== 'REFUNDED') ? (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-6">Trạng thái đơn hàng</h2>
              <div className="relative flex justify-between">
                {/* Progress line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                <div
                  className="absolute top-5 left-0 h-0.5 bg-orange-400 z-0 transition-all duration-500"
                  style={{
                    width: currentStepIndex >= 0
                      ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`
                      : '0%',
                  }}
                />

                {STATUS_STEPS.map((step, idx) => {
                  const done = idx <= currentStepIndex;
                  const active = idx === currentStepIndex;
                  return (
                    <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          done
                            ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                            : 'bg-white border-gray-300 text-gray-400'
                        } ${active ? 'ring-4 ring-orange-100' : ''}`}
                      >
                        {step.icon}
                      </div>
                      <span className={`text-xs font-medium text-center leading-tight ${done ? 'text-orange-600' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : order.status === 'DISPUTED' ? (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-orange-500 shrink-0" />
                <div>
                  <p className="font-semibold text-orange-700">
                    {order.refundRequest?.status === 'WAITING_FOR_RETURN' 
                      ? 'Đang chờ bạn gửi trả hàng' 
                      : order.refundRequest?.status === 'RETURN_SHIPPING'
                      ? 'Đang vận chuyển trả hàng'
                      : 'Đơn hàng đang chờ xử lý khiếu nại'}
                  </p>
                  <p className="text-sm text-orange-500 mt-0.5">
                    Lý do: {order.refundRequest?.reason || 'Chưa rõ'}
                  </p>
                </div>
              </div>

              {order.refundRequest?.status && (
                <div className="bg-white rounded-xl p-2 pb-4">
                  <DisputeTimeline status={order.refundRequest.status} type={order.refundRequest.type} />
                  
                  {order.refundRequest.status === 'WAITING_FOR_RETURN' && order.refundRequest.updatedAt && (
                    <div className="mt-3 mx-2 px-4 py-2.5 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                      <p className="text-sm text-orange-800 font-medium">
                        Bạn có thời hạn đến <span className="font-bold">{calculateDeadline(order.refundRequest.updatedAt, 6)}</span> để gửi hàng cho bưu tá. Quá hạn, khiếu nại sẽ bị tự động hủy.
                      </p>
                    </div>
                  )}

                  {order.refundRequest.status === 'RETURN_RECEIVED' && order.refundRequest.updatedAt && (
                    <div className="mt-3 mx-2 px-4 py-2.5 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                      <p className="text-sm text-orange-800 font-medium">
                        Người bán có thời hạn đến <span className="font-bold">{calculateDeadline(order.refundRequest.updatedAt, 2)}</span> để phản hồi. Quá hạn, hệ thống sẽ tự động hoàn tiền cho bạn.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {order.refundRequest?.status === 'WAITING_FOR_RETURN' && (
                <button
                  onClick={() => setShowLogisticsModal(true)}
                  className="mt-2 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-orange-200"
                >
                  Chọn phương thức trả hàng
                </button>
              )}
              {order.refundRequest?.returnShipment && (
                <div className="mt-2 bg-white rounded-xl border border-orange-100 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-orange-800 font-semibold">Thông tin gửi trả hàng</h4>
                    <button 
                      onClick={() => setShowPrintModal(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> In phiếu
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-gray-600">Đơn vị vận chuyển: <span className="font-semibold text-gray-900">{order.refundRequest.returnShipment.carrier}</span></p>
                    <p className="text-sm text-gray-600">Mã vận đơn: <span className="font-mono font-bold text-gray-900">{order.refundRequest.returnShipment.trackingCode}</span></p>
                    <p className="text-sm text-gray-600">Trạng thái: <span className="font-semibold text-gray-900">{order.refundRequest.returnShipment.status === 'PENDING' ? 'Đang giao hàng' : order.refundRequest.returnShipment.status}</span></p>
                  </div>
                </div>
              )}
            </div>
          ) : order.status === 'REFUNDED' ? (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-purple-500 shrink-0" />
              <div>
                <p className="font-semibold text-purple-700">Đơn hàng đã được hoàn tiền</p>
                <p className="text-sm text-purple-500 mt-0.5">Tiền đã được chuyển về thẻ / ví của bạn.</p>
              </div>
            </div>
          ) : !isOverdueCancelled ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-red-700">Đơn hàng đã bị hủy</p>
                <p className="text-sm text-red-500 mt-0.5">Đơn hàng này không thể khôi phục</p>
              </div>
            </div>
          ) : null}

          {/* Order Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mã đơn hàng</span>
                <span className="font-mono text-gray-800 text-xs">{order.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ngày đặt</span>
                <span className="text-gray-800">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Trạng thái</span>
                <span className={`font-semibold ${badge.className.includes('green') ? 'text-green-700' : badge.className.includes('red') ? 'text-red-700' : 'text-orange-600'}`}>
                  {badge.label}
                </span>
              </div>
              {(order as any).paymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phương thức thanh toán</span>
                  <span className="text-gray-800 font-medium">
                    {(order as any).paymentMethod === 'COD' ? '💵 Thanh toán khi nhận hàng' : '💳 Thanh toán trực tuyến'}
                  </span>
                </div>
              )}
              {(order as any).paymentStatus && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Trạng thái thanh toán</span>
                  <span className={`font-semibold ${
                    (order as any).paymentStatus === 'PAID' ? 'text-green-600' :
                    (order as any).paymentStatus === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {(order as any).paymentStatus === 'PAID' ? '✅ Đã thanh toán' :
                     (order as any).paymentStatus === 'FAILED' ? '❌ Thanh toán thất bại' : '⏳ Chờ thanh toán'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Info */}
          {(order as any).trackingNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm p-6 space-y-3">
              <h2 className="font-semibold text-blue-900 mb-2">Thông tin giao hàng</h2>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Mã vận đơn</span>
                <span className="font-mono font-semibold text-blue-900">{(order as any).trackingNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Đơn vị vận chuyển</span>
                <span className="font-medium text-blue-900">{(order as any).shippingProvider}</span>
              </div>
              {(order as any).estimatedDeliveryDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Dự kiến giao</span>
                  <span className="text-blue-900">{(order as any).estimatedDeliveryDate}</span>
                </div>
              )}
              {(order as any).deliveredAt && (
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-blue-200">
                  <span className="text-blue-700 font-semibold">Giao thành công lúc</span>
                  <span className="font-semibold text-green-700">{formatDate((order as any).deliveredAt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Price Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Tóm tắt thanh toán</h2>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatPrice(order.totalPrice)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span className="text-green-600 font-medium">Miễn phí</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg text-gray-900">
              <span>Tổng cộng</span>
              <span className="text-orange-500">{formatPrice(order.totalPrice)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {order.status !== 'DELIVERED' && (
              <button
                onClick={() => navigate('/products')}
                className="flex-1 py-3 rounded-xl border-2 border-orange-500 text-orange-500 font-semibold hover:bg-orange-50 transition-colors"
                aria-label="Tiếp tục mua sắm"
              >
                Tiếp tục mua sắm
              </button>
            )}
            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelOrderMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-colors disabled:opacity-50"
                aria-label="Hủy đơn hàng"
              >
                {cancelOrderMutation.isPending ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            )}
            {order.status === 'SHIPPING' && (
              <button
                onClick={handleConfirmDelivery}
                disabled={confirmDeliveryMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors shadow-md shadow-orange-200 disabled:opacity-50"
                aria-label="Đã nhận được hàng"
              >
                {confirmDeliveryMutation.isPending ? 'Đang xử lý...' : 'Đã nhận được hàng'}
              </button>
            )}
            {order.status === 'DELIVERED' && (
              <>
                <button
                  onClick={() => setShowDisputeModal(true)}
                  disabled={!!order.refundRequest || (new Date().getTime() - new Date(order.deliveredAt || order.createdAt).getTime() > 15 * 24 * 60 * 60 * 1000)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors flex flex-col items-center justify-center ${!!order.refundRequest || (new Date().getTime() - new Date(order.deliveredAt || order.createdAt).getTime() > 15 * 24 * 60 * 60 * 1000) ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-red-500 text-red-500 hover:bg-red-50'}`}
                  aria-label={!!order.refundRequest ? "Đã yêu cầu hoàn tiền" : "Trả hàng/Hoàn tiền"}
                >
                  <span>{!!order.refundRequest ? 'Đã yêu cầu hoàn tiền' : (new Date().getTime() - new Date(order.deliveredAt || order.createdAt).getTime() > 15 * 24 * 60 * 60 * 1000) ? 'Đã hết hạn khiếu nại' : 'Trả hàng / Hoàn tiền'}</span>
                  {!order.refundRequest && !(new Date().getTime() - new Date(order.deliveredAt || order.createdAt).getTime() > 15 * 24 * 60 * 60 * 1000) && (
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">Hạn chót: {calculateDeadline(order.deliveredAt || order.createdAt, 15)}</span>
                  )}
                </button>
                <button
                  onClick={handleRebuy}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors shadow-md shadow-orange-200"
                  aria-label="Mua lại đơn hàng này"
                >
                  Mua lại
                </button>
              </>
            )}
          </div>

          {/* Review section — only for DELIVERED orders */}
          {order.status === 'DELIVERED' && <ReviewSection order={order} />}
        </div>
      </div>

      {showPrintModal && (
        <ReturnShippingLabelModal order={order} onClose={() => setShowPrintModal(false)} />
      )}

      {showLogisticsModal && (
        <ReturnLogisticsModal orderId={order.id} onClose={() => setShowLogisticsModal(false)} />
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-2">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center">Xác nhận hủy đơn</h2>
            <div className="text-gray-600 text-center whitespace-pre-line text-sm leading-relaxed">
              {order.paymentStatus === 'PAID' 
                ? "Đơn hàng này đã được thanh toán.\nViệc hủy đơn sẽ tự động kích hoạt hoàn tiền.\n\nSố tiền sẽ được hoàn trả vào Thẻ/Ví của bạn\ntrong vòng vài phút đến 1-3 ngày làm việc.\n\nBạn có chắc chắn muốn hủy?" 
                : "Bạn có chắc chắn muốn hủy đơn hàng này không?\nHành động này không thể hoàn tác."}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                disabled={cancelOrderMutation.isPending}
              >
                Không, quay lại
              </button>
              <button
                onClick={confirmCancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-md shadow-red-200 flex items-center justify-center"
                disabled={cancelOrderMutation.isPending}
              >
                {cancelOrderMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : 'Đồng ý hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-step Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-50 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Step 1: Choose Situation */}
            {disputeStep === 1 && (
              <>
                <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 shrink-0">
                  <div className="w-10"></div>
                  <h3 className="text-lg font-bold text-gray-900 text-center flex-1">Chọn tình huống đang gặp</h3>
                  <button onClick={() => { setShowDisputeModal(false); setDisputeStep(1); setDisputeSituation(''); setDisputeCategory(''); }} className="w-10 p-2 flex justify-end text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                  {DISPUTE_SITUATIONS.map((sit, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDisputeSituation(sit);
                        setDisputeStep(2);
                      }}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-orange-500">
                          {idx === 0 ? <Package className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div className="text-sm font-medium text-gray-800 leading-relaxed pr-4">
                          {sit}
                        </div>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Refund Form */}
            {disputeStep === 2 && (
              <>
                <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 shrink-0">
                  <button onClick={() => setDisputeStep(1)} className="w-10 p-2 flex justify-start text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h3 className="text-lg font-bold text-gray-900 text-center flex-1">Yêu cầu Trả hàng/Hoàn tiền</h3>
                  <button onClick={() => { setShowDisputeModal(false); setDisputeStep(1); setDisputeSituation(''); setDisputeCategory(''); }} className="w-10 p-2 flex justify-end text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Product Info */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                    <p className="text-sm font-semibold text-gray-900">Chọn sản phẩm trả lại <span className="text-red-500">*</span></p>
                    <div className="space-y-3">
                      {order.items?.map((item) => {
                        const isSelected = !!selectedItems[item.id];
                        return (
                          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100 hover:border-gray-200'}`} onClick={() => {
                            if (isSelected) {
                              const newSel = { ...selectedItems };
                              delete newSel[item.id];
                              setSelectedItems(newSel);
                            } else {
                              setSelectedItems({ ...selectedItems, [item.id]: item.quantity });
                            }
                          }}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div className="w-12 h-12 shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
                              {item.productImage ? (
                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{formatPrice(item.price)} x {item.quantity}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                      <span className="text-sm font-medium text-gray-600">Phương án</span>
                      <span className="text-sm font-semibold text-gray-900">Trả hàng và Hoàn tiền</span>
                    </div>

                    <div className="border-b border-gray-50 pb-3 relative">
                      <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowReasonList(!showReasonList)}>
                        <span className="text-sm font-semibold text-gray-900">Lý do <span className="text-red-500">*</span></span>
                        <div className="flex items-center text-gray-400">
                          <span className={`text-sm mr-2 max-w-[200px] truncate ${disputeCategory ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                            {disputeCategory || 'Chọn lý do'}
                          </span>
                          <ChevronLeft className={`w-4 h-4 transition-transform ${showReasonList ? 'rotate-90' : 'rotate-180'}`} />
                        </div>
                      </div>
                      
                      {showReasonList && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-xl z-10 overflow-hidden max-h-60 overflow-y-auto">
                          {DISPUTE_REASONS.map((r, i) => (
                            <label key={i} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-orange-50/50 transition-colors">
                              <span className="text-sm font-medium text-gray-700">{r}</span>
                              <input
                                type="radio"
                                name="reason_select_inline"
                                checked={disputeCategory === r}
                                onChange={() => {
                                  setDisputeCategory(r);
                                  setShowReasonList(false);
                                }}
                                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Số tiền hoàn lại</span>
                      <span className="text-lg font-bold text-orange-500">{formatPrice(order.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                      <span className="text-sm font-medium text-gray-600">Hoàn tiền vào</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {order.paymentMethod?.toUpperCase() === 'STRIPE' ? 'Thẻ tín dụng (Stripe)' : 
                         order.paymentMethod?.toUpperCase() === 'MOMO' ? 'Ví điện tử MoMo' : 
                         'Số dư TK ZORA'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-gray-900">Mô tả chi tiết</label>
                        <span className="text-xs text-gray-400">{disputeReason.length}/2000</span>
                      </div>
                      <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value.slice(0, 2000))}
                        placeholder="Ghi chú thêm (không bắt buộc)..."
                        className="w-full h-24 p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none outline-none"
                      />
                    </div>
                    
                    <div className="flex gap-3 pt-2 flex-wrap">
                      {evidenceUrls.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          {url.includes('.mp4') || url.includes('.mov') ? (
                            <video src={url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={url} alt="evidence" className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={() => removeEvidence(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      {isUploading && (
                        <div className="flex items-center justify-center w-20 h-20 border border-gray-200 rounded-lg bg-gray-50">
                          <span className="text-xs text-gray-500 animate-pulse">Đang tải...</span>
                        </div>
                      )}

                      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'image')} />
                      <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} />

                      {evidenceUrls.filter(u => !u.includes('.mp4') && !u.includes('.mov')).length < 6 && (
                        <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
                          <div className="text-xl mb-1">📷</div>
                          <span className="text-[9px] text-center px-1 font-medium leading-tight">Thêm Hình ảnh<br/>{evidenceUrls.filter(u => !u.includes('.mp4') && !u.includes('.mov')).length}/6</span>
                        </button>
                      )}
                      
                      {!evidenceUrls.some(u => u.includes('.mp4') || u.includes('.mov')) && (
                        <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
                          <div className="text-xl mb-1">🎥</div>
                          <span className="text-[9px] text-center px-1 font-medium leading-tight">Thêm Video<br/>0/1</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Hãy đăng tải hình ảnh (dưới 10MB/ảnh), video (dưới 30MB/video) thấy rõ tình trạng sản phẩm nhận được. Bắt buộc cung cấp ít nhất 1 bằng chứng.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                  <button
                    onClick={handleDispute}
                    disabled={!disputeCategory || requestDisputeMutation.isPending}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md shadow-orange-200"
                  >
                    {requestDisputeMutation.isPending ? 'Đang xử lý...' : 'Gửi yêu cầu'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Đổi phương thức thanh toán</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {[
                { id: 'COD', label: 'Thanh toán khi nhận hàng (COD)', desc: 'Thanh toán bằng tiền mặt khi nhận hàng' },
                { id: 'MOMO', label: 'Ví MoMo', desc: 'Thanh toán qua ứng dụng MoMo' },
                { id: 'PAYOS', label: 'Chuyển khoản ngân hàng (PayOS)', desc: 'Quét mã QR qua ứng dụng ngân hàng' },
                { id: 'STRIPE', label: 'Thẻ Tín dụng / Ghi nợ (Stripe)', desc: 'Thanh toán bằng thẻ Visa/Mastercard' },
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => {
                    updatePaymentMethodMutation.mutate({ id: order.id, method: method.id }, {
                      onSuccess: () => {
                        setShowPaymentModal(false);
                      }
                    });
                  }}
                  disabled={order.paymentMethod === method.id || updatePaymentMethodMutation.isPending}
                  className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between ${
                    order.paymentMethod === method.id 
                      ? 'bg-orange-50 border-orange-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{method.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{method.desc}</p>
                  </div>
                  {order.paymentMethod === method.id && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Hiện tại</span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
