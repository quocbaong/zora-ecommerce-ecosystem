import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { faqService } from '../services/faqService';
import type { SaveShopFaqsPayload } from '../types';

export function useFaqKey(sellerId: string | undefined) {
  return ['chat', 'faqs', sellerId];
}

/** Fetch FAQ list for a given seller (used on user side) */
export function useShopFaqs(sellerId: string | undefined) {
  return useQuery({
    queryKey: useFaqKey(sellerId),
    queryFn: () => faqService.getFaqs(sellerId!),
    enabled: !!sellerId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

/** Seller: save/upsert their FAQ list */
export function useSaveShopFaqs(sellerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveShopFaqsPayload) => faqService.saveFaqs(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: useFaqKey(sellerId) });
      toast.success('Đã lưu câu hỏi nhanh!');
    },
    onError: () => toast.error('Không thể lưu câu hỏi nhanh.'),
  });
}
