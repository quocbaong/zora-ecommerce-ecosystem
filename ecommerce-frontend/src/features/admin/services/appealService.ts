import api from '@/lib/axios';

export interface BanAppeal {
  id: string;
  email: string;
  reason: string;
  status: string;
  adminNote?: string;
  warningId?: string;
  createdAt: string;
  updatedAt?: string;
  evidenceImages?: string[];
}

export const appealService = {
  // Public
  submitAppeal: (payload: { email: string; reason: string; evidenceImages?: string[] }) =>
    api.post<BanAppeal>('/api/users/appeals/public', payload).then(r => r.data),
  
  uploadEvidence: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ url: string }>('/api/users/appeals/public/upload-evidence', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  getAppealStatus: (email: string) =>
    api.get<BanAppeal>(`/api/users/appeals/public/status?email=${encodeURIComponent(email)}`).then(r => r.data),

  // Admin
  getAdminAppeals: (params: { page: number; size: number; status?: string }) =>
    api.get<{ content: BanAppeal[]; totalElements: number }>('/api/users/appeals/admin', { params }).then(r => r.data),

  reviewAppeal: (id: string, payload: { status: string; fineAmount?: number; adminNote?: string }) =>
    api.patch<BanAppeal>(`/api/users/appeals/admin/${id}/review`, payload).then(r => r.data),
};
