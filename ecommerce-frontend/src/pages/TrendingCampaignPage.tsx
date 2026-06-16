import { Flame, TrendingUp, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductGrid from '@/features/product/components/ProductGrid';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useAllActiveVouchers, useSaveVoucher } from '@/features/shop/hooks/useShop';
import VoucherCard from '@/features/shop/components/VoucherCard';

// --- HELPER COMPONENTS ---

const HeaderTitle = ({ title, subtitle, icon: Icon }: { title: string, subtitle?: string, icon: any }) => (
  <div className="mb-10 text-center flex flex-col items-center">
    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-100 text-red-600 font-bold text-sm mb-4 border border-red-200">
      <Icon className="w-5 h-5" /> {title.toUpperCase()}
    </div>
    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
      {subtitle}
    </h2>
  </div>
);

const PremiumRankCard = ({ rank, product }: { rank: number, product: any }) => {
  const rankColors: Record<number, string> = {
    1: 'bg-red-500 text-white shadow-red-200',
    2: 'bg-orange-500 text-white shadow-orange-200',
    3: 'bg-amber-500 text-white shadow-amber-200',
  };
  const colorClass = rankColors[rank] || 'bg-slate-100 text-slate-600 shadow-slate-100';

  return (
    <div className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-red-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative cursor-pointer flex items-center gap-5">
      {/* Rank Badge */}
      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-md ${colorClass}`}>
        #{rank}
      </div>

      {/* Image */}
      <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative">
         <img 
            src={product.images?.[0] || "https://placehold.co/200x200?text=No+Image"} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
         />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-1">
         <h4 className="font-bold text-slate-800 text-base md:text-lg mb-2 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug">{product.name}</h4>
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-auto">
            <p className="text-red-600 font-bold text-lg md:text-xl tracking-tight">
               {(product.price || 0).toLocaleString()}đ
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 self-start sm:self-auto">
               <TrendingUp className="w-3.5 h-3.5 text-red-500" /> {(product.soldCount || 0).toLocaleString()} lượt mua
            </div>
         </div>
      </div>
    </div>
  );
};

export default function TrendingCampaignPage() {
  const { data: newProducts, isLoading } = useProducts({ size: 8, sort: 'newest' });
  const { data: topProducts } = useProducts({ size: 6, sort: 'sold' });
  const { data: activeVouchers, isLoading: loadingVouchers } = useAllActiveVouchers();
  const { mutate: saveVoucher, isPending } = useSaveVoucher();

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      
      {/* 1. Hero Section - Premium Modern */}
      <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 pt-20 pb-32 px-4 relative rounded-b-[3rem] shadow-sm border-b border-red-100 overflow-hidden">
         <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
            
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-100/60 text-red-700 font-bold text-sm mb-6 border border-red-200/50 backdrop-blur-sm">
               <Flame className="w-4 h-4" /> TRÀO LƯU MUA SẮM
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
              Bắt Trend <span className="text-red-600">Giá Sốc</span>
            </h1>
            
            <p className="text-slate-500 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              Khám phá ngay bảng xếp hạng những siêu phẩm đang "làm mưa làm gió". Hàng xịn, giá hời, chốt đơn ngay kẻo lỡ!
            </p>

            <button className="bg-slate-900 hover:bg-red-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-red-500/20 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 group">
               Khám phá Bảng Xếp Hạng <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        
        {/* 2. Hot Vouchers from Sellers */}
        <div className="mb-20">
           {loadingVouchers ? (
              <div className="text-center text-slate-500 py-10">Đang tải voucher...</div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {activeVouchers?.slice(0, 3).map((voucher) => (
                    <VoucherCard 
                      key={voucher.id} 
                      voucher={voucher} 
                      theme="red"
                      onSave={() => saveVoucher(voucher.id)}
                      loading={isPending}
                    />
                 ))}
                 {(!activeVouchers || activeVouchers.length === 0) && (
                    <div className="col-span-3 text-center text-slate-500">Hiện chưa có voucher nào.</div>
                 )}
              </div>
           )}
        </div>

        {/* 3. Trending Leaderboard - Premium Grid */}
        <div className="mb-20">
           <HeaderTitle title="Bảng Xếp Hạng" subtitle="Top Bán Chạy Nhất" icon={TrendingUp} />
           
           {!topProducts?.content || topProducts.content.length === 0 ? (
              <div className="text-center text-slate-500 py-10 bg-slate-50 rounded-[2rem] border border-slate-100">
                 Chưa có dữ liệu
              </div>
           ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                 {topProducts.content.map((product, index) => (
                    <PremiumRankCard key={product.id} rank={index + 1} product={product} />
                 ))}
              </div>
           )}
        </div>

        {/* 4. Products Recommend */}
        <div className="bg-slate-50 rounded-[2rem] p-6 md:p-10 shadow-sm border border-slate-100 mb-10">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
                <div>
                   <h3 className="font-bold text-2xl text-slate-800">Gợi ý sản phẩm</h3>
                   <p className="text-slate-500 text-sm">Dành riêng cho bạn</p>
                </div>
                <Link to="/products" className="text-red-600 text-sm font-bold flex items-center hover:bg-red-50 px-4 py-2 rounded-full transition-colors">
                    Xem thêm <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
            </div>
            {isLoading ? (
                <ProductGridSkeleton count={8} />
            ) : newProducts && newProducts.content.length > 0 ? (
                <ProductGrid products={newProducts.content.slice(0, 8)} />
            ) : null}
        </div>

      </div>
    </div>
  );
}
