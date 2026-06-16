import { Clock, Zap, MapPin, CheckCircle2, ChevronRight, PackageCheck, Timer, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductGrid from '@/features/product/components/ProductGrid';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useAllActiveVouchers, useSaveVoucher } from '@/features/shop/hooks/useShop';
import VoucherCard from '@/features/shop/components/VoucherCard';

// --- HELPER COMPONENTS ---

const HeaderTitle = ({ title, subtitle, icon: Icon }: { title: string, subtitle?: string, icon: any }) => (
  <div className="mb-10 text-center flex flex-col items-center">
    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-50 text-amber-600 font-bold text-sm mb-4 border border-amber-100 shadow-sm uppercase tracking-widest">
      <Icon className="w-4 h-4" /> {title}
    </div>
    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
      {subtitle}
    </h2>
  </div>
);


export default function ExpressCampaignPage() {
  const { data: newProducts, isLoading } = useProducts({ size: 8, sort: 'newest' });
  const { data: activeVouchers, isLoading: loadingVouchers } = useAllActiveVouchers();
  const { mutate: saveVoucher, isPending } = useSaveVoucher();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* 1. Hero Section - Flat & Clean Pattern Theme */}
      <div className="bg-gradient-to-b from-amber-50 to-white pt-16 pb-32 px-4 relative rounded-b-[3rem] shadow-sm border-b border-amber-100 overflow-hidden">
         {/* Subtle dot pattern */}
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
         
         <div className="max-w-4xl mx-auto relative z-10 text-center">
            
            <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-amber-100 flex items-center justify-center mx-auto mb-8 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
               <Zap className="w-12 h-12 text-amber-500" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
               Giao Hàng <span className="text-amber-500">Siêu Tốc</span>
            </h1>
            
            <p className="text-slate-600 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
               Cần gấp? Có liền! Đặt hàng ngay để trải nghiệm tốc độ giao hàng 2H trong nội thành. Trễ hẹn đền bù voucher ngay lập tức.
            </p>

            <button className="bg-amber-500 hover:bg-amber-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 mx-auto flex items-center justify-center gap-2 group">
               Mua Ngay Nhận Liền <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        
        {/* 2. Fast Delivery Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
           <div className="bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all border border-slate-100 text-center group">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                 <PackageCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Đóng Gói Chớp Nhoáng</h3>
              <p className="text-slate-500 text-sm font-medium">Đơn hàng được ưu tiên xử lý và đóng gói ngay trong vòng 15 phút.</p>
           </div>
           <div className="bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all border border-slate-100 text-center group">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                 <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Theo Dõi Trực Tiếp</h3>
              <p className="text-slate-500 text-sm font-medium">Định vị Shipper theo thời gian thực. Biết chính xác vị trí gói hàng.</p>
           </div>
           <div className="bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all border border-slate-100 text-center group">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                 <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Cam Kết Thời Gian</h3>
              <p className="text-slate-500 text-sm font-medium">Giao đúng 2 tiếng trong nội thành. Trễ hẹn nhận Voucher đền bù.</p>
           </div>
        </div>

        {/* 3. Real Vouchers */}
        <div className="mb-20">
           <HeaderTitle title="Voucher Tốc Độ" subtitle="Săn mã Hỏa Tốc, chốt đơn tức thì" icon={Zap} />
           {loadingVouchers ? (
              <div className="text-center text-slate-500 py-10">Đang tải voucher...</div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {activeVouchers?.slice(0, 3).map((voucher) => (
                    <VoucherCard 
                      key={voucher.id} 
                      voucher={voucher} 
                      theme="amber"
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

        {/* 4. Products Recommend */}
        <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-slate-100 mb-10">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <div>
                   <h3 className="font-bold text-2xl text-slate-800 mb-1">Gợi ý sản phẩm</h3>
                   <p className="text-slate-500 text-sm">Dành riêng cho bạn</p>
                </div>
                <Link to="/products" className="text-amber-600 text-sm font-bold flex items-center hover:bg-amber-50 px-4 py-2 rounded-full transition-colors border border-amber-100">
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
