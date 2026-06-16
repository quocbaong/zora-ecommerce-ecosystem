import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useAuthStore } from '@/stores/authStore';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { useSellerSearch } from '@/features/user/hooks/useSellerSearch';
import ProductGrid from '@/features/product/components/ProductGrid';
import ProductFilters from '@/features/product/components/ProductFilters';
import FilterSidebar from '@/features/product/components/FilterSidebar';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import SellerSearchCard from '@/features/shop/components/SellerSearchCard';
import type { Product } from '@/types/api.types';

export default function ProductListPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<{
    keyword?: string;
    categoryId?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
  }>({
    categoryId: searchParams.get('categoryId') || undefined,
    sort: searchParams.get('sort') || undefined,
    keyword: searchParams.get('keyword') || undefined,
  });

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      keyword: searchParams.get('keyword') || undefined,
      categoryId: searchParams.get('categoryId') || prev.categoryId,
      sort: searchParams.get('sort') || prev.sort,
    }));
    setPage(0);
  }, [searchParams]);

  const { data, isLoading, isError } = useProducts({
    page,
    size: 20,
    keyword: filters.keyword,
    categoryId: filters.categoryId,
    sort: filters.sort,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    rating: filters.rating,
  });

  const { data: sellerResults } = useSellerSearch(filters.keyword);

  const { isAuthenticated, user } = useAuthStore();
  const serverAddToCart = useAddToCart();
  const navigate = useNavigate();

  const handleAddToCart = useCallback(
    (product: Product) => {
      if (!isAuthenticated) {
        navigate('/login', { state: { from: '/products' } });
        return;
      }
      // Sản phẩm có biến thể bắt buộc chọn phân loại → chuyển sang trang chi tiết
      if ((product.variants?.length ?? 0) > 0) {
        navigate(`/products/${product.id}`);
        return;
      }
      serverAddToCart.mutate(
        {
          productId: product.id,
          name: product.name,
          image: product.images?.[0] || null,
          price: product.price,
          quantity: 1,
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
            list.push({
              productId: product.id,
              variantId: null,
            });
            localStorage.setItem(justAddedKey, JSON.stringify(list));
          },
        }
      );
    },
    [isAuthenticated, user, serverAddToCart, navigate]
  );

  const handleFilter = useCallback(
    (params: { keyword?: string; sort?: string }) => {
      setFilters((prev) => ({ ...prev, keyword: params.keyword, sort: params.sort }));
      setPage(0);
    },
    []
  );

  const handleCategoryChange = useCallback((id: string) => {
    setFilters((prev) => ({ ...prev, categoryId: id || undefined }));
    setPage(0);
  }, []);

  const handlePriceChange = useCallback((min?: number, max?: number) => {
    setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }));
    setPage(0);
  }, []);
  
  const handleRatingChange = useCallback((rating?: number) => {
    setFilters((prev) => ({ ...prev, rating }));
    setPage(0);
  }, []);

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Có lỗi xảy ra"
          description="Không thể tải danh sách sản phẩm. Vui lòng thử lại."
        />
      </div>
    );
  }

  const hasSellerResults = sellerResults && sellerResults.content.length > 0 && filters.keyword;

  return (
    <div className="container mx-auto px-4 py-6">
      {filters.keyword ? (
        <h1 className="mb-6 text-base text-gray-500">
          Kết quả tìm kiếm cho <span className="font-semibold text-secondary">"{filters.keyword}"</span>
        </h1>
      ) : (
        <h1 className="mb-6 text-2xl font-bold text-foreground">Sản phẩm</h1>
      )}

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <aside className="hidden w-52 flex-shrink-0 lg:block">
          <FilterSidebar
            categoryId={filters.categoryId}
            onCategoryChange={handleCategoryChange}
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onPriceChange={handlePriceChange}
            rating={filters.rating}
            onRatingChange={handleRatingChange}
          />
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Shop results section */}
          {hasSellerResults && (
            <div className="mb-6">
              <div className="mb-3">
                <span className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  Shop liên quan đến "{filters.keyword}"
                </span>
              </div>

              <div className="space-y-3">
                {sellerResults.content.map((seller) => (
                  <SellerSearchCard
                    key={seller.id}
                    sellerId={seller.id}
                    fullName={seller.fullName}
                    avatarUrl={seller.avatarUrl}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <ProductFilters onFilter={handleFilter} />
          </div>

          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : !data || data.content.length === 0 ? (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="Không tìm thấy sản phẩm"
              description="Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
            />
          ) : (
            <>
              <ProductGrid products={data.content} onAddToCart={handleAddToCart} />

              {data.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </button>

                  <span className="text-sm text-muted-foreground">
                    Trang {page + 1} / {data.totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={data.last}
                    className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
