import { useState } from 'react';
import { Ticket, ChevronRight, Gift, ArrowRight, Loader2, ShoppingBag, Package, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductGrid from '@/features/product/components/ProductGrid';
import { ProductGridSkeleton } from '@/features/product/components/ProductSkeleton';
import { useProducts } from '@/features/product/hooks/useProducts';
import { useAllActiveVouchers, useSaveVoucher } from '@/features/shop/hooks/useShop';

// --- HELPER COMPONENTS ---

const SectionHeader = ({ title, highlight }: { title: string, highlight?: string }) => (
  <div className="relative mx-auto mt-12 mb-8 flex justify-center max-w-[90%] md:max-w-xl">
    <div className="bg-gradient-to-r from-[#ee4d2d] via-[#ff6a3c] to-[#ff9844] border-2 border-yellow-300 rounded-xl py-3 px-8 md:px-12 shadow-[0_6px_15px_rgba(238,77,45,0.4)] relative w-full text-center">
      {/* 3D Box Decorations */}
      <div className="absolute -left-4 -top-6 bg-yellow-400 p-2 rounded-lg shadow-lg rotate-[-15deg] border border-yellow-200">
        <Package className="w-8 h-8 text-yellow-900" />
      </div>
      <div className="absolute -right-4 -top-6 bg-yellow-400 p-2 rounded-lg shadow-lg rotate-[15deg] border border-yellow-200">
        <Package className="w-8 h-8 text-yellow-900" />
      </div>
      
      <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex flex-wrap justify-center items-center gap-2">
        {title}
        {highlight && <span className="text-[#ffdb73] text-3xl md:text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{highlight}</span>}
      </h2>
    </div>
  </div>
);

const PromoVoucherCard = ({ voucher, onSave, saving }: { voucher: any, onSave: any, saving: boolean }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow flex overflow-hidden border border-gray-100 relative h-32">
      {/* Left edge dent & "Săn Ngay" */}
      <div className="bg-[#fff7e6] w-[100px] flex-shrink-0 flex flex-col items-center justify-center border-r border-dashed border-gray-200 relative">
        <div className="w-5 h-5 bg-[#F5F5F5] rounded-full absolute -left-2.5 top-1/2 -translate-y-1/2 z-10"></div>
        <Ticket className="w-8 h-8 text-[#ee4d2d] mb-1" />
        <span className="text-xs font-bold text-[#ee4d2d]">Săn Ngay</span>
      </div>
      
      {/* Middle Content */}
      <div className="p-4 flex-1 flex flex-col justify-center relative bg-white">
        <h3 className="font-bold text-gray-800 text-base leading-tight mb-1 line-clamp-1">{voucher.title || 'Voucher Giảm Giá'}</h3>
        <p className="text-xs text-gray-500 mb-1">
          Đơn tối thiểu {voucher.minOrderAmount ? voucher.minOrderAmount.toLocaleString() + 'đ' : '0đ'}
        </p>
        <p className="text-xs text-[#ee4d2d] mb-2 font-medium">
          {voucher.discountType === 'PERCENT' ? `Giảm ${voucher.discountValue}%` : `Giảm ${voucher.discountValue?.toLocaleString() || 0}đ`}
          {voucher.discountType === 'PERCENT' && voucher.maxDiscount && ` (Tối đa ${voucher.maxDiscount.toLocaleString()}đ)`}
        </p>
        <div className="text-[11px] font-mono bg-gray-50 px-2 py-1 rounded inline-block w-fit text-gray-500 border border-gray-100 uppercase tracking-wider">
          Mã: {voucher.code || 'MÃ ĐỘC QUYỀN'}
        </div>
      </div>
      
      {/* Save Button Area */}
      <div className="w-[100px] flex-shrink-0 flex items-center justify-center p-3 border-l border-dashed border-gray-200 relative bg-white">
        <div className="w-5 h-5 bg-[#F5F5F5] rounded-full absolute -right-2.5 top-1/2 -translate-y-1/2 border border-l-gray-200 border-t-transparent border-r-transparent border-b-transparent transform rotate-45 opacity-0"></div>
        <div className="w-5 h-5 bg-[#F5F5F5] rounded-full absolute -right-2.5 top-1/2 -translate-y-1/2 z-10"></div>
        <button
          onClick={() => onSave(voucher.id)}
          disabled={voucher.saved || saving}
          className={`w-16 py-2 rounded-full text-xs font-bold transition-colors z-10 ${
            voucher.saved 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-[#ee4d2d] text-white hover:bg-[#d73f22] shadow-sm active:scale-95'
          }`}
        >
          {voucher.saved ? 'Đã Lưu' : 'Lưu'}
        </button>
      </div>
    </div>
  );
};

export default function CampaignPage() {
  const [activeTab, setActiveTab] = useState(0);

  
  const { data: newProducts, isLoading } = useProducts({ size: 8, sort: 'newest' });
  const { data: activeVouchers, isLoading: loadingVouchers } = useAllActiveVouchers();
  const { mutate: saveVoucher, isPending: savingVoucher } = useSaveVoucher();

  // Chia nửa số voucher cho 2 section để hiển thị được hết toàn bộ
  const mid = activeVouchers ? Math.ceil(activeVouchers.length / 2) : 0;
  const section1Vouchers = activeVouchers ? activeVouchers.slice(0, mid) : [];
  const section2Vouchers = activeVouchers ? activeVouchers.slice(mid) : [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20 font-sans">
      
      {/* Hero Banner Section (Poster Style) */}
      <div className="relative pt-8 pb-12 px-4 text-center text-white flex flex-col items-center justify-center overflow-hidden border-b-4 border-yellow-400 min-h-[220px] mb-8">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ee4d2d] via-[#ff6a3c] to-[#ff9844] z-0"></div>
        
        {/* Decorative Circles & Glows */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 z-0"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-300 opacity-20 rounded-full blur-2xl translate-x-1/3 translate-y-1/3 z-0"></div>

        {/* Floating Decorative Icons */}
        <div className="absolute top-4 left-6 md:left-16 opacity-40 animate-bounce" style={{ animationDuration: '3s' }}><Gift className="w-12 h-12 text-yellow-200 rotate-12" /></div>
        <div className="absolute bottom-6 right-6 md:right-20 opacity-40 animate-bounce" style={{ animationDuration: '4s' }}><Ticket className="w-16 h-16 text-white -rotate-12" /></div>
        <div className="absolute top-8 right-12 md:right-32 opacity-30 animate-pulse"><ShoppingBag className="w-10 h-10 text-yellow-100 rotate-45" /></div>
        
        {/* Poster Content */}
        <div className="relative z-10 flex flex-col items-center">
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-2 uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-100 to-yellow-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] filter" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)' }}>
            Siêu Hội Voucher
          </h1>
          
          <p className="text-white font-bold mb-6 relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] text-base sm:text-lg max-w-xl px-4 leading-snug">
            Săn mã giảm giá cực khủng, <span className="text-yellow-300">mua sắm thả ga không lo về giá!</span>
          </p>
          
          <button 
            onClick={() => window.scrollTo({ top: 500, behavior: 'smooth' })}
            className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-[#ee4d2d] px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base font-black shadow-[0_6px_15px_rgba(238,77,45,0.4)] hover:shadow-[0_8px_20px_rgba(238,77,45,0.6)] hover:-translate-y-1 hover:scale-105 transition-all duration-300 uppercase tracking-wide flex items-center gap-2 group border-b-2 border-yellow-500 active:translate-y-0 active:border-b-0"
          >
            <Ticket className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-transform" /> Săn Ngay Kẻo Lỡ
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2 md:px-4">
        
        {/* SECTION 1: DEAL SỐC CÙNG VOUCHER 30% */}
        <SectionHeader title="DEAL SỐC CÙNG VOUCHER" highlight="30%" />
        
        {loadingVouchers ? (
          <div className="flex justify-center py-10"><Loader2 className="w-10 h-10 text-white animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {section1Vouchers.map((v, i) => (
              <PromoVoucherCard key={v.id} voucher={v} onSave={saveVoucher} saving={savingVoucher} />
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl p-3 md:p-4 mb-10 shadow-lg">
           <div className="flex justify-end mb-3">
               <Link to="/products" className="text-red-500 text-xs font-bold flex items-center cursor-pointer hover:underline">Xem tất cả <ChevronRight className="w-4 h-4" /></Link>
           </div>
           {isLoading ? (
             <ProductGridSkeleton count={4} />
           ) : newProducts && newProducts.content.length > 0 ? (
             <ProductGrid products={newProducts.content.slice(0, 4)} />
           ) : null}
        </div>

        {/* SECTION 2: THƯƠNG HIỆU XỊN DEAL ĐỘC QUYỀN */}
        <SectionHeader title="THƯƠNG HIỆU XỊN, DEAL ĐỘC QUYỀN GIẢM ĐẾN" highlight="20%" />
        
        {!loadingVouchers && section2Vouchers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {section2Vouchers.map((v, i) => (
              <PromoVoucherCard key={v.id} voucher={v} onSave={saveVoucher} saving={savingVoucher} />
            ))}
          </div>
        )}

        {/* TOP THƯƠNG HIỆU NỔI BẬT */}
        <div className="bg-gradient-to-br from-[#ee4d2d] to-[#ff9844] border border-yellow-300 rounded-xl p-4 md:p-6 mb-10 shadow-lg relative">
            <div className="flex justify-center items-center gap-2 mb-6">
                <Star className="w-4 h-4 text-[#ffdb73] fill-[#ffdb73]" />
                <h3 className="text-[#ffdb73] font-black text-lg md:text-xl uppercase tracking-widest text-center">
                    Top Thương Hiệu Nổi Bật
                </h3>
                <Star className="w-4 h-4 text-[#ffdb73] fill-[#ffdb73]" />
            </div>
            
            {/* Real Brand Logos Grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
                {[
                  { name: 'SAMSUNG', logo: '/images/brands/samsung.svg' },
                  { name: 'LANEIGE', logo: '/images/brands/laneige.svg' },
                  { name: 'MAYBELLINE', logo: '/images/brands/maybelline.svg' },
                  { name: 'SUNHOUSE', logo: '/images/brands/sunhouse.svg' },
                  { name: 'KANGAROO', logo: '/images/brands/kangaroo.svg' },
                  { name: 'LOCK&LOCK', logo: '/images/brands/locknlock.svg' },
                ].map((brand, i) => (
                    <div key={i} className="aspect-square bg-white rounded-lg flex items-center justify-center p-2 md:p-4 shadow-sm hover:scale-105 transition-transform cursor-pointer border border-gray-100">
                        <img 
                            src={brand.logo} 
                            alt={brand.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const span = document.createElement('span');
                                span.className = 'text-gray-800 text-[10px] md:text-sm font-black truncate text-center';
                                span.innerText = brand.name;
                                e.currentTarget.parentElement?.appendChild(span);
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="text-center mt-6">
                <span className="text-[#ffdb73] text-sm md:text-base font-bold uppercase tracking-wider">SĂN NGAY DEAL XỊN, GIÁ SỐC</span>
            </div>
        </div>

        {/* SECTION 3: SĂN DEAL TUYỂN CHỌN */}
        <SectionHeader title="SĂN DEAL TUYỂN CHỌN, ĐA DẠNG NGÀNH HÀNG" />
        
        <div className="bg-white rounded-xl p-3 md:p-4 mb-10 shadow-lg">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4 overflow-x-auto hide-scrollbar">
                {[
                  { label: '🔥 Top seller', hiddenMobile: false },
                  { label: '🌟 Đánh giá 5 sao', hiddenMobile: false },
                  { label: '👕 Thời trang', hiddenMobile: false },
                  { label: '💻 Điện tử', hiddenMobile: true },
                ].map((tab, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`flex-1 py-3 font-bold text-sm md:text-base whitespace-nowrap px-4 text-center transition-colors ${
                      activeTab === idx 
                        ? 'text-[#ee4d2d] border-b-2 border-[#ee4d2d]' 
                        : 'text-gray-500 hover:text-[#ee4d2d]'
                    } ${tab.hiddenMobile ? 'hidden md:block' : ''}`}
                  >
                      {tab.label}
                  </button>
                ))}
            </div>
            <div className="flex justify-end mb-3">
               <Link to="/products" className="text-red-500 text-xs font-bold flex items-center cursor-pointer hover:underline">Xem tất cả <ChevronRight className="w-4 h-4" /></Link>
           </div>
           {isLoading ? (
             <ProductGridSkeleton count={4} />
           ) : newProducts && newProducts.content.length > 0 ? (
             <ProductGrid products={newProducts.content.slice(activeTab * 2, activeTab * 2 + 4)} />
           ) : null}
        </div>



      </div>
    </div>
  );
}
