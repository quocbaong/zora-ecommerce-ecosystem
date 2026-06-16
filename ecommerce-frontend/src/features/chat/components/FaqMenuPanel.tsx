
import { MessageSquare, HelpCircle, Loader2 } from 'lucide-react';
import type { ShopFaq } from '../types';

interface FaqMenuPanelProps {
  faqs: ShopFaq[];
  onSelect: (faq: ShopFaq) => void;
  shopName?: string;
  isLoading?: boolean;
  /** compact: renders as a row of pill buttons (used above input when chat has msgs) */
  compact?: boolean;
}

export default function FaqMenuPanel({
  faqs,
  onSelect,
  shopName,
  isLoading,
  compact = false,
}: FaqMenuPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (!faqs.length) return null;

  if (compact) {
    // Pill buttons row — shown above ChatInput after messages exist
    return (
      <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2">
        {faqs.map((faq) => (
          <button
            key={faq.id}
            onClick={() => onSelect(faq)}
            className="px-3 py-1.5 bg-white border border-orange-200 rounded-full text-xs font-medium text-orange-700 hover:bg-orange-50 hover:border-orange-400 active:scale-95 transition-all shadow-sm"
          >
            {faq.question}
          </button>
        ))}
      </div>
    );
  }

  // Full panel — shown centered in empty messages area
  return (
    <div className="flex flex-col items-center py-8 px-6 gap-5 w-full max-w-md mx-auto">
      {/* Greeting header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-sm">
          <MessageSquare className="w-8 h-8 text-orange-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">Xin chào! Bạn cần hỗ trợ gì?</p>
          {shopName && (
            <p className="text-xs text-gray-400 mt-0.5">
              {shopName} luôn sẵn sàng giúp bạn
            </p>
          )}
        </div>
      </div>

      {/* FAQ buttons */}
      <div className="flex flex-col gap-2 w-full">
        {faqs.map((faq) => (
          <button
            key={faq.id}
            onClick={() => onSelect(faq)}
            className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-orange-100 rounded-2xl text-sm font-medium text-gray-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.98] transition-all text-left group shadow-sm"
          >
            <HelpCircle className="w-4 h-4 shrink-0 text-orange-300 group-hover:text-orange-500 transition-colors" />
            <span className="flex-1">{faq.question}</span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-gray-300 text-center">
        Chọn câu hỏi hoặc nhập trực tiếp bên dưới
      </p>
    </div>
  );
}
