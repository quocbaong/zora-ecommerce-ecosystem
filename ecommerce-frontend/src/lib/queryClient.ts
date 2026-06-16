// Cấu hình global (src/lib/queryClient.ts)
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 phút: dữ liệu coi là "mới" trong 5 phút
      gcTime: 1000 * 60 * 10,         // 10 phút: giữ trong bộ nhớ cache
      retry: 2,                        // Thử lại 2 lần nếu lỗi
      refetchOnWindowFocus: false,     // Không tự fetch lại khi focus tab
    },
  },
});
