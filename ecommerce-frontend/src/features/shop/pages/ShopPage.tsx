import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop, useShopCategories, useShopVouchers, useSaveVoucher, useUnsaveVoucher } from '../hooks/useShop';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useAuthStore } from '@/stores/authStore';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import ProductGrid from '@/features/product/components/ProductGrid';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import EmptyState from '@/components/common/EmptyState';
import ShopHeader from '../components/ShopHeader';
import VoucherCard from '../components/VoucherCard';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/types/api.types';
import { toast } from 'sonner';

type TabKey = 'home' | 'all' | string; // string is shop category id

export default function ShopPage() {
  const { sellerId = '' } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const addToCartMut = useAddToCart();

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [page, setPage] = useState(0);

  const { data: shop, isLoading: shopLoading } = useShop(sellerId);
  const { data: categories = [] } = useShopCategories(sellerId);
  const { data: vouchers = [] } = useShopVouchers(sellerId);
  const saveVoucherMut = useSaveVoucher(sellerId);
  const unsaveVoucherMut = useUnsaveVoucher(sellerId);

  // Products for "home" tab — top sold-count
  const { data: topProducts, isLoading: topLoading } = useProducts({
    page: 0,
    size: 12,
    sellerId,
    sort: 'top_sold',
  });

  // Products for "all" tab + custom categories — fetch one large batch and slice client-side
  const PAGE_SIZE = 20;
  const { data: allProducts, isLoading: allLoading } = useProducts({
    page: 0,
    size: 100,
    sellerId,
  });

  const allList = allProducts?.content ?? [];
  const pagedAll = allList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allTotalPages = Math.max(1, Math.ceil(allList.length / PAGE_SIZE));

  // Active custom category
  const activeCategory = categories.find((c) => c.id === activeTab);
  const categoryProducts = activeCategory
    ? allList.filter((p) => activeCategory.productIds.includes(p.id))
    : [];

  const handleAddToCart = useCallback(
    (product: Product) => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      // Sản phẩm có biến thể bắt buộc chọn phân loại → chuyển sang trang chi tiết
      if ((product.variants?.length ?? 0) > 0) {
        navigate(`/products/${product.id}`);
        return;
      }
      addToCartMut.mutate({
        productId: product.id,
        name: product.name,
        image: product.images?.[0] || null,
        price: product.price,
        quantity: 1,
        sellerId: product.sellerId,
      });
    },
    [isAuthenticated, addToCartMut, navigate]
  );

  const handleSaveVoucher = (voucherId: string, isSaved: boolean) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isSaved) {
      unsaveVoucherMut.mutate(voucherId, { onSuccess: () => toast.success('Đã bỏ lưu voucher') });
    } else {
      saveVoucherMut.mutate(voucherId, { onSuccess: () => toast.success('Đã lưu voucher') });
    }
  };

  if (shopLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-12">
        <EmptyState icon={<Package className="h-12 w-12" />} title="Shop không tồn tại" description="Vui lòng kiểm tra lại đường dẫn." />
      </div>
    );
  }

  const totalProducts = allProducts?.totalElements ?? allList.length;

  return (
    <div className="container mx-auto px-4 py-6">
      <ShopHeader shop={shop} productCount={totalProducts} />

      {/* Vouchers */}
      {vouchers.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary">Voucher của Shop</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {vouchers.map((v) => (
              <VoucherCard
                key={v.id}
                voucher={v}
                onSave={() => handleSaveVoucher(v.id, false)}
                onUnsave={() => handleSaveVoucher(v.id, true)}
                loading={saveVoucherMut.isPending || unsaveVoucherMut.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')}>
            Dạo
          </TabButton>
          <TabButton active={activeTab === 'all'} onClick={() => { setActiveTab('all'); setPage(0); }}>
            Tất Cả Sản Phẩm
          </TabButton>
          {categories.map((cat) => (
            <TabButton
              key={cat.id}
              active={activeTab === cat.id}
              onClick={() => setActiveTab(cat.id)}
            >
              {cat.name}
            </TabButton>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'home' && (
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-secondary">Top Sản Phẩm Bán Chạy</h2>
            {topLoading ? (
              <ProductGridSkeleton count={8} />
            ) : !topProducts?.content || topProducts.content.length === 0 ? (
              <EmptyState icon={<Package className="h-12 w-12" />} title="Chưa có sản phẩm" description="Shop chưa có sản phẩm nào." />
            ) : (
              <ProductGrid products={topProducts.content} onAddToCart={handleAddToCart} />
            )}
          </section>
        )}

        {activeTab === 'all' && (
          <section>
            {allLoading ? (
              <ProductGridSkeleton count={8} />
            ) : allList.length === 0 ? (
              <EmptyState icon={<Package className="h-12 w-12" />} title="Chưa có sản phẩm" description="Shop chưa có sản phẩm nào." />
            ) : (
              <>
                <ProductGrid products={pagedAll} onAddToCart={handleAddToCart} />
                {allTotalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Trước
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Trang {page + 1} / {allTotalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page + 1 >= allTotalPages}
                      className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sau <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeCategory && (
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-secondary">{activeCategory.name}</h2>
            {allLoading ? (
              <ProductGridSkeleton count={8} />
            ) : categoryProducts.length === 0 ? (
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title="Không có sản phẩm"
                description="Danh mục này chưa có sản phẩm. Hãy chuyển sang Tất Cả Sản Phẩm để xem thêm."
              />
            ) : (
              <ProductGrid products={categoryProducts} onAddToCart={handleAddToCart} />
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-secondary/70 hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}
