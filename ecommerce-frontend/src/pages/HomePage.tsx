import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Wallet, Flame, ShieldCheck, Ticket, Gift, Clock, CreditCard, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useCategories } from '@/features/product/hooks/useCategories';
import ProductGrid from '@/features/product/components/ProductGrid';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import HeroCarousel from '@/features/ads/components/HeroCarousel';

const UTILITIES = [
  { icon: Ticket, label: 'Voucher Giảm 50%', color: 'text-orange-500', bg: 'bg-orange-100', path: '/campaigns/voucher' },
  { icon: Wallet, label: 'Thanh Toán Onl', color: 'text-blue-500', bg: 'bg-blue-100', path: '/campaigns/thanh-toan' },
  { icon: Flame, label: 'Bắt Trend Giá Sốc', color: 'text-red-500', bg: 'bg-red-100', path: '/campaigns/gia-soc' },
  { icon: ShieldCheck, label: 'Hàng Chính Hãng', color: 'text-indigo-500', bg: 'bg-indigo-100', path: '/campaigns/chinh-hang' },
  { icon: Clock, label: 'Giao Hàng Siêu Tốc', color: 'text-yellow-500', bg: 'bg-yellow-100', path: '/campaigns/sieu-toc' },
];

const CATS_PER_PAGE = 12;

export default function HomePage() {
  const { data: newProducts, isLoading } = useProducts({ size: 8, sort: 'newest' });
  const { data: categories } = useCategories();
  const [catPage, setCatPage] = useState(0);

  const totalCatPages = categories ? Math.ceil(categories.length / CATS_PER_PAGE) : 1;
  const visibleCats = categories?.slice(catPage * CATS_PER_PAGE, (catPage + 1) * CATS_PER_PAGE) ?? [];

  return (
    <div className="flex flex-col pb-24 bg-[#FAFAFA]">
      {/* Marketplace Hero Banner — carousel quảng cáo từ seller */}
      <HeroCarousel />

      {/* Utilities Icons Row (Marketplace Style) */}
      <section className="px-4 sm:px-6 lg:px-8 mt-10">
        <div className="mx-auto max-w-7xl bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between overflow-x-auto pb-4 md:pb-0 scrollbar-hide gap-4 w-full">
            {UTILITIES.map((u, i) => (
              <Link key={i} to={u.path || "/products"} className="flex flex-col items-center justify-center gap-3 group text-center flex-1 min-w-[80px]">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${u.bg} ${u.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <u.icon className="h-6 w-6 stroke-[2]" />
                </div>
                <span className="text-xs font-semibold text-secondary/80 leading-tight group-hover:text-primary transition-colors">{u.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Categories Grid */}
      {categories && categories.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 mt-10">
          <div className="mx-auto max-w-7xl">
            <div className="relative flex items-center gap-2">
              {/* Prev button */}
              <button
                onClick={() => setCatPage((p) => p - 1)}
                disabled={catPage === 0}
                className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Grid */}
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center p-5 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-secondary uppercase tracking-tight">Danh mục phổ biến</h2>
                  {totalCatPages > 1 && (
                    <span className="ml-auto text-xs text-gray-400">{catPage + 1} / {totalCatPages}</span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 border-l border-t border-gray-100">
                  {visibleCats.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/products?categoryId=${cat.id}`}
                      className="group relative flex flex-col items-center justify-center p-4 h-36 border-r border-b border-gray-100 bg-white hover:z-10 hover:shadow-[0_0_20px_rgba(0,0,0,0.08)] transition-all duration-300"
                    >
                      <div className="h-16 w-16 mb-3 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 group-hover:-translate-y-1 transition-transform duration-300">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" />
                        ) : (
                          <Tag className="h-7 w-7 text-primary" />
                        )}
                      </div>
                      <span className="text-xs text-center font-medium text-secondary/80 group-hover:text-primary transition-colors line-clamp-2 px-1">
                        {cat.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Next button */}
              <button
                onClick={() => setCatPage((p) => p + 1)}
                disabled={catPage >= totalCatPages - 1}
                className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Suggested Products (Marketplace Style) */}
      <section className="px-4 sm:px-6 lg:px-8 mt-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between border-b-2 border-primary pb-3">
            <h2 className="text-xl font-bold tracking-tight text-primary uppercase">Gợi Ý Hôm Nay</h2>
            <Link to="/products?sort=newest" className="text-sm font-semibold text-secondary hover:text-primary flex items-center gap-1 group transition-colors">
              Xem tất cả <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="mt-4">
            {isLoading ? (
              <ProductGridSkeleton count={8} />
            ) : newProducts && newProducts.content.length > 0 ? (
              <ProductGrid products={newProducts.content} />
            ) : (
              <div className="py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                Chưa có sản phẩm gợi ý nào.
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center border-t border-border pt-6">
            <Link
              to="/products"
              className="flex items-center gap-2 rounded-sm border border-primary/40 bg-white px-16 py-2.5 text-sm font-medium text-primary/80 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              Xem Thêm
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
