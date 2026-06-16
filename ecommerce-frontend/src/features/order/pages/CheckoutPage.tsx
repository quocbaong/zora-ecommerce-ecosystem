import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, ShoppingBag, CreditCard, Truck, CheckCircle2, ChevronRight, AlertCircle, Ticket, X, Plus, Check } from 'lucide-react';
import { useShopVouchers, useSaveVoucher } from '@/features/shop/hooks/useShop';
import type { Voucher } from '@/features/shop/types';
import { useCartStore, CartItem as LocalCartItem } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useCart } from '@/features/cart/hooks/useCart';
import { CartItemResponse } from '@/features/cart/services/cartService';
import { useCreateOrder } from '@/features/order/hooks/useOrders';
import { useAddresses, useAddAddress, useBankAccounts, useCreditCards } from '@/features/user/hooks/useUser';
import { Address, AddressPayload } from '@/features/user/services/userService';
import { paymentService } from '@/features/order/services/paymentService';
import LocationSelector from '@/features/user/components/LocationSelector';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm, { StripePaymentFormRef } from '@/features/order/components/StripePaymentForm';
import momoLogo from '@/assets/momo-logo.jpg';
import payosLogo from '@/assets/payos-logo.png';
import { cartService } from '@/features/cart/services/cartService';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useShippingFee } from '@/features/order/hooks/useShippingFee';
import { shopService } from '@/features/shop/services/shopService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

type PaymentMethod = 'COD' | 'ONLINE' | string;

const EMPTY_ADDRESS: AddressPayload = {
  receiverName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  street: '',
  default: false,
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const { items: localItems, totalPrice: localTotalPrice } = useCartStore();
  const { data: serverCart } = useCart();
  const createOrder = useCreateOrder();
  const qc = useQueryClient();

  const clearCheckedOutItems = async () => {
    if (isAuthenticated) {
      await Promise.all(cartItems.map(item => {
        if ('id' in item) {
          return cartService.removeItem((item as CartItemResponse).id).catch(console.error);
        }
        return Promise.resolve();
      }));
      qc.invalidateQueries({ queryKey: ['cart'] });
    } else {
      cartItems.forEach(item => {
        if ('productId' in item) {
          useCartStore.getState().removeItem((item as LocalCartItem).id);
        }
      });
    }
  };

  type PaymentCategory = 'COD' | 'ONLINE' | 'BANK' | 'CARD' | 'MOMO' | 'PAYOS';
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('COD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  const handleCategoryClick = (cat: PaymentCategory) => {
    setPaymentCategory(cat);
    if (cat === 'COD') setPaymentMethod('COD');
    else if (cat === 'ONLINE') {
      if (creditCards.length > 0) setPaymentMethod(`CARD_${creditCards[0].id}`);
      else setPaymentMethod('ONLINE');
    }
    else if (cat === 'MOMO') setPaymentMethod('MOMO');
    else if (cat === 'PAYOS') setPaymentMethod('PAYOS');
    else if (cat === 'BANK') {
      if (bankAccounts.length > 0) setPaymentMethod(`BANK_${bankAccounts[0].id}`);
      else setPaymentMethod('');
    }
  };
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const stripeFormRef = useRef<StripePaymentFormRef>(null);
  const [voucherPickerForShop, setVoucherPickerForShop] = useState<string | null>(null);
  const [vouchersByShop, setVouchersByShop] = useState<Record<string, Voucher | null>>({});
  const [shopNameCache, setShopNameCache] = useState<Record<string, string>>({});

  const { data: shopVouchers = [], isLoading: isVouchersLoading } = useShopVouchers(voucherPickerForShop ?? undefined);
  const saveVoucher = useSaveVoucher(voucherPickerForShop ?? undefined);
  const { data: addresses = [], isLoading: addressesLoading } = useAddresses();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();
  const addAddress = useAddAddress();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressPayload>(EMPTY_ADDRESS);

  // Auto-chọn địa chỉ mặc định (hoặc đầu tiên) khi danh sách load xong
  useEffect(() => {
    if (!addresses || addresses.length === 0) {
      setSelectedAddressId(null);
      return;
    }
    if (selectedAddressId && addresses.some((a) => a.id === selectedAddressId)) return;
    const defaultAddr = addresses.find((a) => a.default) ?? addresses[0];
    setSelectedAddressId(defaultAddr.id);
  }, [addresses, selectedAddressId]);

  const selectedAddress: Address | undefined = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId),
    [addresses, selectedAddressId]
  );

  const stateItems: (CartItemResponse | LocalCartItem)[] | undefined = location.state?.selectedItems;
  const cartItems: (CartItemResponse | LocalCartItem)[] = stateItems?.length
    ? stateItems
    : (isAuthenticated && serverCart?.data?.items?.length ? serverCart.data.items : localItems);
  const total = stateItems?.length
    ? stateItems.reduce((s, i) => s + i.price * i.quantity, 0)
    : (isAuthenticated && serverCart?.data ? serverCart.data.totalPrice : localTotalPrice());

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.receiverName || !newAddress.phone || !newAddress.province
        || !newAddress.district || !newAddress.ward || !newAddress.street) {
      toast.error('Vui lòng điền đủ thông tin địa chỉ');
      return;
    }
    try {
      const saved = await addAddress.mutateAsync({
        ...newAddress,
        default: addresses.length === 0 ? true : !!newAddress.default,
      });
      setSelectedAddressId(saved.id);
      setShowAddAddressModal(false);
      setNewAddress(EMPTY_ADDRESS);
    } catch {
      // toast đã được handle trong useAddAddress onError
    }
  };

  // Helper tính discount cho 1 shop dựa trên voucher
  const computeShopDiscount = (subtotal: number, voucher: Voucher | null) => {
    if (!voucher || subtotal === 0) return 0;
    if (subtotal < (voucher.minOrderAmount || 0)) return 0;
    let d = 0;
    if (voucher.discountType === 'PERCENT') {
      d = (subtotal * voucher.discountValue) / 100;
      if (voucher.maxDiscount && d > voucher.maxDiscount) d = voucher.maxDiscount;
    } else {
      d = voucher.discountValue;
    }
    return Math.min(d, subtotal);
  };

  // Tính phí vận chuyển qua GHN (per seller)
  const feeItems = useMemo(() => cartItems.map((it: any) => ({
    productId: it.productId ?? it.id,
    quantity: it.quantity,
    price: it.price,
    sellerId: it.sellerId ?? null,
    weightG: it.weightG,
    lengthCm: it.lengthCm,
    widthCm: it.widthCm,
    heightCm: it.heightCm,
  })), [cartItems]);

  const { data: shippingFeeData, isLoading: feeLoading } = useShippingFee({
    items: feeItems,
    toGhnDistrictId: selectedAddress?.ghnDistrictId,
    toGhnWardCode: selectedAddress?.ghnWardCode,
  });

  const shippingFee = shippingFeeData?.totalFee ?? 0;
  const shippingError = shippingFeeData?.hasError;

  // Group items theo sellerId thành các shop block
  const shopGroups = useMemo(() => {
    const map = new Map<string, (CartItemResponse | LocalCartItem)[]>();
    cartItems.forEach((it: any) => {
      const sid: string = it.sellerId || 'unknown';
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(it);
    });
    const feeBySeller = new Map<string, { fee: number; error?: string }>(
      (shippingFeeData?.perSeller ?? []).map((p) => [p.sellerId, { fee: p.fee, error: p.error }])
    );
    return Array.from(map.entries()).map(([sellerId, items]) => {
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const fee = feeBySeller.get(sellerId);
      const shopShip = fee?.fee ?? 0;
      const shopShipError = fee?.error;
      const voucher = vouchersByShop[sellerId] ?? null;
      const discount = computeShopDiscount(subtotal, voucher);
      const total = Math.max(0, subtotal + shopShip - discount);
      return { sellerId, items, subtotal, shopShip, shopShipError, voucher, discount, total };
    });
  }, [cartItems, shippingFeeData, vouchersByShop]);

  // Fetch shop name cho mỗi sellerId chưa cache
  useEffect(() => {
    const missing = shopGroups
      .map((g) => g.sellerId)
      .filter((sid) => sid !== 'unknown' && !shopNameCache[sid]);
    if (missing.length === 0) return;
    missing.forEach((sid) => {
      shopService.getShop(sid)
        .then((s) => setShopNameCache((prev) => ({ ...prev, [sid]: s.shopName || `Shop ${sid.slice(-6)}` })))
        .catch(() => setShopNameCache((prev) => ({ ...prev, [sid]: `Shop ${sid.slice(-6)}` })));
    });
  }, [shopGroups, shopNameCache]);

  const totalDiscount = shopGroups.reduce((s, g) => s + g.discount, 0);
  const finalTotal = Math.max(0, total - totalDiscount + shippingFee);
  const isMultiShop = shopGroups.length > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    if (!user) { navigate('/login', { state: { from: location } }); return; }
    if (cartItems.length === 0) return;
    if (!selectedAddress) {
      setOrderError('Vui lòng chọn hoặc thêm địa chỉ giao hàng.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paymentMethod !== 'COD' && isMultiShop) {
      setOrderError('Thanh toán online (Stripe/MoMo/PayOS/Bank) hiện chỉ hỗ trợ đơn 1 shop. Vui lòng chọn COD cho đơn nhiều shop.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const mapItem = (item: CartItemResponse | LocalCartItem) => {
      if ('productId' in item && !('id' in item && typeof (item as CartItemResponse).id === 'string' && (item as CartItemResponse).productId)) {
        const local = item as LocalCartItem;
        return {
          productId: local.productId,
          productName: local.name,
          productImage: local.image || null,
          quantity: local.quantity,
          price: local.price,
          variantId: null,
          sellerId: local.sellerId ?? null,
        };
      } else {
        const server = item as CartItemResponse;
        return {
          productId: server.productId,
          productName: server.name,
          productImage: server.image,
          quantity: server.quantity,
          price: server.price,
          variantId: server.variantId,
          sellerId: server.sellerId,
        };
      }
    };

    setIsProcessingPayment(true);

    try {
      const createdOrders: Array<{ id: string }> = [];
      for (const g of shopGroups) {
        const order = await createOrder.mutateAsync({
          items: g.items.map(mapItem),
          shippingAddress: {
            fullName: selectedAddress.receiverName,
            phoneNumber: selectedAddress.phone,
            street: selectedAddress.street,
            ward: selectedAddress.ward,
            district: selectedAddress.district,
            province: selectedAddress.province,
            postalCode: '',
            note,
          },
          paymentMethod,
          voucherId: g.voucher && g.discount > 0 ? g.voucher.id : undefined,
          toGhnDistrictId: selectedAddress.ghnDistrictId,
          toGhnWardCode: selectedAddress.ghnWardCode,
          clientShippingFee: g.shopShip,
        } as any);
        createdOrders.push(order);
      }

      if (paymentMethod === 'ONLINE') {
        const order = createdOrders[0];
        try {
          const res = await paymentService.createPaymentIntent({
            orderId: order.id,
            amount: shopGroups[0].total,
            currency: 'vnd',
          });
          if (!res.clientSecret) {
            setOrderError('Không thể khởi tạo thanh toán. Vui lòng thử lại.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          toast.info('Đang kết nối ngân hàng xử lý thanh toán...', { duration: 3000 });
          await stripeFormRef.current?.confirmPayment(res.clientSecret);
        } catch (error: any) {
          const msg = error?.response?.data?.error
            || error?.response?.data?.message
            || error?.message
            || 'Lỗi tạo thanh toán Stripe.';
          setOrderError(msg);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (paymentMethod === 'MOMO' || paymentMethod === 'PAYOS') {
        const order = createdOrders[0];
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payments/create?method=${paymentMethod}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId: order.id, amount: shopGroups[0].total, currency: 'vnd' })
          });
          const data = await res.json();

          if (data.clientSecret) {
            toast.info(`Đang chuyển hướng đến cổng thanh toán ${paymentMethod}...`, { duration: 3000 });
            await clearCheckedOutItems();
            window.location.href = data.clientSecret;
          } else {
            setOrderError(`Không thể tạo link thanh toán ${paymentMethod}.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch (error) {
          setOrderError(`Lỗi kết nối cổng thanh toán ${paymentMethod}.`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (paymentMethod.startsWith('BANK_') || paymentMethod.startsWith('CARD_')) {
        await clearCheckedOutItems();
        toast.success('Thanh toán bằng tài khoản/thẻ đã lưu thành công! Đơn hàng đã được xác nhận.');
        navigate(`/orders/${createdOrders[0].id}`);
      } else {
        await clearCheckedOutItems();
        if (createdOrders.length === 1) {
          toast.success('Đặt hàng thành công!');
          navigate(`/orders/${createdOrders[0].id}`);
        } else {
          toast.success(`Đặt hàng thành công ${createdOrders.length} đơn!`);
          navigate('/orders');
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Đặt hàng thất bại. Vui lòng thử lại.';
      setOrderError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Giỏ hàng trống</h2>
          <button onClick={() => navigate('/products')} className="mt-4 text-orange-500 font-medium hover:underline">
            Quay lại mua sắm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button onClick={() => navigate('/cart')} className="hover:text-orange-500 transition-colors">
              Giỏ hàng
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 font-medium">Thanh toán</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Xác nhận đơn hàng</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {orderError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{orderError}</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left */}
            <div className="lg:col-span-2 space-y-6">

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between gap-2 mb-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <h2 className="font-semibold text-gray-900">Địa chỉ giao hàng</h2>
                  </div>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddAddressModal(true)}
                      className="flex items-center gap-1 rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm địa chỉ
                    </button>
                  )}
                </div>

                {addressesLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 rounded-xl bg-gray-100" />
                    ))}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <MapPin className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium mb-1">Chưa có địa chỉ giao hàng</p>
                    <p className="text-sm text-gray-400 mb-4">Vui lòng thêm địa chỉ để tiếp tục đặt hàng</p>
                    <button
                      type="button"
                      onClick={() => setShowAddAddressModal(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Thêm địa chỉ mới
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => {
                      const selected = addr.id === selectedAddressId;
                      return (
                        <label
                          key={addr.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                            selected
                              ? 'border-orange-400 bg-orange-50/40 ring-2 ring-orange-100'
                              : 'border-gray-200 bg-white hover:border-orange-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingAddress"
                            className="mt-1 h-4 w-4 accent-orange-500"
                            checked={selected}
                            onChange={() => setSelectedAddressId(addr.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-sm text-gray-800">{addr.receiverName}</p>
                              <span className="text-gray-300 text-xs">|</span>
                              <p className="text-sm text-gray-500">{addr.phone}</p>
                              {addr.default && (
                                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">Mặc định</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {addr.street}, {addr.ward}, {addr.district}, {addr.province}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {addresses.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú (không bắt buộc)</label>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú thêm cho người giao hàng..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Per-shop blocks (Shopee style) */}
              {shopGroups.map((g) => {
                const shopName = shopNameCache[g.sellerId] ?? (g.sellerId === 'unknown' ? 'Sản phẩm' : `Shop ${g.sellerId.slice(-6)}`);
                return (
                  <div key={g.sellerId} className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                      <ShoppingBag className="w-4 h-4 text-orange-500" />
                      <h2 className="font-semibold text-gray-900">{shopName}</h2>
                      <span className="text-xs text-gray-400">({g.items.length} sản phẩm)</span>
                    </div>

                    <ul className="space-y-3 mb-4">
                      {g.items.map((item: CartItemResponse | LocalCartItem) => {
                        const key = 'productId' in item ? (item as LocalCartItem).productId : (item as CartItemResponse).id;
                        const imageUrl = 'image' in item ? (item as LocalCartItem).image : undefined;
                        return (
                          <li key={key} className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                              {imageUrl ? (
                                <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-5 h-5 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-gray-500">x{item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2">
                      {g.voucher ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Ticket className="h-4 w-4 text-orange-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-orange-700 truncate">{g.voucher.code}</p>
                              {g.discount > 0 ? (
                                <p className="text-xs text-green-600">Giảm {formatPrice(g.discount)}</p>
                              ) : (
                                <p className="text-xs text-red-500">Không đủ điều kiện</p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVouchersByShop((p) => ({ ...p, [g.sellerId]: null }))}
                            className="p-1 hover:bg-orange-100 rounded"
                          >
                            <X className="h-4 w-4 text-orange-500" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVoucherPickerForShop(g.sellerId)}
                          className="flex w-full items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                        >
                          <Ticket className="h-4 w-4" />
                          Chọn voucher của shop
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 text-sm border-t border-gray-100 pt-3">
                      <div className="flex justify-between text-gray-600">
                        <span>Tạm tính sản phẩm</span>
                        <span>{formatPrice(g.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Phí vận chuyển</span>
                        {g.shopShipError ? (
                          <span className="text-red-500 text-xs">{g.shopShipError}</span>
                        ) : (
                          <span>{formatPrice(g.shopShip)}</span>
                        )}
                      </div>
                      {g.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Voucher</span>
                          <span>- {formatPrice(g.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-gray-900 pt-1">
                        <span>Tổng đơn shop này</span>
                        <span className="text-orange-500">{formatPrice(g.total)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Payment Method */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  <h2 className="font-semibold text-gray-900">Phương thức thanh toán</h2>
                </div>
                <div className="space-y-3.5">
                  {[
                    {
                      id: 'COD',
                      title: 'Thanh toán khi nhận hàng (COD)',
                      subtext: 'Trả tiền mặt trực tiếp khi giao hàng',
                      icon: <Truck className="w-5 h-5 text-orange-500" />,
                      bgIcon: 'bg-orange-50',
                      content: (
                        <div className="text-xs text-gray-500 pl-14 pb-4 pr-4">
                          Nhân viên giao hàng sẽ thu tiền mặt khi giao sản phẩm đến địa chỉ của bạn.
                        </div>
                      )
                    },
                    {
                      id: 'BANK',
                      title: 'Tài khoản ngân hàng đã liên kết',
                      subtext: 'Thanh toán trực tiếp bằng tài khoản đã lưu',
                      icon: <CreditCard className="w-5 h-5 text-blue-500" />,
                      bgIcon: 'bg-blue-50',
                      content: (
                        <div className="pl-14 pb-4 pr-4 space-y-3">
                          {bankAccounts.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Bạn chưa liên kết tài khoản ngân hàng nào. Vui lòng thêm tại mục Hồ sơ.</p>
                          ) : (
                            <div className="space-y-2">
                              {bankAccounts.map(b => (
                                <label
                                  key={b.id}
                                  className={`flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3.5 transition-all border ${
                                    paymentMethod === `BANK_${b.id}` ? 'border-orange-400 bg-orange-50/20 ring-1 ring-orange-100' : 'border-gray-150 hover:border-orange-200 shadow-sm'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="paymentBank"
                                    className="h-4 w-4 accent-orange-500"
                                    checked={paymentMethod === `BANK_${b.id}`}
                                    onChange={() => setPaymentMethod(`BANK_${b.id}`)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 text-xs truncate">{b.bankName}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{b.accountNumber} - {b.accountHolderName}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      id: 'ONLINE',
                      title: 'Thẻ tín dụng / Thẻ ghi nợ (Visa, Mastercard, JCB)',
                      subtext: 'Thanh toán bằng thẻ đã liên kết hoặc qua cổng Stripe',
                      icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
                      bgIcon: 'bg-indigo-50',
                      content: (
                        <div className="pl-14 pb-4 pr-4 space-y-3">
                          {creditCards.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold text-gray-700">Chọn thẻ đã liên kết:</p>
                              {creditCards.map(c => (
                                <label
                                  key={c.id}
                                  className={`flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3.5 transition-all border ${
                                    paymentMethod === `CARD_${c.id}` ? 'border-orange-400 bg-orange-50/20 ring-1 ring-orange-100' : 'border-gray-150 hover:border-orange-200 shadow-sm'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentMethod(`CARD_${c.id}`);
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="paymentCard"
                                    className="h-4 w-4 accent-orange-500"
                                    checked={paymentMethod === `CARD_${c.id}`}
                                    onChange={() => setPaymentMethod(`CARD_${c.id}`)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 text-xs truncate">{c.cardBrand}</p>
                                    <p className="text-[10px] text-gray-500 truncate">**** **** **** {c.last4Digits} - {c.cardHolderName}</p>
                                  </div>
                                </label>
                              ))}
                              
                              <label
                                className={`flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3.5 transition-all border ${
                                  paymentMethod === 'ONLINE' ? 'border-orange-400 bg-orange-50/20 ring-1 ring-orange-100' : 'border-gray-150 hover:border-orange-200 shadow-sm'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentMethod('ONLINE');
                                }}
                              >
                                <input
                                  type="radio"
                                  name="paymentCard"
                                  className="h-4 w-4 accent-orange-500"
                                  checked={paymentMethod === 'ONLINE'}
                                  onChange={() => setPaymentMethod('ONLINE')}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-800 text-xs">Thanh toán qua cổng Stripe</p>
                                  <p className="text-[10px] text-gray-500">Sử dụng thẻ quốc tế Visa, Mastercard, JCB mới</p>
                                </div>
                              </label>
                            </div>
                          )}

                          {creditCards.length === 0 && (
                            <div className="text-xs text-gray-500">
                              Bạn sẽ điền thông tin thẻ quốc tế an toàn ở phần bên dưới để thực hiện giao dịch bảo mật qua Stripe.
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      id: 'MOMO',
                      title: 'Ví điện tử MoMo',
                      subtext: 'Mở ứng dụng MoMo Sandbox để quét mã QR',
                      icon: <img src={momoLogo} alt="MoMo" className="w-5 h-5 object-contain" />,
                      bgIcon: 'bg-pink-50',
                      content: (
                        <div className="text-xs text-gray-500 pl-14 pb-4 pr-4">
                          Sau khi đặt hàng, bạn sẽ được tự động chuyển hướng đến cổng thanh toán MoMo Sandbox để thanh toán ảo.
                        </div>
                      )
                    },
                    {
                      id: 'PAYOS',
                      title: 'Chuyển khoản QR (PayOS)',
                      subtext: 'Quét mã VietQR bằng bất kỳ ứng dụng ngân hàng nào',
                      icon: <img src={payosLogo} alt="PayOS" className="w-5 h-5 object-contain" />,
                      bgIcon: 'bg-blue-50',
                      content: (
                        <div className="text-xs text-gray-500 pl-14 pb-4 pr-4">
                          Hệ thống sẽ tạo mã chuyển khoản VietQR tự động để bạn quét mã nhanh chóng qua bất kỳ App ngân hàng nào tại Việt Nam.
                        </div>
                      )
                    }
                  ].map((cat) => {
                    const isActive = paymentCategory === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id as PaymentCategory)}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                          isActive
                            ? 'border-orange-500 bg-orange-50/5 ring-2 ring-orange-50/30'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/20'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 p-4 select-none">
                          <input
                            type="radio"
                            name="paymentCategoryRadio"
                            className="h-4 w-4 accent-orange-500 cursor-pointer shrink-0"
                            checked={isActive}
                            readOnly
                          />
                          <div className={`w-10 h-10 ${cat.bgIcon} rounded-xl flex items-center justify-center shadow-sm shrink-0`}>
                            {cat.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-sm">{cat.title}</h3>
                            <p className="text-xs text-gray-500 truncate">{cat.subtext}</p>
                          </div>
                        </div>
                        {isActive && cat.content}
                      </div>
                    );
                  })}
                </div>

                {paymentCategory === 'ONLINE' && paymentMethod === 'ONLINE' && (
                  <Elements stripe={stripePromise}>
                    <StripePaymentForm
                      ref={stripeFormRef}
                      onPaymentSuccess={async () => {
                        toast.success('Thanh toán thẻ thành công! Đơn hàng đã được xác nhận.');
                        await clearCheckedOutItems();
                        navigate('/orders');
                      }}
                      onPaymentError={(err) => {
                        setOrderError(err);
                        setIsProcessingPayment(false);
                      }}
                    />
                  </Elements>
                )}
              </div>
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-5">
                  Tổng thanh toán
                  {isMultiShop && <span className="ml-2 text-xs font-normal text-gray-500">({shopGroups.length} shop)</span>}
                </h2>

                <div className="space-y-3 mb-5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng tiền hàng ({cartItems.length} sản phẩm)</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Tổng giảm voucher</span>
                      <span>- {formatPrice(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng phí vận chuyển</span>
                    {!selectedAddress ? (
                      <span className="text-gray-400 text-xs">Chọn địa chỉ để tính</span>
                    ) : !selectedAddress.ghnDistrictId || !selectedAddress.ghnWardCode ? (
                      <span className="text-red-500 text-xs">Địa chỉ thiếu thông tin GHN</span>
                    ) : feeLoading ? (
                      <span className="text-gray-400 text-xs">Đang tính...</span>
                    ) : shippingError ? (
                      <span className="text-red-500 text-xs">Không tính được</span>
                    ) : (
                      <span className="font-medium">{formatPrice(shippingFee)}</span>
                    )}
                  </div>
                  {shippingError && shippingFeeData?.perSeller && (
                    <div className="text-xs text-red-500 pl-2">
                      {shippingFeeData.perSeller.filter((p) => p.error).map((p) => (
                        <p key={p.sellerId}>
                          {shopNameCache[p.sellerId] ?? `Shop ${p.sellerId.slice(-6)}`}: {p.error}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Thanh toán</span>
                    <span className="font-medium">
                      {paymentMethod === 'COD' ? 'COD'
                        : paymentMethod.startsWith('BANK_') ? 'Ngân hàng'
                        : paymentMethod.startsWith('CARD_') ? 'Thẻ'
                        : 'Online'}
                    </span>
                  </div>
                </div>

                {isMultiShop && (
                  <div className="mb-5 rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 text-xs text-orange-700">
                    Đơn của bạn sẽ được tách thành {shopGroups.length} đơn riêng (mỗi shop một đơn).
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between font-bold text-xl text-gray-900">
                    <span>Tổng cộng</span>
                    <span className="text-orange-500">{formatPrice(finalTotal)}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={
                    createOrder.isPending || isProcessingPayment ||
                    !selectedAddress ||
                    !selectedAddress.ghnDistrictId || !selectedAddress.ghnWardCode ||
                    feeLoading || shippingError
                  }
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-orange-200 hover:shadow-orange-300"
                >
                  {(createOrder.isPending || isProcessingPayment) ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Xác nhận đặt hàng
                    </>
                  )}
                </button>
                <p className="text-xs text-center text-gray-400 mt-3">
                  Bằng cách đặt hàng, bạn đồng ý với{' '}
                  <span className="text-orange-500 cursor-pointer hover:underline">Điều khoản dịch vụ</span>
                </p>
              </div>
            </div>
          </div>
        </form>

        {showAddAddressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-base font-bold text-gray-900">Thêm địa chỉ mới</h3>
                <button
                  type="button"
                  onClick={() => { setShowAddAddressModal(false); setNewAddress(EMPTY_ADDRESS); }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSaveNewAddress} className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Người nhận <span className="text-red-500">*</span></label>
                    <input
                      required
                      placeholder="Nguyễn Văn A"
                      value={newAddress.receiverName}
                      onChange={(e) => setNewAddress((p) => ({ ...p, receiverName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Số điện thoại <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="tel"
                      placeholder="0901234567"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <LocationSelector
                    required
                    province={newAddress.province}
                    district={newAddress.district}
                    ward={newAddress.ward}
                    ghnProvinceId={newAddress.ghnProvinceId}
                    ghnDistrictId={newAddress.ghnDistrictId}
                    ghnWardCode={newAddress.ghnWardCode}
                    onChange={(loc) => setNewAddress((p) => ({ ...p, ...loc }))}
                  />
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Số nhà, tên đường <span className="text-red-500">*</span></label>
                    <input
                      required
                      placeholder="VD: 123 Nguyễn Huệ"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress((p) => ({ ...p, street: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="checkoutNewAddrDefault"
                      checked={!!newAddress.default}
                      onChange={(e) => setNewAddress((p) => ({ ...p, default: e.target.checked }))}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    <label htmlFor="checkoutNewAddrDefault" className="text-xs font-medium text-gray-600">Đặt làm địa chỉ mặc định</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-4">
                  <button
                    type="button"
                    onClick={() => { setShowAddAddressModal(false); setNewAddress(EMPTY_ADDRESS); }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={
                      addAddress.isPending
                      || !newAddress.receiverName?.trim()
                      || !newAddress.phone?.trim()
                      || !newAddress.province?.trim()
                      || !newAddress.district?.trim()
                      || !newAddress.ward?.trim()
                      || !newAddress.street?.trim()
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> {addAddress.isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {voucherPickerForShop !== null && (() => {
          const shop = shopGroups.find((g) => g.sellerId === voucherPickerForShop);
          const shopName = shopNameCache[voucherPickerForShop] ?? `Shop ${voucherPickerForShop.slice(-6)}`;
          const subtotal = shop?.subtotal ?? 0;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h3 className="text-base font-bold text-gray-900">Voucher của {shopName}</h3>
                  <button onClick={() => setVoucherPickerForShop(null)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                  {isVouchersLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-400">Đang tải voucher...</p>
                    </div>
                  ) : shopVouchers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      Shop này hiện chưa có voucher nào.
                    </p>
                  ) : (
                    shopVouchers.map((v) => {
                      const valid = subtotal >= (v.minOrderAmount || 0);
                      const isSaving = saveVoucher.isPending && saveVoucher.variables === v.id;
                      const isApplied = vouchersByShop[voucherPickerForShop!]?.id === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            if (v.saved && valid) {
                              setVouchersByShop((p) => ({
                                ...p,
                                [voucherPickerForShop!]: isApplied ? null : v,
                              }));
                              setVoucherPickerForShop(null);
                            }
                          }}
                          className={`flex items-center justify-between rounded-xl border-2 p-4 transition-all ${
                            v.saved && valid ? 'cursor-pointer hover:border-orange-300' : ''
                          } ${
                            valid && v.saved
                              ? isApplied
                                ? 'border-orange-400 bg-orange-50/20'
                                : 'border-orange-100 bg-orange-50/10 hover:border-orange-200'
                              : 'border-gray-150 bg-gray-50/30'
                          } ${!valid ? 'opacity-65' : ''}`}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-orange-600 text-xs bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{v.code}</span>
                              {v.saved && (
                                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Đã lưu</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 font-medium">
                              {v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${formatPrice(v.discountValue)}`}
                              {v.maxDiscount && v.discountType === 'PERCENT' ? ` (tối đa ${formatPrice(v.maxDiscount)})` : ''}
                            </p>
                            {v.minOrderAmount > 0 && (
                              <p className="mt-1 text-[11px] text-gray-500">Đơn tối thiểu {formatPrice(v.minOrderAmount)}</p>
                            )}
                            {!valid && (
                              <p className="mt-1 text-[11px] font-semibold text-red-500">Chưa đạt đơn tối thiểu</p>
                            )}
                          </div>
                          <div className="shrink-0">
                            {v.saved ? (
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  !valid
                                    ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                                    : isApplied
                                    ? 'border-orange-500 bg-orange-500 text-white'
                                    : 'border-gray-300 bg-white hover:border-orange-400'
                                }`}
                              >
                                {isApplied && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveVoucher.mutate(v.id);
                                }}
                                className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm shadow-orange-100"
                              >
                                {isSaving ? (
                                  <>
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Lưu...
                                  </>
                                ) : (
                                  'Lưu'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}