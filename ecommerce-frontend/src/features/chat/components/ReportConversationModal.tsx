import { useState, useRef } from 'react';
import { X, Flag, AlertCircle, Loader2, ImagePlus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useReportConversation } from '../hooks/useChat';
import { chatService } from '../services/chatService';
import type { Message } from '../types';

interface Props {
  conversationId: string;
  targetMessage: Message;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'SCAM', label: 'Lừa đảo' },
  { value: 'FAKE_PRODUCT', label: 'Sản phẩm giả' },
  { value: 'HARASSMENT', label: 'Quấy rối' },
  { value: 'OTHER', label: 'Khác' },
];

export default function ReportConversationModal({
  conversationId,
  targetMessage,
  onClose,
}: Props) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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
      toast.error('Vui lòng chọn lý do báo cáo');
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
      setIsUploading(true);
      let evidenceImages: string[] = [];
      
      // Upload images
      if (images.length > 0) {
        const uploadPromises = images.map(file => chatService.uploadFile(file, conversationId));
        const uploadResults = await Promise.all(uploadPromises);
        evidenceImages = uploadResults.map(res => res.url || '').filter(Boolean);
      }

      await reportMutation.mutateAsync({
        conversationId,
        reason,
        description,
        evidenceMessageIds: [targetMessage.id],
        evidenceImages,
      });
      
      // Reset form states
      setReason('');
      setDescription('');
      setImages([]);
      // Close modal
      onClose();
    } catch (error) {
      // Errors are handled by mutation onError handler
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = reportMutation.isPending || isUploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col scale-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="font-semibold text-gray-900">Báo cáo tin nhắn</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* Reported Message Preview */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <span className="text-xs font-semibold text-gray-500 block mb-1">Tin nhắn bị báo cáo</span>
              <p className="text-sm text-gray-800 italic">
                "{targetMessage.content}"
              </p>
              <span className="text-[10px] text-gray-400 block mt-1">
                Gửi lúc: {new Date(targetMessage.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>

            {/* Reason select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Lý do báo cáo
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
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
                <span className="text-red-500">*</span> Mô tả chi tiết
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                placeholder="Mô tả lý do báo cáo chi tiết hơn (tối thiểu 10 ký tự)"
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
                disabled={isLoading}
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
                    disabled={isLoading}
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
                Báo cáo sẽ được kiểm duyệt bởi đội ngũ hỗ trợ của chúng tôi. Vui lòng cung cấp thông tin chi tiết và chính xác.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !reason || description.trim().length < 10}
            className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isUploading ? 'Đang tải ảnh...' : 'Đang gửi...'}
              </>
            ) : (
              <>
                <Flag className="w-4 h-4" />
                Gửi báo cáo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
