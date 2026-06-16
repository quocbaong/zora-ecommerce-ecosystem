import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

interface Props {
  src: string;
  type: 'image' | 'video';
  onClose: () => void;
}

export default function MediaLightbox({ src, type, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    // Prevent body scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-end gap-2 px-4 py-3 z-10">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          download
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-full text-white hover:bg-white/10 transition"
          title="Tải xuống"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-white hover:bg-white/10 transition"
          title="Đóng"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Media */}
      <div
        className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'image' ? (
          <img
            src={src}
            alt=""
            className="max-w-[95vw] max-h-[95vh] object-contain rounded"
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-[95vw] max-h-[95vh] rounded bg-black"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
