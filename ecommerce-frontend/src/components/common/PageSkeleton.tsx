import { Loader2 } from 'lucide-react';

export default function PageSkeleton() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
    </div>
  );
}
