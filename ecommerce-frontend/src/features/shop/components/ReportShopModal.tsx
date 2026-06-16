import { useState, useRef } from 'react';
import { X, Flag, AlertCircle, Loader2, ImagePlus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { chatService } from '@/features/chat/services/chatService';
import { useReportConversation } from '@/features/chat/hooks/useChat';

interface Props {
  sellerId: string;
  shopName: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam / Tin nhắn rác' },
  { value: 'SCAM', label: 'Lừa đảo / Gian lận' },
  { value: 'FAKE_PRODUCT', label: 'Bán hàng giả, hàng nhái' },
  { value: 'HARASSMENT', label: 'Ngôn từ xúc phạm, quấy rối' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export default function ReportShopModal({ sellerId, shopName, onClose }: Props) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportMutation = useReportConversation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
      if (validFiles.length !== newFiles.length) {
        toast.error('Chỉ hỗ trợ tải lên hình ảnh');
      }
      if (images.length + validFiles.length > 3) {
        toast.error('Bạn chỉ có thể tải lên tối đa 3 ảnh');
        return;
      }
      setImages(prev => [...prev, ...validFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Vui lòng chọn lý do tố cáo');
      return;
    }
    if (!description.trim()) {
      toast.error('Vui lòng nhập mô tả');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Mô tả phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Get or create a conversation with the shop to establish context
      const conversation = await chatService.getOrCreateConversation({
        sellerId,
        productId: undefined
      });

      if (!conversation || !conversation.id) {
        throw new Error('Không thể khởi tạo ngữ cảnh tố cáo cửa hàng.');
      }

      const conversationId = conversation.id;
      let evidenceImages: string[] = [];

      // 2. Upload images if any
      if (images.length > 0) {
        const uploadPromises = images.map(file => chatService.uploadFile(file, conversationId));
        const uploadResults = await Promise.all(uploadPromises);
        evidenceImages = uploadResults.map(res => res.url || '').filter(Boolean);
      }

      // 3. Submit the report with empty evidenceMessageIds
      await reportMutation.mutateAsync({
        conversationId,
        reason,
        description,
        evidenceMessageIds: [], // Empty since we report the whole shop/user
        evidenceImages,
      });

      // Reset & Close
      setReason('');
      setDescription('');
      setImages([]);
      onClose();
    } catch (error: any) {
      console.error(error);
      const errMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Có lỗi xảy ra khi gửi tố cáo.';
      toast.error(errMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col scale-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="font-semibold text-gray-900">Tố cáo cửa hàng</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* Target Shop Preview */}
            <div className="bg-red-50/50 border border-red-100/50 rounded-xl p-3">
              <span className="text-xs font-semibold text-red-600 block mb-1">Cửa hàng bị tố cáo</span>
              <p className="text-sm font-bold text-gray-800">
                {shopName}
              </p>
              <span className="text-[10px] text-gray-400 block mt-1">
                Seller ID: {sellerId}
              </span>
            </div>

            {/* Reason select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Lý do tố cáo
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Chọn lý do --</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Mô tả chi tiết hành vi vi phạm
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Mô tả cụ thể hành vi vi phạm của shop (tối thiểu 10 ký tự)"
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-400">
                  {description.length}/1000
                </p>
                {description.length > 0 && description.length < 10 && (
                  <p className="text-xs text-red-500">
                    Cần thêm {10 - description.length} ký tự
                  </p>
                )}
              </div>
            </div>

            {/* Image Evidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hình ảnh bằng chứng (Tối đa 3)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
              <div className="flex flex-wrap gap-2">
                {images.map((file, index) => (
                  <div key={index} className="relative w-16 h-16 group rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Evidence"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all"
                    >
                      <XCircle className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-500 transition-colors bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImagePlus className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="flex gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Báo cáo của bạn sẽ được chuyển đến bộ phận kiểm duyệt. Cửa hàng vi phạm nhiều lần có thể bị khóa vĩnh viễn.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason || description.trim().length < 10}
            className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4" />
                Gửi tố cáo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
