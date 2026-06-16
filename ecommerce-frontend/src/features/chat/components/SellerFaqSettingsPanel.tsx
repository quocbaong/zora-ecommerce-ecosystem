import { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp,
  MessageSquarePlus, Save, Loader2,
} from 'lucide-react';
import { useShopFaqs, useSaveShopFaqs } from '../hooks/useFaq';

interface SellerFaqSettingsPanelProps {
  sellerId: string;
  onClose: () => void;
}

interface EditableFaq {
  id?: string;
  question: string;
  answer: string;
  order: number;
  expanded: boolean;
}

const MAX_FAQS = 7;

export default function SellerFaqSettingsPanel({ sellerId, onClose }: SellerFaqSettingsPanelProps) {
  const { data: existingFaqs = [], isLoading } = useShopFaqs(sellerId);
  const { mutate: save, isPending: saving } = useSaveShopFaqs(sellerId);
  const [items, setItems] = useState<EditableFaq[]>([]);
  const [dirty, setDirty] = useState(false);
  const [triedSave, setTriedSave] = useState(false);

  // Câu hỏi đã nhập nhưng chưa có câu trả lời
  const missingAnswers = items
    .map((item, idx) => ({ idx, item }))
    .filter(({ item }) => item.question.trim() && !item.answer.trim());

  const canSave = dirty && missingAnswers.length === 0;

  // Sync from server on first load
  useEffect(() => {
    if (!isLoading) {
      setItems(
        existingFaqs.map((faq) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          order: faq.order,
          expanded: false,
        }))
      );
      setDirty(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const mark = useCallback(() => setDirty(true), []);

  const handleAdd = () => {
    if (items.length >= MAX_FAQS) return;
    setItems((prev) => [...prev, { question: '', answer: '', order: prev.length, expanded: true }]);
    mark();
  };

  const handleDelete = (idx: number) => {
    setItems((prev) =>
      prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i }))
    );
    mark();
  };

  const handleField = (idx: number, field: 'question' | 'answer', val: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
    mark();
  };

  // Khi blur khỏi ô câu hỏi mà chưa nhập câu trả lời → tự mở phần trả lời
  const handleQuestionBlur = (idx: number) => {
    const item = items[idx];
    if (item.question.trim() && !item.answer.trim() && !item.expanded) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, expanded: true } : it)));
    }
  };

  const toggleExpand = (idx: number) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, expanded: !item.expanded } : item)));

  const handleSave = () => {
    setTriedSave(true);

    // Tự mở rộng tất cả item thiếu câu trả lời
    if (missingAnswers.length > 0) {
      setItems((prev) =>
        prev.map((item, i) =>
          missingAnswers.some((m) => m.idx === i) ? { ...item, expanded: true } : item
        )
      );
      return;
    }

    const valid = items.filter((item) => item.question.trim() && item.answer.trim());
    save(
      { faqs: valid.map((item, i) => ({ id: item.id, question: item.question.trim(), answer: item.answer.trim(), order: i })) },
      { onSuccess: () => { setDirty(false); setTriedSave(false); } }
    );
  };

  return (
    <div className="absolute inset-0 bg-white z-20 flex flex-col rounded-r-none md:rounded-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-bold text-gray-900">Câu hỏi nhanh</h3>
          <span className="text-xs text-gray-400 font-medium">
            {items.length}/{MAX_FAQS}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Info banner */}
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
          <p className="text-xs text-orange-700 leading-relaxed">
            💡 Cài đặt tối đa <strong>7 câu hỏi</strong> thường gặp. Khi người mua nhắn tin lần
            đầu, họ thấy danh sách này và nhận câu trả lời <strong>tự động</strong>.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          </div>
        ) : (
          <>
            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Question row */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => handleField(idx, 'question', e.target.value)}
                    onBlur={() => handleQuestionBlur(idx)}
                    placeholder="Nhập câu hỏi..."
                    maxLength={100}
                    className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-400 min-w-0"
                  />
                  <button
                    onClick={() => toggleExpand(idx)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                    title={item.expanded ? 'Thu gọn' : 'Xem/sửa câu trả lời'}
                  >
                    {item.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    title="Xoá"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Answer — shown when expanded */}
                {item.expanded && (
                  <div className="px-3 py-2.5 border-t border-gray-100 bg-white">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">
                      Câu trả lời tự động
                      {item.question.trim() && !item.answer.trim() && (
                        <span className="ml-2 text-red-500 normal-case tracking-normal font-semibold">
                          ⚠ Bắt buộc nhập câu trả lời
                        </span>
                      )}
                    </label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => handleField(idx, 'answer', e.target.value)}
                      placeholder="Nhập câu trả lời sẽ được gửi tự động..."
                      maxLength={500}
                      rows={3}
                      className={`w-full text-sm text-gray-700 bg-gray-50 border rounded-lg px-3 py-2 outline-none focus:ring-2 resize-none placeholder:text-gray-400 transition-all ${
                        item.question.trim() && !item.answer.trim()
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-gray-200 focus:border-orange-300 focus:ring-orange-100'
                      }`}
                    />
                    <p className="text-[10px] text-gray-300 text-right mt-0.5">
                      {item.answer.length}/500
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Add button */}
            {items.length < MAX_FAQS && (
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                Thêm câu hỏi ({items.length}/{MAX_FAQS})
              </button>
            )}

            {items.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                Chưa có câu hỏi nào. Nhấn &quot;Thêm câu hỏi&quot; để bắt đầu.
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 shrink-0 space-y-2">
        {/* Cảnh báo khi có câu hỏi chưa có câu trả lời */}
        {triedSave && missingAnswers.length > 0 && (
          <p className="text-xs text-red-500 text-center font-medium">
            ⚠ Vui lòng nhập câu trả lời cho{' '}
            {missingAnswers.length === 1
              ? `câu hỏi số ${missingAnswers[0].idx + 1}`
              : `${missingAnswers.length} câu hỏi còn thiếu`}{' '}
            trước khi lưu.
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || (dirty && !canSave && missingAnswers.length === 0) || !dirty}
          title={
            missingAnswers.length > 0
              ? 'Vui lòng nhập câu trả lời cho tất cả câu hỏi trước khi lưu'
              : ''
          }
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98]"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>
  );
}
