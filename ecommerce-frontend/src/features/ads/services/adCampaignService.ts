import api from '@/lib/axios';

export type AdCampaignStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FORCE_STOPPED';

export interface AdCampaign {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  bannerUrl: string;
  startDate: string;
  endDate: string;
  status: AdCampaignStatus;
  rejectionReason: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
}

export interface AdCampaignPayload {
  title: string;
  description?: string;
  bannerUrl: string;
  startDate: string;
  endDate: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageable: { pageNumber: number; pageSize: number };
  last: boolean;
}

export const adCampaignService = {
  getActive: () =>
    api.get<AdCampaign[]>('/api/ads/campaigns/active').then((r) => r.data),

  uploadBanner: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<{ url: string }>('/api/ads/campaigns/upload-banner', form, {
        headers: { 'Content-Type': undefined },
      })
      .then((r) => r.data.url);
  },

  create: (payload: AdCampaignPayload) =>
    api.post<AdCampaign>('/api/ads/campaigns', payload).then((r) => r.data),

  getMine: () =>
    api.get<AdCampaign[]>('/api/ads/campaigns/mine').then((r) => r.data),

  cancel: (id: string) =>
    api.delete(`/api/ads/campaigns/${id}`).then(() => undefined),

  listForAdmin: (status: AdCampaignStatus = 'PENDING', page = 0, size = 20) =>
    api.get<PageResponse<AdCampaign>>('/api/ads/campaigns', {
      params: { status, page, size },
    }).then((r) => r.data),

  approve: (id: string) =>
    api.patch<AdCampaign>(`/api/ads/campaigns/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.patch<AdCampaign>(`/api/ads/campaigns/${id}/reject`, { reason }).then((r) => r.data),

  forceStop: (id: string, reason: string) =>
    api.patch<AdCampaign>(`/api/ads/campaigns/${id}/force-stop`, { reason }).then((r) => r.data),
};
