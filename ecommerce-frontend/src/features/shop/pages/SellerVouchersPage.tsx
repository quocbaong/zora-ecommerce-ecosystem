import { useState } from 'react';
import {
  useSellerVouchers,
  useCreateVoucher,
  useUpdateVoucher,
  useDeleteVoucher,
} from '../hooks/useShop';
import { Plus, Pencil, Trash2, X, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import NumberInput from '@/components/common/NumberInput';
import { formatPrice } from '@/utils/format';
import type { Voucher, VoucherRequest, VoucherDiscountType } from '../types';

const emptyForm: VoucherRequest = {
  code: '',
  title: '',
  discountType: 'FIXED',
  discountValue: 0,
  minOrderAmount: 0,
  maxDiscount: undefined,
  usageLimit: undefined,
  expiresAt: undefined,
  active: true,
};

export default function SellerVouchersPage() {
  const { data: vouchers = [], isLoading } = useSellerVouchers();
  const createMut = useCreateVoucher();
  const updateMut = useUpdateVoucher();
  const deleteMut = useDeleteVoucher();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState<VoucherRequest>(emptyForm);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (v: Voucher) => {
    setEditing(v);
    setForm({
      code: v.code,
      title: v.title || '',
      discountType: v.discountType,
      discountValue: v.discountValue,
      minOrderAmount: v.minOrderAmount,
      maxDiscount: v.maxDiscount ?? undefined,
      usageLimit: v.usageLimit ?? undefined,
      expiresAt: v.expiresAt ?? undefined,
      active: v.active,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.code.trim()) {
      toast.error('Vui lòng nhập mã voucher');
      return;
    }
    if (form.discountValue <= 0) {
      toast.error('Giá trị giảm phải lớn hơn 0');
      return;
    }
    if (form.discountType === 'PERCENT' && form.discountValue > 100) {
      toast.error('Phần trăm giảm tối đa là 100');
      return;
    }
    const payload: VoucherRequest = { ...form, code: form.code.trim().toUpperCase() };
    if (editing) {
      updateMut.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật voucher');
            setShowModal(false);
          },
          onError: () => toast.error('Lỗi cập nhật voucher'),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Đã tạo voucher');
          setShowModal(false);
        },
        onError: () => toast.error('Lỗi tạo voucher'),
      });
    }
  };

  const handleDelete = (v: Voucher) => {
    if (!confirm(`Xóa voucher "${v.code}"?`)) return;
    deleteMut.mutate(v.id, {
      onSuccess: () => toast.success('Đã xóa voucher'),
      onError: () => toast.error('Lỗi xóa voucher'),
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Khuyến mãi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo voucher giảm giá để hiển thị trên trang shop. User có thể lưu và áp dụng lúc thanh toán.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" /> Thêm voucher
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-12 w-12" />}
          title="Chưa có voucher"
          description="Tạo voucher đầu tiên để khuyến mãi cho khách hàng."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Mã</th>
                <th className="px-4 py-3 text-left">Giảm</th>
                <th className="px-4 py-3 text-left">Đơn tối thiểu</th>
                <th className="px-4 py-3 text-left">Đã dùng</th>
                <th className="px-4 py-3 text-left">Hạn</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold text-orange-600">{v.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {v.discountType === 'PERCENT' ? `${v.discountValue}%` : formatPrice(v.discountValue)}
                    {v.maxDiscount && v.discountType === 'PERCENT' ? (
                      <span className="ml-1 text-xs text-gray-400">(tối đa {formatPrice(v.maxDiscount)})</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {v.minOrderAmount > 0 ? formatPrice(v.minOrderAmount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {v.usedCount}{v.usageLimit ? `/${v.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('vi-VN') : 'Không có'}
                  </td>
                  <td className="px-4 py-3">
                    {v.active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Đang chạy
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        Tạm dừng
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(v)}
                      className="mr-2 inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil className="h-3 w-3" /> Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" /> Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Sửa voucher' : 'Thêm voucher'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mã voucher</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="VD: SALE15K"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Loại giảm</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as VoucherDiscountType })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="FIXED">Giảm cố định (VND)</option>
                  <option value="PERCENT">Giảm theo %</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Giá trị giảm {form.discountType === 'PERCENT' ? '(%)' : '(VND)'}
                </label>
                <NumberInput
                  value={form.discountValue}
                  onChange={(v) => setForm({ ...form, discountValue: v ?? 0 })}
                  min={0}
                  max={form.discountType === 'PERCENT' ? 100 : undefined}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Đơn tối thiểu (VND)
                </label>
                <NumberInput
                  value={form.minOrderAmount ?? 0}
                  onChange={(v) => setForm({ ...form, minOrderAmount: v ?? 0 })}
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              {form.discountType === 'PERCENT' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Giảm tối đa (VND, tùy chọn)
                  </label>
                  <NumberInput
                    nullable
                    value={form.maxDiscount}
                    onChange={(v) => setForm({ ...form, maxDiscount: v })}
                    min={0}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Giới hạn sử dụng (tùy chọn)
                </label>
                <NumberInput
                  nullable
                  value={form.usageLimit}
                  onChange={(v) => setForm({ ...form, usageLimit: v })}
                  min={0}
                  placeholder="Không giới hạn"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ngày hết hạn (tùy chọn)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt ? form.expiresAt.slice(0, 16) : ''}
                  onChange={(e) =>
                    setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Tiêu đề (hiển thị)</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Đơn Tối Thiểu 199K"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500"
                  />
                  Kích hoạt ngay
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {editing ? 'Lưu thay đổi' : 'Tạo voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
