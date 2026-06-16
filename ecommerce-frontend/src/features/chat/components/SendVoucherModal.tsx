import React, { useState } from 'react';
import { X, Ticket, Loader2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useSellerVouchers, useCreatePrivateVoucher } from '@/features/shop/hooks/useShop';
import NumberInput from '@/components/common/NumberInput';
import { formatPrice } from '@/utils/format';
import type { Voucher, VoucherRequest, VoucherDiscountType } from '@/features/shop/types';

interface Props {
  targetUserId: string;
  onSend: (voucherId: string) => void;
  onClose: () => void;
}

type Tab = 'existing' | 'create';

const initialForm: VoucherRequest = {
  code: '',
  title: '',
  discountType: 'PERCENT',
  discountValue: 10,
  minOrderAmount: 0,
  expiresAt: undefined,
};

const SendVoucherModal: React.FC<Props> = ({ targetUserId, onSend, onClose }) => {
  const [tab, setTab] = useState<Tab>('existing');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherRequest>(initialForm);
  const [sending, setSending] = useState(false);

  const { data: existingVouchers = [], isLoading } = useSellerVouchers();
  const createPrivate = useCreatePrivateVoucher();

  // Chỉ liệt kê voucher public (không phải private gửi cho user khác)
  const pickableVouchers = existingVouchers.filter((v) => !v.targetUserId && v.active);

  const handlePickExisting = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      onSend(selected);
      onClose();
    } finally {
      setSending(false);
    }
  };

  const handleCreateAndSend = async () => {
    if (sending) return;
    if (!form.code.trim()) { toast.error('Vui lòng nhập mã code'); return; }
    if (!form.discountValue || form.discountValue <= 0) { toast.error('Giá trị giảm phải > 0'); return; }
    if (form.discountType === 'PERCENT' && form.discountValue > 100) { toast.error('Phần trăm không quá 100'); return; }
    setSending(true);
    try {
      const voucher = await createPrivate.mutateAsync({ ...form, targetUserId });
      onSend(voucher.id);
      onClose();
    } catch {
      toast.error('Không thể tạo voucher');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Gửi voucher</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('existing')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'existing' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Voucher có sẵn
          </button>
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'create' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tạo mới riêng cho user này
          </button>
        </div>

        {/* Tab body */}
        {tab === 'existing' ? (
          <div className="overflow-y-auto max-h-80 px-5 py-3">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-orange-400 animate-spin" /></div>
            ) : pickableVouchers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có voucher nào. Tạo mới ở tab bên kia nhé.</p>
            ) : (
              pickableVouchers.map((v) => (
                <VoucherRow key={v.id} voucher={v} isSelected={selected === v.id} onSelect={() => setSelected(selected === v.id ? null : v.id)} />
              ))
            )}
          </div>
        ) : (
          <div className="px-5 py-3 space-y-3 max-h-80 overflow-y-auto">
            <p className="text-xs text-gray-500">
              Voucher private — chỉ user nhận trong cuộc trò chuyện này thấy và dùng được.
            </p>
            <div>
              <label className="text-xs text-gray-600">Mã code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="VD: VIP10"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Tiêu đề (tuỳ chọn)</label>
              <input
                type="text"
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Quà tặng cho khách hàng thân thiết"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Loại giảm</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as VoucherDiscountType })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                >
                  <option value="PERCENT">Phần trăm (%)</option>
                  <option value="FIXED">Số tiền (₫)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Giá trị giảm</label>
                <NumberInput
                  value={form.discountValue}
                  min={0}
                  max={form.discountType === 'PERCENT' ? 100 : undefined}
                  onChange={(v) => setForm({ ...form, discountValue: v ?? 0 })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
            {form.discountType === 'PERCENT' && (
              <div>
                <label className="text-xs text-gray-600">Giảm tối đa (₫)</label>
                <NumberInput
                  value={form.maxDiscount ?? 0}
                  min={0}
                  onChange={(v) => setForm({ ...form, maxDiscount: v && v > 0 ? v : undefined })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                />
                <p className="mt-1 text-[11px] text-gray-400">Để trống nếu không giới hạn. VD: 10% tối đa 10.000₫.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Đơn tối thiểu</label>
                <NumberInput
                  value={form.minOrderAmount ?? 0}
                  min={0}
                  onChange={(v) => setForm({ ...form, minOrderAmount: v ?? 0 })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Hết hạn</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt ?? ''}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value || undefined })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Huỷ
          </button>
          {tab === 'existing' ? (
            <button
              onClick={handlePickExisting}
              disabled={!selected || sending}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {sending ? 'Đang gửi...' : 'Gửi voucher'}
            </button>
          ) : (
            <button
              onClick={handleCreateAndSend}
              disabled={sending}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {sending ? 'Đang gửi...' : 'Tạo và gửi'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const VoucherRow: React.FC<{ voucher: Voucher; isSelected: boolean; onSelect: () => void }> = ({ voucher, isSelected, onSelect }) => {
  const headline = voucher.discountType === 'PERCENT'
    ? `Giảm ${voucher.discountValue}%`
    : `Giảm ${formatPrice(voucher.discountValue)}`;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 mb-2 transition-all ${
        isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-mono text-gray-500">{voucher.code}</p>
        {isSelected && (
          <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-orange-600">{headline}</p>
      {voucher.title && <p className="text-xs text-gray-600 truncate mt-0.5">{voucher.title}</p>}
      {voucher.minOrderAmount > 0 && (
        <p className="text-[11px] text-gray-400">Đơn tối thiểu {formatPrice(voucher.minOrderAmount)}</p>
      )}
    </button>
  );
};

export default SendVoucherModal;
