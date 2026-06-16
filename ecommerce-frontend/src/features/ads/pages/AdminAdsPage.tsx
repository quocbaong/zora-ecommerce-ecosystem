import { useState } from 'react';
import { Megaphone, Check, X, Calendar, AlertCircle, Image as ImageIcon, StopCircle } from 'lucide-react';
import {
  useAdminCampaigns,
  useApproveCampaign,
  useRejectCampaign,
  useForceStopCampaign,
} from '../hooks/useAdCampaigns';
import { AdCampaign, AdCampaignStatus } from '../services/adCampaignService';

const TAB_LABEL: Record<AdCampaignStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  FORCE_STOPPED: 'Đã buộc dừng',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN');
}

export default function AdminAdsPage() {
  const [tab, setTab] = useState<AdCampaignStatus>('PENDING');
  const { data, isLoading } = useAdminCampaigns(tab);
  const approveMutation = useApproveCampaign();
  const rejectMutation = useRejectCampaign();
  const forceStopMutation = useForceStopCampaign();
  const [rejecting, setRejecting] = useState<AdCampaign | null>(null);
  const [forceStopping, setForceStopping] = useState<AdCampaign | null>(null);
  const [reason, setReason] = useState('');

  const campaigns = data?.content ?? [];

  const confirmReject = () => {
    if (!rejecting || !reason.trim()) return;
    rejectMutation.mutate(
      { id: rejecting.id, reason: reason.trim() },
      { onSuccess: () => { setRejecting(null); setReason(''); } }
    );
  };

  const confirmForceStop = () => {
    if (!forceStopping || !reason.trim()) return;
    forceStopMutation.mutate(
      { id: forceStopping.id, reason: reason.trim() },
      {
        onSuccess: () => { setForceStopping(null); setReason(''); },
        onError: () => { setForceStopping(null); setReason(''); },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-orange-500" /> Duyệt quảng cáo banner
          </h1>
          <p className="text-sm text-gray-500 mt-1">Seller đăng ký banner hiển thị trên trang chủ</p>
        </div>

        <div className="flex gap-2 mb-5">
          {(['PENDING', 'APPROVED', 'REJECTED', 'FORCE_STOPPED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {TAB_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">Chưa có chiến dịch nào ở trạng thái này</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <div key={c.id} className="p-5 flex gap-4">
                  <img src={c.bannerUrl} alt={c.title} className="w-48 h-24 rounded-xl object-cover bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{c.title}</h3>
                    {c.description && <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{c.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(c.startDate)} → {formatDate(c.endDate)}
                      </span>
                      <span>Seller: {c.sellerId.substring(0, 8)}...</span>
                    </div>
                    {(tab === 'REJECTED' || tab === 'FORCE_STOPPED') && c.rejectionReason && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{c.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                  {tab === 'PENDING' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => approveMutation.mutate(c.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 rounded-xl bg-green-500 hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        <Check className="w-4 h-4" /> Duyệt
                      </button>
                      <button
                        onClick={() => setRejecting(c)}
                        className="flex items-center gap-1.5 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        <X className="w-4 h-4" /> Từ chối
                      </button>
                    </div>
                  )}
                  {tab === 'APPROVED' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => { setForceStopping(c); setReason(''); }}
                        className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        <StopCircle className="w-4 h-4" /> Buộc dừng
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-bold text-gray-900">Lý do từ chối</h3>
              <button onClick={() => { setRejecting(null); setReason(''); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">Chiến dịch: <span className="font-medium">{rejecting.title}</span></p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="VD: Nội dung không phù hợp, ảnh vi phạm bản quyền..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => { setRejecting(null); setReason(''); }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Huỷ
                </button>
                <button
                  onClick={confirmReject}
                  disabled={!reason.trim() || rejectMutation.isPending}
                  className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {rejectMutation.isPending ? 'Đang gửi...' : 'Từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {forceStopping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <StopCircle className="w-5 h-5 text-orange-500" /> Buộc dừng chiến dịch
              </h3>
              <button onClick={() => { setForceStopping(null); setReason(''); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-orange-700">
                Banner sẽ bị gỡ khỏi trang chủ ngay lập tức và seller sẽ nhận email thông báo.
              </div>
              <p className="text-sm text-gray-600">Chiến dịch: <span className="font-medium">{forceStopping.title}</span></p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="VD: Vi phạm chính sách quảng cáo, nội dung không phù hợp..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => { setForceStopping(null); setReason(''); }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Huỷ
                </button>
                <button
                  onClick={confirmForceStop}
                  disabled={!reason.trim() || forceStopMutation.isPending}
                  className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {forceStopMutation.isPending ? 'Đang xử lý...' : 'Buộc dừng ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
