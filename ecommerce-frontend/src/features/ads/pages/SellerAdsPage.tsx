import { useRef, useState } from 'react';
import { Plus, Upload, X, Check, AlertCircle, Image as ImageIcon, Trash2, Megaphone, Eye } from 'lucide-react';
import {
  useMyCampaigns,
  useCreateCampaign,
  useUploadBanner,
  useCancelCampaign,
} from '../hooks/useAdCampaigns';
import { AdCampaign } from '../services/adCampaignService';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN');
}

type DisplayStatus = AdCampaign['status'] | 'ENDED';

const STATUS_STYLE: Record<DisplayStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  FORCE_STOPPED: 'bg-red-100 text-red-700',
  ENDED: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<DisplayStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đang chạy',
  REJECTED: 'Bị từ chối',
  FORCE_STOPPED: 'Bị dừng',
  ENDED: 'Đã kết thúc',
};

function getDisplayStatus(c: AdCampaign, todayStr: string): DisplayStatus {
  if (c.status === 'APPROVED' && c.endDate.slice(0, 10) < todayStr) return 'ENDED';
  return c.status;
}

export default function SellerAdsPage() {
  const { data: campaigns = [], isLoading } = useMyCampaigns();
  const createMutation = useCreateCampaign();
  const uploadMutation = useUploadBanner();
  const cancelMutation = useCancelCampaign();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    bannerUrl: '',
    startDate: '',
    endDate: '',
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // hôm nay theo timezone local, format YYYY-MM-DD để so sánh string với input date
  const todayStr = new Date().toLocaleDateString('en-CA');

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Vui lòng nhập tiêu đề chiến dịch';
    if (!form.bannerUrl) return 'Vui lòng upload ảnh banner';
    if (!form.startDate) return 'Vui lòng chọn ngày bắt đầu';
    if (!form.endDate) return 'Vui lòng chọn ngày kết thúc';
    if (form.startDate < todayStr) return 'Ngày bắt đầu không được ở quá khứ';
    if (form.endDate < form.startDate) return 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu';
    return null;
  };

  const resetForm = () => {
    setForm({ title: '', description: '', bannerUrl: '', startDate: '', endDate: '' });
    setPreviewUrl(null);
    setFormError(null);
    setShowForm(false);
  };

  const handleUpload = async (file: File) => {
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const url = await uploadMutation.mutateAsync(file);
      setForm((f) => ({ ...f, bannerUrl: url }));
    } catch {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    createMutation.mutate(form, {
      onSuccess: resetForm,
      onError: (e: any) => {
        const raw = e?.response?.data?.message || e?.response?.data?.error || '';
        // Bóc prefix kiểu `400 BAD_REQUEST "..."` nếu backend cũ còn trả về
        const m = String(raw).match(/"([^"]+)"/);
        setFormError(m ? m[1] : (raw || 'Không tạo được chiến dịch'));
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-orange-500" /> Chiến dịch quảng cáo
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Đăng ký banner hiển thị trên trang chủ ZORA. Admin sẽ duyệt trong 24h.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 shadow-md shadow-orange-200"
            >
              <Plus className="w-4 h-4" /> Tạo chiến dịch
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl bg-white border border-orange-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Tạo chiến dịch mới</h2>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  maxLength={200}
                  placeholder="VD: Mega Sale tháng 5 — Giảm tới 50%"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
                <textarea
                  maxLength={500}
                  rows={2}
                  placeholder="Mô tả ngắn về chiến dịch..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ảnh banner <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">Khuyến nghị 1600×600px, tối đa 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = '';
                  }}
                />
                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img src={form.bannerUrl || previewUrl} alt="preview" className="w-full max-h-60 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPreviewUrl(null); setForm((f) => ({ ...f, bannerUrl: '' })); }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    {uploadMutation.isPending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="flex items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">{uploadMutation.isPending ? 'Đang upload...' : 'Bấm để tải ảnh lên'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    min={todayStr}
                    value={form.startDate}
                    onChange={(e) => { setForm((f) => ({ ...f, startDate: e.target.value })); setFormError(null); }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    min={form.startDate || todayStr}
                    value={form.endDate}
                    onChange={(e) => { setForm((f) => ({ ...f, endDate: e.target.value })); setFormError(null); }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  disabled={!form.bannerUrl || !form.title}
                  className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" /> Xem preview
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !form.bannerUrl}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" /> {createMutation.isPending ? 'Đang gửi...' : 'Gửi duyệt'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Chiến dịch của tôi</h2>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Bạn chưa có chiến dịch nào</p>
              <p className="text-sm text-gray-400 mt-1">Tạo chiến dịch để banner shop xuất hiện trên trang chủ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <div key={c.id} className="p-5 flex gap-4">
                  <img src={c.bannerUrl} alt={c.title} className="w-32 h-20 rounded-xl object-cover bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{c.title}</h3>
                        {c.description && <p className="text-sm text-gray-500 line-clamp-1">{c.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(c.startDate)} → {formatDate(c.endDate)}
                        </p>
                      </div>
                      {(() => {
                        const ds = getDisplayStatus(c, todayStr);
                        return (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${STATUS_STYLE[ds]}`}>
                            {STATUS_LABEL[ds]}
                          </span>
                        );
                      })()}
                    </div>
                    {c.status === 'REJECTED' && c.rejectionReason && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Lý do từ chối: {c.rejectionReason}</span>
                      </div>
                    )}
                    {c.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          if (confirm('Huỷ chiến dịch này?')) cancelMutation.mutate(c.id);
                        }}
                        className="mt-2 text-xs text-red-500 hover:underline"
                      >
                        Huỷ chiến dịch
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal — render giống banner trên trang chủ */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-orange-500" /> Xem trước banner
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Đây là cách banner sẽ hiển thị trên trang chủ ZORA</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20">
              <div className="relative overflow-hidden rounded-2xl bg-white min-h-[400px] shadow-sm border border-gray-100">
                <img
                  src={form.bannerUrl}
                  alt={form.title || 'Banner preview'}
                  className="w-full h-full min-h-[400px] object-cover"
                />
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                💡 Banner sẽ hiển thị nguyên ảnh trên trang chủ. Click vào banner sẽ dẫn về trang shop của bạn. Chu kỳ xoay 5 giây/banner.
              </p>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Quay lại chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
