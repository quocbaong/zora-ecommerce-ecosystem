import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/client';

export const useVoucherById = (id: string | null | undefined) => {
  return useQuery({
    queryKey: ['voucher', id],
    queryFn: async () => {
      const res = await apiClient.get(`/orders/vouchers/${id}`);
      return res.data?.data || res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useSaveVoucher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/orders/vouchers/${id}/save`);
      return res.data?.data || res.data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['voucher', id] });
    },
  });
};
