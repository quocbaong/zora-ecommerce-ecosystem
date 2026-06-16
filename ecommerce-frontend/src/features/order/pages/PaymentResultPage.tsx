import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ShoppingBag, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const resultCode = searchParams.get('resultCode');
  const orderIdParam = searchParams.get('orderId');
  const message = searchParams.get('message');
  const amount = searchParams.get('amount');
  const method = searchParams.get('method');
  const status = searchParams.get('status');
  const cancel = searchParams.get('cancel');

  // MoMo orderId will be something like "ORDER_ID_timestamp"
  const actualOrderId = orderIdParam ? orderIdParam.split('_')[0] : '';
  const isSuccess = method === 'payos' 
    ? (status === 'success' || status === 'PAID' || status === 'APPROVED' || cancel === 'false') 
    : resultCode === '0';

  useEffect(() => {
    if (isSuccess && orderIdParam) {
      const token = localStorage.getItem('access_token');
      const confirmUrl = method === 'payos' 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/payments/payos-confirm`
        : `${import.meta.env.VITE_API_BASE_URL}/api/payments/momo-confirm`;

      fetch(confirmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: orderIdParam })
      })
      .then(res => {
        if (!res.ok) throw new Error('Xác nhận thanh toán thất bại');
        console.log('Order status updated successfully via confirmation fallback');
      })
      .catch(err => {
        console.error('Lỗi xác nhận thanh toán:', err);
      });
    }

    const timer = setTimeout(() => {
      setLoading(false);
      if (isSuccess) {
        toast.success('Thanh toán đơn hàng thành công!');
      } else {
        toast.error('Thanh toán không thành công hoặc đã bị hủy.');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, orderIdParam, method]);

  function formatPrice(priceStr: string | null) {
    if (!priceStr) return '0 ₫';
    const price = parseInt(priceStr, 10);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium animate-pulse">Đang xác thực kết quả thanh toán...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-gray-100 to-zinc-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
        <div className="p-8 text-center">
          {isSuccess ? (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isSuccess
              ? 'Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đã được thanh toán và đang được xử lý.'
              : message || 'Giao dịch thanh toán đã bị hủy hoặc có lỗi xảy ra.'}
          </p>

          {/* Info Card */}
          <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Mã đơn hàng:</span>
              <span className="font-semibold text-gray-800 break-all">{actualOrderId || 'Không xác định'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Phương thức:</span>
              {method === 'payos' ? (
                <span className="font-medium text-gray-800 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-bold">Chuyển khoản VietQR (PayOS)</span>
              ) : (
                <span className="font-medium text-gray-800 bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg text-xs font-bold">Ví MoMo</span>
              )}
            </div>
            {amount && (
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-500 font-medium">Tổng tiền thanh toán:</span>
                <span className="text-lg font-bold text-orange-600">{formatPrice(amount)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            {isSuccess ? (
              <>
                <button
                  onClick={() => navigate(`/orders/${actualOrderId}`)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <FileText className="w-5 h-5" />
                  Xem chi tiết đơn hàng
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Tiếp tục mua sắm
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Thử thanh toán lại
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200"
                >
                  Quay về trang chủ
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
