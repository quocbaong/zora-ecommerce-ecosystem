import { Wallet, Smartphone, ShieldCheck, ChevronRight, Zap, ArrowRight, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductGrid from '@/features/product/components/ProductGrid';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useAllActiveVouchers, useSaveVoucher } from '@/features/shop/hooks/useShop';
import VoucherCard from '@/features/shop/components/VoucherCard';

// --- HELPER COMPONENTS ---
const HeaderTitle = ({ title, subtitle, icon: Icon }: { title: string, subtitle?: string, icon: any }) => (
  <div className="mb-10 text-center flex flex-col items-center">
    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mb-4 border border-blue-200">
      <Icon className="w-5 h-5" /> {title.toUpperCase()}
    </div>
    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
      {subtitle}
    </h2>
  </div>
);


export default function PaymentCampaignPage() {
  const { data: newProducts, isLoading } = useProducts({ size: 8, sort: 'newest' });
  const { data: activeVouchers, isLoading: loadingVouchers } = useAllActiveVouchers();
  const { mutate: saveVoucher, isPending } = useSaveVoucher();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* 1. Hero Section - Flat & Clean with subtle pattern */}
      <div className="bg-gradient-to-b from-blue-50 to-white pt-16 pb-32 px-4 relative rounded-b-[3rem] shadow-sm border-b border-blue-100 overflow-hidden">
         {/* Subtle dot pattern */}
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
         
         <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center mx-auto mb-8 rotate-3 hover:rotate-0 transition-transform duration-300">
               <Wallet className="w-10 h-10 text-blue-600" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              Đại Tiệc <span className="text-blue-600">Thanh Toán</span>
            </h1>
            
            <p className="text-slate-500 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              Chạm là thanh toán. Liên kết tài khoản ngân hàng hoặc ví điện tử để nhận hàng ngàn ưu đãi độc quyền lên đến 500K.
            </p>

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-bold text-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 mx-auto flex items-center gap-2 group">
               Mở Ví Nhận Quà <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        
        {/* 2. Process Flow Timeline */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 md:p-12 mb-20 relative overflow-hidden">
           {/* Background decorative blob */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
           
           <div className="flex flex-col md:flex-row items-start justify-between relative gap-10 md:gap-4 z-10">
              
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-[2px] bg-transparent border-t-2 border-dashed border-blue-200 z-0"></div>
              {/* Connecting Line (Mobile) */}
              <div className="block md:hidden absolute top-10 bottom-10 left-10 w-[2px] bg-transparent border-l-2 border-dashed border-blue-200 z-0"></div>

              {/* Step 1 */}
              <div className="group relative z-10 flex flex-row md:flex-col items-center text-left md:text-center flex-1 gap-6 md:gap-0 w-full">
                 <div className="w-20 h-20 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center md:mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm border-4 border-white relative">
                    <Smartphone className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 md:mb-3 group-hover:text-blue-700 transition-colors">1. Chọn phương thức</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">Thêm thẻ tín dụng hoặc liên kết ví điện tử vào tài khoản.</p>
                 </div>
              </div>

              {/* Step 2 */}
              <div className="group relative z-10 flex flex-row md:flex-col items-center text-left md:text-center flex-1 gap-6 md:gap-0 w-full">
                 <div className="w-20 h-20 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center md:mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm border-4 border-white relative">
                    <ShieldCheck className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 md:mb-3 group-hover:text-blue-700 transition-colors">2. Xác thực an toàn</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">Hệ thống bảo mật đa tầng mã hóa thông tin tuyệt đối.</p>
                 </div>
              </div>

              {/* Step 3 */}
              <div className="group relative z-10 flex flex-row md:flex-col items-center text-left md:text-center flex-1 gap-6 md:gap-0 w-full">
                 <div className="w-20 h-20 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center md:mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm border-4 border-white relative">
                    <Gift className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 md:mb-3 group-hover:text-blue-700 transition-colors">3. Thanh toán & Quà</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">Hoàn tất đơn hàng cực nhanh và tự động áp dụng ưu đãi.</p>
                 </div>
              </div>

           </div>
        </div>

        {/* 3. Real Vouchers */}
        <div className="mb-20">
           <HeaderTitle title="Voucher Nổi Bật" subtitle="Ưu đãi từ các nhà bán hàng" icon={Zap} />
           {loadingVouchers ? (
              <div className="text-center text-slate-500 py-10">Đang tải voucher...</div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {activeVouchers?.slice(0, 3).map((voucher) => (
                    <VoucherCard 
                      key={voucher.id} 
                      voucher={voucher} 
                      theme="blue"
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

        {/* 4. Products */}
        <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-slate-100 mb-10">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <div>
                   <h3 className="font-bold text-2xl text-slate-800">Gợi ý sản phẩm</h3>
                   <p className="text-slate-500 text-sm">Dành riêng cho bạn</p>
                </div>
                <Link to="/products" className="text-blue-600 text-sm font-bold flex items-center hover:bg-blue-50 px-4 py-2 rounded-full transition-colors">
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
