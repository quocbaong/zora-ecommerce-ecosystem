import { ShieldCheck, Award, Crown, CheckCircle2, ChevronRight, Star, ArrowRight, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductGrid from '@/features/product/components/ProductGrid';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useAllActiveVouchers, useSaveVoucher } from '@/features/shop/hooks/useShop';
import VoucherCard from '@/features/shop/components/VoucherCard';

// --- HELPER COMPONENTS ---

const SectionHeading = ({ title, subtitle, icon: Icon }: { title: string, subtitle?: string, icon: any }) => (
  <div className="mb-10 text-center flex flex-col items-center">
    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm mb-4 border border-indigo-200">
      <Icon className="w-4 h-4" /> ĐỘC QUYỀN
    </div>
    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
      {title}
    </h2>
    {subtitle && <p className="text-slate-500 mt-2 md:text-lg max-w-2xl">{subtitle}</p>}
  </div>
);

const PremiumBrandCard = ({ brand, logoUrl, logoText, cover, color }: { brand: string, logoUrl?: string, logoText: string, cover: string, color: string }) => (
  <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 group cursor-pointer hover:-translate-y-2">
     <div className="h-32 w-full overflow-hidden relative">
        <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors z-10"></div>
        <img src={cover} alt={brand} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
     </div>
     <div className="p-6 text-center -mt-10 relative z-20">
        <div className="w-20 h-20 mx-auto bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center mb-4 transition-transform duration-500 group-hover:-translate-y-2 p-3">
           {logoUrl ? (
              <img src={logoUrl} alt={brand} className="w-full h-full object-contain" />
           ) : (
              <div className={`w-16 h-16 flex items-center justify-center font-black tracking-widest text-white rounded-xl ${color} text-sm`}>
                 {logoText}
              </div>
           )}
        </div>
        <h3 className="font-black text-xl text-slate-800 mb-2">{brand}</h3>
        <p className="text-xs text-slate-500 mb-5 font-medium tracking-wide uppercase">Gian hàng chính hãng</p>
        <button className="text-slate-900 font-bold text-sm flex items-center justify-center mx-auto hover:text-indigo-600 transition-colors group/btn bg-slate-50 hover:bg-indigo-50 px-5 py-2.5 rounded-full">
           Khám phá <ArrowRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
        </button>
     </div>
  </div>
);

export default function AuthenticCampaignPage() {
  const { data: newProducts, isLoading } = useProducts({ size: 12, sort: 'newest' });
  const { data: activeVouchers, isLoading: loadingVouchers } = useAllActiveVouchers();
  const { mutate: saveVoucher, isPending } = useSaveVoucher();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* 1. Hero Section - Flat & Clean Pattern Theme */}
      <div className="bg-gradient-to-b from-indigo-50 to-white pt-16 pb-32 px-4 relative rounded-b-[3rem] shadow-sm border-b border-indigo-100 overflow-hidden">
         {/* Subtle dot pattern */}
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
         
         <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 pt-10 pb-10">
            
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
               <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-indigo-700 font-bold text-sm mb-6 border border-indigo-100 shadow-sm">
                  <Crown className="w-4 h-4 text-amber-500" /> MALL CHÍNH HÃNG
               </div>

               <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
                  Chuẩn Mực <br className="hidden lg:block"/>
                  <span className="text-indigo-600">Hàng Hiệu</span>
               </h1>
               
               <p className="text-slate-600 text-lg md:text-xl font-medium max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                  Trải nghiệm mua sắm đẳng cấp với các thương hiệu quốc tế. Cam kết 100% chính hãng, đền bù 200% nếu phát hiện hàng giả.
               </p>

               <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-full font-bold text-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 mx-auto lg:mx-0 flex items-center gap-2 group">
                  Khám Phá Gian Hàng <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>

            {/* Right Content - Clean Bento Box */}
            <div className="flex-1 w-full max-w-lg hidden md:block z-10 relative">
               {/* Decorative blob */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0"></div>
               
               <div className="grid grid-cols-2 gap-4 relative z-10 transform rotate-[-3deg] hover:rotate-0 transition-transform duration-700">
                  <div className="flex flex-col gap-4 translate-y-8">
                     <div className="bg-white aspect-square rounded-[2rem] border border-slate-100 flex items-center justify-center p-8 shadow-sm hover:shadow-md group cursor-pointer transition-all">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                     </div>
                     <div className="bg-white aspect-[4/3] rounded-[2rem] border border-slate-100 flex items-center justify-center p-8 shadow-sm hover:shadow-md group cursor-pointer transition-all">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg" alt="Sony" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                     </div>
                  </div>
                  <div className="flex flex-col gap-4 -translate-y-4">
                     <div className="bg-white aspect-[4/3] rounded-[2rem] border border-slate-100 flex items-center justify-center p-8 shadow-sm hover:shadow-md group cursor-pointer transition-all">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" alt="Nike" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                     </div>
                     <div className="bg-white aspect-square rounded-[2rem] border border-slate-100 flex items-center justify-center p-8 shadow-sm hover:shadow-md group cursor-pointer transition-all">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a8/Dior_Logo.svg" alt="Dior" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        
        {/* 2. Trust Badges - Horizontal Display */}
        <div className="bg-white rounded-[2rem] p-4 shadow-sm mb-20 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 border border-slate-100">
              <div className="flex-1 flex items-center gap-5 p-6 hover:bg-slate-50 transition-colors rounded-t-[1.5rem] md:rounded-l-[1.5rem] md:rounded-tr-none">
                 <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Shield className="w-7 h-7 text-indigo-600" />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">100% Chính Hãng</h3>
                    <p className="text-slate-500 text-sm font-medium">Đền bù 200% nếu phát hiện giả.</p>
                 </div>
              </div>
              <div className="flex-1 flex items-center gap-5 p-6 hover:bg-slate-50 transition-colors">
                 <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-amber-600" />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">Đổi Trả Dễ Dàng</h3>
                    <p className="text-slate-500 text-sm font-medium">Miễn phí đổi trả trong 30 ngày đầu.</p>
                 </div>
              </div>
              <div className="flex-1 flex items-center gap-5 p-6 hover:bg-slate-50 transition-colors rounded-b-[1.5rem] md:rounded-r-[1.5rem] md:rounded-bl-none">
                 <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <Crown className="w-7 h-7 text-blue-600" />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">Bảo Hành Toàn Cầu</h3>
                    <p className="text-slate-500 text-sm font-medium">Chính sách bảo hành trực tiếp từ hãng.</p>
                 </div>
              </div>
        </div>

        {/* 3. Premium Brands */}
        <div className="mb-20">
           <SectionHeading title="Thương Hiệu Đỉnh Cao" subtitle="Tuyển tập những gian hàng chính hãng được yêu thích nhất" icon={Star} />
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <PremiumBrandCard 
                brand="APPLE" logoText="APPL" logoUrl="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" color="bg-slate-900" 
                cover="https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
              />
              <PremiumBrandCard 
                brand="SONY" logoText="SONY" logoUrl="https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg" color="bg-blue-600" 
                cover="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
              />
              <PremiumBrandCard 
                brand="NIKE" logoText="NIKE" logoUrl="https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" color="bg-orange-600" 
                cover="https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
              />
              <PremiumBrandCard 
                brand="DIOR" logoText="DIOR" logoUrl="https://upload.wikimedia.org/wikipedia/commons/a/a8/Dior_Logo.svg" color="bg-slate-800" 
                cover="https://images.unsplash.com/photo-1590736969955-71cc94801759?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
              />
           </div>
        </div>

        {/* 4. Real Seller Vouchers */}
        <div className="mb-20">
           <div className="flex justify-between items-end mb-8">
              <div>
                 <h2 className="text-2xl font-black text-slate-800 mb-2">Ưu Đãi Từ Cửa Hàng</h2>
                 <p className="text-slate-500">Mã giảm giá trực tiếp từ các gian hàng uy tín</p>
              </div>
           </div>
           
           {loadingVouchers ? (
              <div className="text-center text-slate-500 py-10">Đang tải voucher...</div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {activeVouchers?.slice(0, 3).map((voucher) => (
                    <VoucherCard 
                      key={voucher.id} 
                      voucher={voucher} 
                      theme="indigo"
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

        {/* 5. Products Recommend */}
        <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-slate-100 mb-10">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                <div>
                    <h3 className="font-bold text-2xl text-slate-800 mb-1">Gợi ý sản phẩm</h3>
                    <p className="text-slate-500 text-sm">Dành riêng cho bạn</p>
                </div>
                <Link to="/products" className="text-indigo-600 text-sm font-bold flex items-center hover:bg-indigo-50 px-4 py-2 rounded-full transition-colors border border-indigo-100">
                    Xem thêm <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
            </div>
            {isLoading ? (
                <ProductGridSkeleton count={8} />
            ) : newProducts && newProducts.content.length > 0 ? (
                <ProductGrid products={newProducts.content.slice(0, 12)} />
            ) : null}
        </div>

      </div>
    </div>
  );
}
