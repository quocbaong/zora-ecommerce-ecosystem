import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService } from '../services/walletService';
import { toast } from 'sonner';

export const useWalletDetails = () =>
  useQuery({
    queryKey: ['wallet-details'],
    queryFn: () => walletService.getMyWalletDetails(),
    staleTime: 10_000,
  });

export const useRequestWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      bankName: string;
      bankAccountNumber: string;
      bankAccountName: string;
    }) => walletService.requestWithdrawal(data),
    onSuccess: (res) => {
      toast.success(res.message || 'Đã gửi yêu cầu rút tiền thành công!');
      qc.invalidateQueries({ queryKey: ['wallet-details'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Rút tiền thất bại. Vui lòng kiểm tra lại.';
      toast.error(msg);
    },
  });
};

export const useAdminWithdrawals = () =>
  useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: () => walletService.getAdminWithdrawals(),
    staleTime: 10_000,
  });

export const useProcessWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, isApproved }: { requestId: string; isApproved: boolean }) =>
      walletService.processWithdrawal(requestId, isApproved),
    onSuccess: (res) => {
      toast.success(res.message || 'Đã xử lý yêu cầu rút tiền thành công!');
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu.';
      toast.error(msg);
    },
  });
};
