import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adCampaignService,
  AdCampaignPayload,
  AdCampaignStatus,
} from '../services/adCampaignService';

const ACTIVE_KEY = ['ads', 'active'];
const MINE_KEY = ['ads', 'mine'];
const ADMIN_KEY = ['ads', 'admin'];

export function useActiveCampaigns() {
  return useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: () => adCampaignService.getActive(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyCampaigns() {
  return useQuery({
    queryKey: MINE_KEY,
    queryFn: () => adCampaignService.getMine(),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdCampaignPayload) => adCampaignService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      toast.success('Đã gửi yêu cầu chiến dịch! Chờ admin duyệt.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Không tạo được chiến dịch';
      toast.error(msg);
    },
  });
}

export function useUploadBanner() {
  return useMutation({
    mutationFn: (file: File) => adCampaignService.uploadBanner(file),
    onError: () => toast.error('Upload ảnh banner thất bại'),
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adCampaignService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      toast.success('Đã huỷ chiến dịch');
    },
    onError: () => toast.error('Không huỷ được chiến dịch'),
  });
}

export function useAdminCampaigns(status: AdCampaignStatus = 'PENDING') {
  return useQuery({
    queryKey: [...ADMIN_KEY, status],
    queryFn: () => adCampaignService.listForAdmin(status),
  });
}

function backendMessage(err: any, fallback: string) {
  return err?.response?.data?.message || err?.response?.data?.error || fallback;
}

export function useApproveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adCampaignService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: ACTIVE_KEY });
      toast.success('Đã duyệt chiến dịch');
    },
    onError: (err: any) => toast.error(backendMessage(err, 'Không duyệt được')),
  });
}

export function useRejectCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adCampaignService.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      toast.success('Đã từ chối chiến dịch');
    },
    onError: (err: any) => toast.error(backendMessage(err, 'Không từ chối được')),
  });
}

export function useForceStopCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adCampaignService.forceStop(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: ACTIVE_KEY });
      toast.success('Đã buộc dừng chiến dịch');
    },
    onError: (err: any) => {
      toast.error(backendMessage(err, 'Không dừng được chiến dịch'));
      // Refetch để xoá campaign đã đổi trạng thái khỏi UI nếu data cũ
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
    },
  });
}
