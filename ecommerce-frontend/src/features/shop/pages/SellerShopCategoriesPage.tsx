import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProducts } from '@/features/product/hooks/useProducts';
import {
  useShopCategories,
  useCreateShopCategory,
  useUpdateShopCategory,
  useDeleteShopCategory,
} from '../hooks/useShop';
import { Plus, Pencil, Trash2, X, Store } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import NumberInput from '@/components/common/NumberInput';
import type { ShopCategory } from '../types';

export default function SellerShopCategoriesPage() {
  const user = useAuthStore((s) => s.user);
  const sellerId = user?.id ?? '';

  const { data: categories = [], isLoading } = useShopCategories(sellerId);
  const { data: productsData } = useProducts({ page: 0, size: 100, sellerId });
  const createMut = useCreateShopCategory(sellerId);
  const updateMut = useUpdateShopCategory(sellerId);
  const deleteMut = useDeleteShopCategory(sellerId);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShopCategory | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState(0);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPosition(categories.length);
    setSelectedProductIds([]);
    setShowModal(true);
  };

  const openEdit = (cat: ShopCategory) => {
    setEditing(cat);
    setName(cat.name);
    setPosition(cat.position);
    setSelectedProductIds(cat.productIds);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }
    const payload = { name: name.trim(), position, productIds: selectedProductIds };
    if (editing) {
      updateMut.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật danh mục');
            setShowModal(false);
          },
          onError: () => toast.error('Lỗi cập nhật danh mục'),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Đã tạo danh mục');
          setShowModal(false);
        },
        onError: () => toast.error('Lỗi tạo danh mục'),
      });
    }
  };

  const handleDelete = (cat: ShopCategory) => {
    if (!confirm(`Xóa danh mục "${cat.name}"?`)) return;
    deleteMut.mutate(cat.id, {
      onSuccess: () => toast.success('Đã xóa danh mục'),
      onError: () => toast.error('Lỗi xóa danh mục'),
    });
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Danh mục shop</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo các tab danh mục trên trang shop để nhóm sản phẩm theo loại.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" /> Thêm danh mục
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Store className="h-12 w-12" />}
          title="Chưa có danh mục"
          description="Tạo danh mục đầu tiên để hiển thị tab trên trang shop của bạn."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Vị trí</th>
                <th className="px-4 py-3 text-left">Tên danh mục</th>
                <th className="px-4 py-3 text-left">Số sản phẩm</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{cat.position}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{cat.productCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(cat)}
                      className="mr-2 inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil className="h-3 w-3" /> Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
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
                {editing ? 'Sửa danh mục' : 'Thêm danh mục'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tên danh mục</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Áo Thun, Quần Dài, Áo Khoác..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vị trí (số nhỏ hơn hiển thị trước)</label>
                <NumberInput
                  value={position}
                  onChange={(v) => setPosition(v ?? 0)}
                  min={0}
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Chọn sản phẩm thuộc danh mục ({selectedProductIds.length})
                </label>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {productsData?.content?.length ? (
                    productsData.content.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={() => toggleProduct(p.id)}
                          className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500"
                        />
                        {p.images?.[0] && (
                          <img src={p.images[0]} alt={p.name} className="h-8 w-8 rounded object-cover" />
                        )}
                        <span className="flex-1 truncate text-sm text-gray-700">{p.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="py-4 text-center text-sm text-gray-400">Chưa có sản phẩm</p>
                  )}
                </div>
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
                {editing ? 'Lưu thay đổi' : 'Tạo danh mục'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
