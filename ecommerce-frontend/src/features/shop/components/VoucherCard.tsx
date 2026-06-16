import { Ticket } from 'lucide-react';
import type { Voucher } from '../types';
import { formatPrice } from '@/utils/format';

interface Props {
  voucher: Voucher;
  theme?: 'orange' | 'blue' | 'red' | 'indigo' | 'amber';
  onSave?: () => void;
  onUnsave?: () => void;
  loading?: boolean;
}

const themeConfig = {
  orange: { bgLeft: '#FFF7ED', icon: 'text-orange-500', text: 'text-orange-600', btn: 'bg-orange-500 hover:bg-orange-600' },
  blue: { bgLeft: '#EFF6FF', icon: 'text-blue-500', text: 'text-blue-600', btn: 'bg-blue-500 hover:bg-blue-600' },
  red: { bgLeft: '#FEF2F2', icon: 'text-red-500', text: 'text-red-600', btn: 'bg-red-500 hover:bg-red-600' },
  indigo: { bgLeft: '#EEF2FF', icon: 'text-indigo-500', text: 'text-indigo-600', btn: 'bg-indigo-500 hover:bg-indigo-600' },
  amber: { bgLeft: '#FFFBEB', icon: 'text-amber-500', text: 'text-amber-600', btn: 'bg-amber-500 hover:bg-amber-600' },
};

export default function VoucherCard({ voucher, theme = 'orange', onSave, onUnsave, loading }: Props) {
  const isPercent = voucher.discountType === 'PERCENT';
  const t = themeConfig[theme];

  return (
    <div className="relative flex w-full min-w-[320px] h-[110px] transition-transform hover:-translate-y-0.5 filter drop-shadow-[0_0_1px_rgba(0,0,0,0.2)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
      
      {/* Left Section (Yellowish) */}
      <div 
        className="w-[100px] flex flex-col items-center justify-center border-r border-dashed border-gray-200"
        style={{
          backgroundColor: t.bgLeft,
          maskImage: 'radial-gradient(circle at 0 50%, transparent 8px, black 9px)',
          WebkitMaskImage: 'radial-gradient(circle at 0 50%, transparent 8px, black 9px)'
        }}
      >
        <Ticket className={`w-7 h-7 mb-1 ${t.icon}`} />
        <span className={`text-[11px] font-bold ${t.text}`}>Săn Ngay</span>
      </div>

      {/* Middle Section (Details) */}
      <div className="flex flex-1 flex-col justify-center px-4 py-2 bg-white">
         <div className="font-bold text-slate-800 text-sm truncate mb-0.5">
           {voucher.title || 'Voucher Giảm Giá'}
         </div>
         <div className="text-xs text-slate-500 mb-1">
           Đơn tối thiểu {formatPrice(voucher.minOrderAmount || 0)}
         </div>
         <div className={`text-sm font-bold mb-2 ${t.icon}`}>
            {isPercent ? `Giảm ${voucher.discountValue}%` : `Giảm ${formatPrice(voucher.discountValue)}`}
            {isPercent && voucher.maxDiscount ? ` (Tối đa ${formatPrice(voucher.maxDiscount)})` : ''}
         </div>
         <div>
            <span className="inline-block px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 text-[10px] uppercase rounded">
              MÃ: {voucher.code}
            </span>
         </div>
      </div>

      {/* Right Section (Button) */}
      <div 
        className="w-[100px] flex items-center justify-center bg-white border-l border-dashed border-gray-100 relative"
        style={{
          maskImage: 'radial-gradient(circle at 100% 50%, transparent 8px, black 9px)',
          WebkitMaskImage: 'radial-gradient(circle at 100% 50%, transparent 8px, black 9px)'
        }}
      >
        {voucher.saved ? (
           <button 
             onClick={onUnsave} 
             disabled={loading} 
             className="px-4 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-full transition-colors hover:bg-slate-200"
           >
             Đã Lưu
           </button>
        ) : (
           <button 
             onClick={onSave} 
             disabled={loading} 
             className={`px-4 py-1.5 text-white text-xs font-bold rounded-full shadow-sm transition-colors disabled:opacity-50 ${t.btn}`}
           >
             Lưu
           </button>
        )}
      </div>
    </div>
  );
}
