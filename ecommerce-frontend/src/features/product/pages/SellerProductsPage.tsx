import { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useUploadProductImages } from '@/features/product/hooks/useProducts';
import { useCategories, useCategoryAttributes } from '@/features/product/hooks/useCategories';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/utils/format';
import { Plus, Pencil, Trash2, Upload, X, Package, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import NumberInput from '@/components/common/NumberInput';
import type { Product, CreateProductPayload, UpdateProductPayload, ProductVariant } from '@/types/api.types';

type VariantDraft = Omit<ProductVariant, 'id'> & { id?: string };

const emptyVariant = (): VariantDraft => ({ color: '', size: '', additionalPrice: 0, stock: 0 });

const PAGE_SIZE = 10;

export default function SellerProductsPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useProducts({
    page,
    size: PAGE_SIZE,
    sellerId: user?.id,
    keyword: keyword || undefined,
    categoryId: categoryId || undefined,
  });
  const { data: categories } = useCategories();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: uploadImages } = useUploadProductImages();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<CreateProductPayload>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    categoryId: '',
    status: 'ACTIVE',
    weightG: 500,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
  });
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});

  // Schema attribute của category đang chọn trong form (chỉ fetch khi modal mở)
  const { data: categoryAttributes } = useCategoryAttributes(
    showModal && form.categoryId ? form.categoryId : undefined,
  );

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: 0, stock: 0, categoryId: '', status: 'ACTIVE', weightG: 500, lengthCm: 20, widthCm: 15, heightCm: 10 });
    setVariants([]);
    setImageFiles([]);
    setAttributeValues({});
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId ?? '',
      status: product.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      weightG: product.weightG ?? 500,
      lengthCm: product.lengthCm ?? 20,
      widthCm: product.widthCm ?? 15,
      heightCm: product.heightCm ?? 10,
    });
    setVariants(product.variants?.map((v) => ({ ...v })) ?? []);
    setImageFiles([]);
    // Hydrate giá trị attribute hiện có sang dạng string để gán vào input
    const initial: Record<string, string> = {};
    Object.entries(product.attributes ?? {}).forEach(([k, v]) => {
      initial[k] = v == null ? '' : String(v);
    });
    setAttributeValues(initial);
    setShowModal(true);
  };

  const addVariant = () => setVariants((vs) => [...vs, emptyVariant()]);
  const removeVariant = (i: number) => setVariants((vs) => vs.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, field: keyof VariantDraft, value: string | number) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));

  // Chuẩn hóa giá trị attribute theo schema (NUMBER → Number, còn lại → string)
  const buildAttributePayload = (): Record<string, unknown> => {
    if (!categoryAttributes || categoryAttributes.length === 0) return {};
    const out: Record<string, unknown> = {};
    for (const attr of categoryAttributes) {
      const raw = (attributeValues[attr.name] ?? '').trim();
      if (raw === '') continue;
      if (attr.type === 'NUMBER') {
        const num = Number(raw);
        out[attr.name] = Number.isNaN(num) ? raw : num;
      } else {
        out[attr.name] = raw;
      }
    }
    return out;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required attributes ở client để báo lỗi sớm
    if (categoryAttributes) {
      const missing = categoryAttributes
        .filter((a) => a.required && !((attributeValues[a.name] ?? '').trim()))
        .map((a) => a.label);
      if (missing.length > 0) {
        toast.error(`Vui lòng nhập: ${missing.join(', ')}`);
        return;
      }
    }

    const cleanVariants = variants.filter((v) => v.color || v.size);
    const attributes = buildAttributePayload();

    if (editingProduct) {
      const payload: UpdateProductPayload = { ...form, variants: cleanVariants, attributes };
      updateProduct(
        { id: editingProduct.id, payload },
        {
          onSuccess: () => {
            toast.success('Cập nhật sản phẩm thành công!');
            if (imageFiles.length > 0) {
              // Khi edit có chọn ảnh mới → replace = xoá ảnh cũ trên S3 + DB
              uploadImages({ id: editingProduct.id, files: imageFiles, replace: true });
            }
            setShowModal(false);
          },
          onError: () => toast.error('Lỗi cập nhật sản phẩm.'),
        }
      );
    } else {
      createProduct({ ...form, variants: cleanVariants, attributes }, {
        onSuccess: (newProduct) => {
          toast.success('Tạo sản phẩm thành công!');
          if (imageFiles.length > 0 && newProduct?.id) {
            uploadImages({ id: newProduct.id, files: imageFiles });
          }
          setShowModal(false);
        },
        onError: () => toast.error('Lỗi tạo sản phẩm.'),
      });
    }
  };

  const handleDelete = (product: Product) => {
    if (!confirm(`Bạn có chắc muốn ngưng bán "${product.name}"?`)) return;
    deleteProduct(product.id, {
      onSuccess: () => toast.success('Đã ngưng bán sản phẩm.'),
      onError: () => toast.error('Lỗi khi ngưng bán sản phẩm.'),
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(draftKeyword);
    setPage(0);
  };

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    setPage(0);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(0);
  };

  // Client-side status filter (backend getAll doesn't support status param yet)
  const products = statusFilter
    ? (data?.content ?? []).filter((p) => p.status === statusFilter)
    : (data?.content ?? []);

  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý sản phẩm</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.totalElements} sản phẩm
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Thêm sản phẩm
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={draftKeyword}
              onChange={(e) => setDraftKeyword(e.target.value)}
              placeholder="Tìm theo tên sản phẩm..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            Tìm
          </button>
        </form>

        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Tất cả danh mục</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="INACTIVE">Ngưng bán</option>
        </select>
      </div>

      {/* Product Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      ) : !products.length ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Chưa có sản phẩm"
          description={keyword || categoryId || statusFilter ? 'Không tìm thấy sản phẩm phù hợp.' : 'Bắt đầu bán hàng bằng cách thêm sản phẩm đầu tiên.'}
          actionLabel={!keyword && !categoryId && !statusFilter ? 'Thêm sản phẩm' : undefined}
          onAction={!keyword && !categoryId && !statusFilter ? openCreate : undefined}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ảnh</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên sản phẩm</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Danh mục</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Giá</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kho</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{product.categoryName ?? '—'}</td>
                    <td className="px-4 py-3 text-orange-500 font-semibold">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">{product.stock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.status === 'ACTIVE' ? 'Đang bán' : 'Ngưng bán'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Ngưng bán"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Trang {page + 1} / {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Trước
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Tên sản phẩm</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Giá (VNĐ)</label>
                  <NumberInput
                    value={form.price}
                    onChange={(v) => setForm((f) => ({ ...f, price: v ?? 0 }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Số lượng kho</label>
                  <NumberInput
                    value={form.stock}
                    onChange={(v) => setForm((f) => ({ ...f, stock: v ?? 0 }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                    min={0}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-gray-200 p-3">
                <p className="mb-2 text-xs font-semibold text-gray-700">Kích thước & cân nặng (dùng tính phí ship GHN)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Cân nặng (g)</label>
                    <NumberInput
                      value={form.weightG ?? 500}
                      onChange={(v) => setForm((f) => ({ ...f, weightG: v ?? 500 }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Dài (cm)</label>
                    <NumberInput
                      value={form.lengthCm ?? 20}
                      onChange={(v) => setForm((f) => ({ ...f, lengthCm: v ?? 20 }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Rộng (cm)</label>
                    <NumberInput
                      value={form.widthCm ?? 15}
                      onChange={(v) => setForm((f) => ({ ...f, widthCm: v ?? 15 }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Cao (cm)</label>
                    <NumberInput
                      value={form.heightCm ?? 10}
                      onChange={(v) => setForm((f) => ({ ...f, heightCm: v ?? 10 }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      min={1}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Danh mục</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Trường thông tin chi tiết theo danh mục (do admin cấu hình) */}
              {form.categoryId && categoryAttributes && categoryAttributes.length > 0 && (
                <div className="rounded-lg border border-input p-3 space-y-3 bg-muted/20">
                  <p className="text-sm font-medium">Thông tin chi tiết của danh mục</p>
                  {categoryAttributes.map((attr) => (
                    <div key={attr.id}>
                      <label className="mb-1 block text-sm font-medium">
                        {attr.label}
                        {attr.required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {attr.type === 'TEXTAREA' ? (
                        <textarea
                          value={attributeValues[attr.name] ?? ''}
                          onChange={(e) =>
                            setAttributeValues((s) => ({ ...s, [attr.name]: e.target.value }))
                          }
                          placeholder={attr.placeholder}
                          rows={3}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : attr.type === 'NUMBER' ? (
                        <NumberInput
                          nullable
                          value={
                            attributeValues[attr.name] !== undefined && attributeValues[attr.name] !== ''
                              ? Number(attributeValues[attr.name])
                              : undefined
                          }
                          onChange={(val) =>
                            setAttributeValues((s) => ({
                              ...s,
                              [attr.name]: val == null ? '' : String(val),
                            }))
                          }
                          placeholder={attr.placeholder}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : (
                        <input
                          type="text"
                          value={attributeValues[attr.name] ?? ''}
                          onChange={(e) =>
                            setAttributeValues((s) => ({ ...s, [attr.name]: e.target.value }))
                          }
                          placeholder={attr.placeholder}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Trạng thái</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="ACTIVE">Đang bán</option>
                  <option value="INACTIVE">Lưu nháp</option>
                </select>
              </div>

              {/* Variants */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Biến thể sản phẩm</label>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm biến thể
                  </button>
                </div>
                {variants.length === 0 ? (
                  <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-input py-3 text-center">
                    Chưa có biến thể — sản phẩm sẽ bán theo giá gốc
                  </p>
                ) : (
                  <div className="space-y-2">
                    {variants.map((v, i) => (
                      <div key={i} className="flex gap-2 items-start rounded-lg border border-input p-3">
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div>
                            <label className="mb-0.5 block text-xs text-muted-foreground">Màu</label>
                            <input
                              value={v.color ?? ''}
                              onChange={(e) => updateVariant(i, 'color', e.target.value)}
                              placeholder="VD: Đỏ, Xanh..."
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-xs text-muted-foreground">Size</label>
                            <input
                              value={v.size ?? ''}
                              onChange={(e) => updateVariant(i, 'size', e.target.value)}
                              placeholder="VD: S, M, L, XL..."
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-xs text-muted-foreground">Giá thêm (VNĐ)</label>
                            <NumberInput
                              value={v.additionalPrice}
                              onChange={(val) => updateVariant(i, 'additionalPrice', val ?? 0)}
                              min={0}
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-xs text-muted-foreground">Kho</label>
                            <NumberInput
                              value={v.stock}
                              onChange={(val) => updateVariant(i, 'stock', val ?? 0)}
                              min={0}
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          className="mt-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Ảnh sản phẩm</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-3 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {imageFiles.length > 0 ? `${imageFiles.length} ảnh đã chọn` : 'Chọn ảnh'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="mt-2 rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isCreating || isUpdating ? 'Đang xử lý...' : editingProduct ? 'Cập nhật' : 'Tạo sản phẩm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
