import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProductDetail, useProductReviews, useProducts } from '@/features/product/hooks/useProducts';
import { userService } from '@/features/user/services/userService';
import { useCategories, useCategoryAttributes } from '@/features/product/hooks/useCategories';
import { useShop, useShopVouchers, useSaveVoucher, useUnsaveVoucher } from '@/features/shop/hooks/useShop';
import { useAuthStore } from '@/stores/authStore';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { cartService } from '@/features/cart/services/cartService';
import RatingStars from '@/components/common/RatingStars';
import VoucherCard from '@/features/shop/components/VoucherCard';
import { formatPrice, formatDate } from '@/utils/format';
import { ShoppingCart, MessageCircle, Minus, Plus, ChevronLeft, Store, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import ShareProductModal from '@/features/chat/components/ShareProductModal';
import type { Category } from '@/types/api.types';

/** Dò ngược danh mục cha → con để dựng breadcrumb (vd: "Điện thoại › Smartphone"). */
function buildCategoryPath(leafId: string, all: Category[]): Category[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const chain: Category[] = [];
  let current = byId.get(leafId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProductDetail(id!);
  const { data: reviews } = useProductReviews(id!);
  const { data: categoryAttributes } = useCategoryAttributes(product?.categoryId);
  const { data: shop } = useShop(product?.sellerId);
  const { data: shopVouchers } = useShopVouchers(product?.sellerId);
  const { data: categories } = useCategories();
  const { data: sellerProducts } = useProducts({ sellerId: product?.sellerId, size: 1 });
  const saveVoucher = useSaveVoucher(product?.sellerId);
  const unsaveVoucher = useUnsaveVoucher(product?.sellerId);
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const serverAddToCart = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, { name: string; avatarUrl?: string }>>({});

  // Resolve reviewer userIds → names (backend currently returns the UUID as customerName)
  useEffect(() => {
    if (!reviews || reviews.length === 0) return;
    const missing = Array.from(new Set(reviews.map((r) => r.userId).filter((id) => id && !reviewerProfiles[id])));
    if (missing.length === 0) return;
    missing.forEach((id) => {
      userService.getProfileById(id)
        .then((p) => setReviewerProfiles((prev) => ({ ...prev, [id]: { name: p.fullName || 'Người dùng', avatarUrl: p.avatarUrl } })))
        .catch(() => setReviewerProfiles((prev) => ({ ...prev, [id]: { name: 'Người dùng' } })));
    });
  }, [reviews, reviewerProfiles]);
if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square rounded-xl bg-muted" />
            <div className="flex flex-col gap-4">
              <div className="h-8 w-3/4 rounded bg-muted" />
              <div className="h-6 w-1/3 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
              <div className="h-12 w-1/2 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-lg text-muted-foreground">Không tìm thấy sản phẩm.</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const selectedVariant = selectedVariantIndex !== null ? product.variants?.[selectedVariantIndex] ?? null : null;
  const effectivePrice = product.price + (selectedVariant?.additionalPrice ?? 0);
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;

  // Khi chưa chọn variant: tính khoảng giá min-max từ các variant để hiển thị (kiểu "9.000₫ - 10.000₫")
  const variantPrices = (product.variants ?? []).map((v) => product.price + (v.additionalPrice ?? 0));
  const minPrice = variantPrices.length > 0 ? Math.min(product.price, ...variantPrices) : product.price;
  const maxPrice = variantPrices.length > 0 ? Math.max(product.price, ...variantPrices) : product.price;
  const showPriceRange = !selectedVariant && variantPrices.length > 0 && minPrice !== maxPrice;

  const hasVariants = (product?.variants?.length ?? 0) > 0;

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (hasVariants && !selectedVariant) {
      toast.error('Vui lòng chọn phân loại sản phẩm trước khi thêm vào giỏ hàng');
      return;
    }
    const variantLabel = selectedVariant
      ? [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' ').trim()
      : undefined;
    
    serverAddToCart.mutate(
      {
        productId: product.id,
        name: product.name,
        image: product.images?.[0] || null,
        price: effectivePrice,
        quantity,
        variantId: selectedVariant?.id,
        variantName: variantLabel || undefined,
        sellerId: product.sellerId,
      },
      {
        onSuccess: () => {
          const userId = user?.id || 'guest';
          const justAddedKey = `cart_just_added_${userId}`;
          let list = [];
          try {
            const existing = localStorage.getItem(justAddedKey);
            list = existing ? JSON.parse(existing) : [];
          } catch (e) {
            console.error(e);
          }
          const newItem = {
            productId: product.id,
            variantId: selectedVariant?.id || null,
          };
          list.push(newItem);
          localStorage.setItem(justAddedKey, JSON.stringify(list));
        },
      }
    );
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (hasVariants && !selectedVariant) {
      toast.error('Vui lòng chọn phân loại sản phẩm trước khi mua');
      return;
    }
    const variantLabel = selectedVariant
      ? [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' ').trim()
      : undefined;
    serverAddToCart.mutate(
      {
        productId: product.id,
        name: product.name,
        image: product.images?.[0] || null,
        price: effectivePrice,
        quantity,
        variantId: selectedVariant?.id,
        variantName: variantLabel || undefined,
        sellerId: product.sellerId,
      },
      {
        onSuccess: async () => {
          try {
            // Fetch updated cart to get the correct cart item ID
            const cartData = await cartService.getCart();
            const addedItem = cartData.data.items.find(
              (item) =>
                item.productId === product.id &&
                (!selectedVariant || item.variantId === selectedVariant.id)
            );
            if (addedItem) {
              // Override quantity to the currently selected quantity for Buy Now
              const checkoutItem = {
                ...addedItem,
                quantity: quantity
              };
              navigate('/checkout', { state: { selectedItems: [checkoutItem] } });
            } else {
              // Fallback if not found in cart
              navigate('/checkout', {
                state: {
                  selectedItems: [
                    {
                      id: `temp-${product.id}`,
                      productId: product.id,
                      variantId: selectedVariant?.id || null,
                      variantName: variantLabel || null,
                      name: product.name,
                      image: product.images?.[0] || null,
                      sellerId: product.sellerId || null,
                      price: effectivePrice,
                      quantity,
                      subtotal: effectivePrice * quantity,
                    },
                  ],
                },
              });
            }
          } catch (error) {
            console.error('Lỗi khi lấy thông tin giỏ hàng:', error);
            navigate('/cart');
          }
        },
      }
    );
  };

  const avgRating = product?.ratingAvg ?? (reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0);
  const totalReviewCount = product?.ratingCount ?? reviews?.length ?? 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate('/products')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại
      </button>

      {/* Main */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div className="flex flex-col gap-3">
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            <img
              src={product.images?.[selectedImage] || '/placeholder-product.png'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    selectedImage === i ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img src={img} alt={`${product.name} - ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>

          <RatingStars rating={avgRating} reviewCount={totalReviewCount} size="md" />

          <p className="text-3xl font-bold text-orange-500">
            {showPriceRange
              ? `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
              : formatPrice(effectivePrice)}
          </p>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Kho:</span>
            <span className={effectiveStock > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              {effectiveStock > 0 ? `Còn ${effectiveStock} sản phẩm` : 'Hết hàng'}
            </span>
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-base font-medium">Phân loại:</span>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((variant, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariantIndex(selectedVariantIndex === i ? null : i)}
                    disabled={variant.stock === 0}
                    className={`min-w-[80px] rounded-sm border px-4 py-2.5 text-sm transition-colors
                      ${selectedVariantIndex === i
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : variant.stock === 0
                          ? 'border-border text-muted-foreground line-through cursor-not-allowed opacity-50'
                          : 'border-border hover:border-primary hover:text-primary'
                      }`}
                  >
                    {[variant.color, variant.size].filter(Boolean).join(' - ') || `Loại ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart + Buy Now */}
          {effectiveStock > 0 && (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <div className="flex items-center rounded-lg border border-border w-fit">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[3rem] text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={hasVariants && !selectedVariant}
                  title={hasVariants && !selectedVariant ? 'Vui lòng chọn phân loại' : undefined}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-orange-500 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-600 shadow-sm hover:bg-orange-100 transition-colors disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Thêm vào giỏ hàng
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={hasVariants && !selectedVariant}
                  title={hasVariants && !selectedVariant ? 'Vui lòng chọn phân loại' : undefined}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Mua ngay
                </button>
              </div>
            </div>
          )}

          {/* Chat with seller */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!isAuthenticated) { navigate('/login'); return; }
                if (!product.sellerId) {
                  toast.error('Không tìm thấy thông tin người bán. Vui lòng thử lại sau.');
                  return;
                }
                navigate(`/chat?sellerId=${product.sellerId}&productId=${product.id}`);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary px-6 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Chat với người bán
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) { navigate('/login'); return; }
                setShowShareModal(true);
              }}
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Chia sẻ qua chat
            </button>
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareProductModal
          product={{
            productId: product.id,
            name: product.name,
            price: effectivePrice,
            image: product.images?.[0] ?? null,
            sellerId: product.sellerId ?? null,
            shopName: shop?.shopName ?? null,
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Shop info card */}
      {product.sellerId && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            {/* Avatar + name + actions */}
            <div className="flex items-center gap-4 md:w-[360px] md:shrink-0">
              <Link
                to={`/shop/${product.sellerId}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted hover:border-orange-500 transition-colors"
              >
                {shop?.avatarUrl ? (
                  <img src={shop.avatarUrl} alt={shop.shopName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Store className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Link
                  to={`/shop/${product.sellerId}`}
                  className="truncate text-base font-semibold uppercase hover:text-orange-500 transition-colors"
                >
                  {shop?.shopName || 'Cửa hàng'}
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!isAuthenticated) { navigate('/login'); return; }
                      navigate(`/chat?sellerId=${product.sellerId}&productId=${product.id}`);
                    }}
                    className="flex items-center gap-1.5 rounded border border-orange-500 bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat Ngay
                  </button>
                  <button
                    onClick={() => navigate(`/shop/${product.sellerId}`)}
                    className="flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <Store className="h-3.5 w-3.5" />
                    Xem Shop
                  </button>
                </div>
              </div>
            </div>

            {/* Stats — chỉ hiển thị các số đang có */}
            <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              <div className="flex justify-between md:justify-start md:gap-2">
                <span className="text-muted-foreground">Đánh giá</span>
                <span className="font-medium text-orange-500">{(avgRating ?? 0).toFixed(1)}</span>
              </div>
              <div className="flex justify-between md:justify-start md:gap-2">
                <span className="text-muted-foreground">Sản phẩm</span>
                <span className="font-medium text-orange-500">
                  {sellerProducts?.totalElements ?? 0}
                </span>
              </div>
              <div className="flex justify-between md:justify-start md:gap-2">
                <span className="text-muted-foreground">Người theo dõi</span>
                <span className="font-medium text-orange-500">{shop?.followerCount ?? 0}</span>
              </div>
              <div className="flex justify-between md:justify-start md:gap-2 md:col-span-3">
                <span className="text-muted-foreground">Tham gia</span>
                <span className="font-medium text-orange-500">
                  {shop?.joinedAt ? formatDate(shop.joinedAt) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chi tiết + Mô tả + Voucher */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: chi tiết + mô tả */}
        <div className="flex flex-col gap-6">
          {/* CHI TIẾT SẢN PHẨM */}
          <section className="rounded-xl border border-border bg-card">
            <h2 className="bg-muted/40 px-5 py-3 text-base font-semibold uppercase">
              Chi tiết sản phẩm
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 p-5 text-sm">
              {/* Danh mục — breadcrumb từ root */}
              {product.categoryId && (
                <div className="contents">
                  <dt className="text-muted-foreground">Danh mục</dt>
                  <dd className="flex flex-wrap items-center gap-1">
                    {buildCategoryPath(product.categoryId, categories ?? []).map((c, i, arr) => (
                      <span key={c.id} className="flex items-center gap-1">
                        <Link to={`/products?categoryId=${c.id}`} className="text-blue-600 hover:underline">
                          {c.name}
                        </Link>
                        {i < arr.length - 1 && <span className="text-muted-foreground">›</span>}
                      </span>
                    ))}
                  </dd>
                </div>
              )}

              <div className="contents">
                <dt className="text-muted-foreground">Kho</dt>
                <dd className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
                </dd>
              </div>

              <div className="contents">
                <dt className="text-muted-foreground">Đã bán</dt>
                <dd className="font-medium">{product.soldCount ?? 0}</dd>
              </div>

              {/* Các trường do admin cấu hình cho danh mục */}
              {categoryAttributes && product.attributes &&
                categoryAttributes
                  .filter((attr) => {
                    const v = (product.attributes as Record<string, unknown>)[attr.name];
                    return v != null && String(v).trim() !== '';
                  })
                  .map((attr) => (
                    <div key={attr.id} className="contents">
                      <dt className="text-muted-foreground">{attr.label}</dt>
                      <dd className="font-medium">
                        {String((product.attributes as Record<string, unknown>)[attr.name])}
                      </dd>
                    </div>
                  ))}
            </dl>
          </section>

          {/* MÔ TẢ SẢN PHẨM */}
          <section className="rounded-xl border border-border bg-card">
            <h2 className="bg-muted/40 px-5 py-3 text-base font-semibold uppercase">
              Mô tả sản phẩm
            </h2>
            <div className="p-5">
              {product.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sản phẩm chưa có mô tả.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right: voucher */}
        <aside className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Mã giảm giá của Shop</h3>
          {shopVouchers && shopVouchers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {shopVouchers.filter((v) => v.active).map((v) => (
                <VoucherCard
                  key={v.id}
                  voucher={v}
                  onSave={() => {
                    if (!isAuthenticated) { navigate('/login'); return; }
                    saveVoucher.mutate(v.id);
                  }}
                  onUnsave={() => unsaveVoucher.mutate(v.id)}
                  loading={saveVoucher.isPending || unsaveVoucher.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Shop chưa có mã giảm giá
            </p>
          )}
        </aside>
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <h2 className="mb-6 text-xl font-bold text-foreground">
          Đánh giá sản phẩm ({totalReviewCount})
        </h2>

        {/* Review List */}
        {reviews && reviews.length > 0 ? (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => {
              const profile = reviewerProfiles[review.userId];
              const displayName = profile?.name || 'Người dùng';
              return (
                <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0">
                        {profile?.avatarUrl
                          ? <img src={profile.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          : displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                        <RatingStars rating={review.rating} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(review.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground">{review.comment}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có đánh giá nào cho sản phẩm này.</p>
        )}
      </div>
    </div>
  );
}
