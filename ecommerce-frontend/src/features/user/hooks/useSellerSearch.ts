import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface SellerResult {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  role: string;
}

interface PagedSellers {
  content: SellerResult[];
  totalElements: number;
  totalPages: number;
  last: boolean;
}

const searchSellers = (keyword: string, page = 0, size = 5) =>
  api.get<PagedSellers>('/api/users/sellers/search', { params: { keyword, page, size } }).then((r) => r.data);

export function useSellerSearch(keyword?: string) {
  return useQuery({
    queryKey: ['sellers-search', keyword],
    queryFn: () => searchSellers(keyword!, 0, 3),
    enabled: !!keyword && keyword.trim().length > 0,
    staleTime: 30_000,
  });
}
