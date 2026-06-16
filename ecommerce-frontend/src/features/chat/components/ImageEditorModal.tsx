import React, { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import {
  X, RotateCw, Undo2, Check,
  Crop as CropIcon, Pencil, Smile, RefreshCcw,
  Minus, Plus,
} from 'lucide-react';
import { getCroppedImg } from '../utils/cropUtils';

// ── Types ─────────────────────────────────────────────────────────────────────
type EditorTab = 'crop' | 'draw' | 'sticker';

interface DrawLine {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface StickerItem {
  id: string;
  emoji: string;
  x: number;     // percent of image width
  y: number;     // percent of image height
  size: number;  // px
}

interface Props {
  imageSrc: string;
  onDone: (editedFile: File) => void;
  onCancel: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BRUSH_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
const BRUSH_SIZES = [3, 6, 12];
const STICKER_EMOJIS = [
  '😀','😂','🥰','😍','🤩','😎','🥳','🤔','😅','😭',
  '😱','🤯','😴','🤗','😏','🙄','😤','🥺','😇','🤣',
  '👍','👎','👏','🙌','❤️','🔥','✨','💯','🎉','🙏',
  '💪','👀','🌟','⭐','🌈','🦄','💀','🤡','👻','💩',
];

const ASPECT_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: 'Tự do', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

// ── Component ─────────────────────────────────────────────────────────────────
const ImageEditorModal: React.FC<Props> = ({ imageSrc, onDone, onCancel }) => {
  const [tab, setTab] = useState<EditorTab>('crop');

  // ── Crop state ──
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspectIdx, setAspectIdx] = useState(0);
  const [croppedSrc, setCroppedSrc] = useState<string | null>(null); // after applying crop

  // ── Draw state ──
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushSizeIdx, setBrushSizeIdx] = useState(1); // index of BRUSH_SIZES
  const isDrawingRef = useRef(false);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawContainerRef = useRef<HTMLDivElement>(null);

  // ── Sticker state ──
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const draggingSticker = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ── Processing ──
  const [processing, setProcessing] = useState(false);

  // The "working" image — either original or post-crop
  const workingSrc = croppedSrc || imageSrc;

  // ── Crop callbacks ──
  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApplyCrop = useCallback(async () => {
    if (!croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const url = URL.createObjectURL(blob);
      setCroppedSrc(url);
      // Reset crop state
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setTab('draw'); // Switch to draw tab after crop
    } catch (e) {
      console.error('Crop failed:', e);
    }
  }, [imageSrc, croppedAreaPixels, rotation]);

  const handleResetAll = () => {
    if (croppedSrc) URL.revokeObjectURL(croppedSrc);
    setCroppedSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setLines([]);
    setStickers([]);
    setTab('crop');
  };

  // ── Draw logic ──
  const getCanvasCoord = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tab !== 'draw') return;
    const coord = getCanvasCoord(e);
    if (!coord) return;
    isDrawingRef.current = true;
    setLines(prev => [...prev, { points: [coord], color: brushColor, width: BRUSH_SIZES[brushSizeIdx] }]);
  };

  const continueDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || tab !== 'draw') return;
    const coord = getCanvasCoord(e);
    if (!coord) return;
    setLines(prev => {
      const newLines = [...prev];
      const last = { ...newLines[newLines.length - 1] };
      last.points = [...last.points, coord];
      newLines[newLines.length - 1] = last;
      return newLines;
    });
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleUndo = () => {
    if (lines.length > 0) setLines(prev => prev.slice(0, -1));
    else if (stickers.length > 0) setStickers(prev => prev.slice(0, -1));
  };

  // Redraw canvas whenever lines change
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const line of lines) {
      if (line.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const [first, ...rest] = line.points;
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      for (const p of rest) {
        ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      }
      ctx.stroke();
    }
  }, [lines]);

  // ── Sticker drag logic ──
  const handleAddSticker = (emoji: string) => {
    setStickers(prev => [
      ...prev,
      { id: `${Date.now()}_${Math.random()}`, emoji, x: 50, y: 50, size: 40 },
    ]);
  };

  const startStickerDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const container = drawContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;
    draggingSticker.current = {
      id,
      startX: clientX - rect.left,
      startY: clientY - rect.top,
      origX: sticker.x,
      origY: sticker.y,
    };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!draggingSticker.current || draggingSticker.current.id !== id) return;
      let cx: number, cy: number;
      if ('touches' in ev) {
        cx = ev.touches[0].clientX;
        cy = ev.touches[0].clientY;
      } else {
        cx = ev.clientX;
        cy = ev.clientY;
      }
      const dx = ((cx - rect.left) - draggingSticker.current.startX) / rect.width * 100;
      const dy = ((cy - rect.top) - draggingSticker.current.startY) / rect.height * 100;
      setStickers(prev => prev.map(s =>
        s.id === id
          ? { ...s, x: Math.max(0, Math.min(100, draggingSticker.current!.origX + dx)), y: Math.max(0, Math.min(100, draggingSticker.current!.origY + dy)) }
          : s
      ));
    };

    const onEnd = () => {
      draggingSticker.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const resizeSticker = (id: string, delta: number) => {
    setStickers(prev =>
      prev.map(s => s.id === id ? { ...s, size: Math.max(20, Math.min(100, s.size + delta)) } : s)
    );
  };

  // ── Final export ──
  const handleDone = async () => {
    setProcessing(true);
    try {
      // Build final canvas with image + drawings + stickers
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = workingSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // Draw lines
      for (const line of lines) {
        if (line.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width * (img.naturalWidth / 400); // scale brush to image size
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const [first, ...rest] = line.points;
        ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
        for (const p of rest) {
          ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
        }
        ctx.stroke();
      }

      // Draw stickers (emoji as text)
      for (const sticker of stickers) {
        const fontSize = sticker.size * (img.naturalWidth / 400);
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          sticker.emoji,
          (sticker.x / 100) * canvas.width,
          (sticker.y / 100) * canvas.height,
        );
      }

      // Export
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('export failed'))), 'image/jpeg', 0.92)
      );
      const file = new File([blob], 'edited_image.jpg', { type: 'image/jpeg' });
      onDone(file);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setProcessing(false);
    }
  };

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (croppedSrc) URL.revokeObjectURL(croppedSrc);
    };
  }, [croppedSrc]);

  // ── Render ──
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
        >
          <X className="w-5 h-5" /> Huỷ
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Đặt lại
          </button>
          <button
            onClick={handleUndo}
            disabled={lines.length === 0 && stickers.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm disabled:opacity-30"
          >
            <Undo2 className="w-4 h-4" /> Hoàn tác
          </button>
        </div>
        <button
          onClick={handleDone}
          disabled={processing}
          className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-lg shadow-orange-500/30"
        >
          <Check className="w-4 h-4" />
          {processing ? 'Đang xử lý...' : 'Xong'}
        </button>
      </div>

      {/* ── Main canvas area ── */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {tab === 'crop' ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECT_OPTIONS[aspectIdx].value}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: '#000' },
            }}
          />
        ) : (
          <div
            ref={drawContainerRef}
            className="relative max-w-full max-h-full flex items-center justify-center"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Base image */}
            <img
              src={workingSrc}
              alt="Editing"
              className="max-w-full max-h-full object-contain select-none pointer-events-none"
              draggable={false}
              onLoad={(e) => {
                // Sync canvas size to displayed image size
                const img = e.currentTarget;
                const canvas = drawCanvasRef.current;
                if (canvas) {
                  canvas.width = img.clientWidth;
                  canvas.height = img.clientHeight;
                  canvas.style.width = `${img.clientWidth}px`;
                  canvas.style.height = `${img.clientHeight}px`;
                  canvas.style.left = `${img.offsetLeft}px`;
                  canvas.style.top = `${img.offsetTop}px`;
                }
              }}
            />
            {/* Drawing canvas overlay */}
            <canvas
              ref={drawCanvasRef}
              className="absolute"
              style={{ cursor: tab === 'draw' ? 'crosshair' : 'default', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={continueDrawing}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={continueDrawing}
              onTouchEnd={endDrawing}
            />
            {/* Stickers overlay */}
            {stickers.map((s) => (
              <div
                key={s.id}
                className="absolute select-none group/sticker"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'grab',
                  touchAction: 'none',
                  zIndex: 10,
                  /* Extend hover zone above the emoji so mouse can reach controls */
                  paddingTop: '32px',
                  marginTop: '-32px',
                }}
                onMouseDown={(e) => startStickerDrag(s.id, e)}
                onTouchStart={(e) => startStickerDrag(s.id, e)}
              >
                {/* Controls — sits inside the padded area, no gap */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover/sticker:flex items-center gap-0.5 bg-black/80 rounded-full px-1.5 py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); resizeSticker(s.id, -6); }}
                    className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); resizeSticker(s.id, 6); }}
                    className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSticker(s.id); }}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="leading-none" style={{ fontSize: `${s.size}px` }}>{s.emoji}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom toolbar ── */}
      <div className="bg-black/60 backdrop-blur-sm border-t border-white/10">
        {/* Tab-specific controls */}
        <div className="px-4 py-3 min-h-[56px] flex items-center justify-center gap-3">
          {tab === 'crop' && (
            <>
              {/* Zoom slider */}
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <span>Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-24 accent-orange-500"
                />
                <span className="w-8 text-center">{zoom.toFixed(1)}x</span>
              </div>
              {/* Rotate button */}
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 text-xs transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" /> Xoay
              </button>
              {/* Aspect Ratio */}
              <div className="flex gap-1">
                {ASPECT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => setAspectIdx(i)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                      aspectIdx === i ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Apply crop */}
              <button
                onClick={handleApplyCrop}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors shadow-lg"
              >
                <Check className="w-3.5 h-3.5" /> Áp dụng cắt
              </button>
            </>
          )}

          {tab === 'draw' && (
            <>
              {/* Color palette */}
              <div className="flex items-center gap-1.5">
                {BRUSH_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBrushColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      brushColor === c ? 'border-orange-400 scale-110 ring-2 ring-orange-400/40' : 'border-white/20 hover:border-white/50'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {/* Brush size */}
              <div className="flex items-center gap-1 ml-2">
                {BRUSH_SIZES.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setBrushSizeIdx(i)}
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                      brushSizeIdx === i ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    <div
                      className="rounded-full bg-white"
                      style={{ width: `${s + 2}px`, height: `${s + 2}px` }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'sticker' && (
            <div className="flex flex-wrap gap-1 max-w-md max-h-24 overflow-y-auto px-2 py-1 custom-scrollbar">
              {STICKER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddSticker(emoji)}
                  className="text-2xl p-1 hover:bg-white/10 rounded-lg transition-colors leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-1 px-4 pb-4 pt-1">
          {([
            { key: 'crop' as EditorTab, icon: CropIcon, label: 'Cắt' },
            { key: 'draw' as EditorTab, icon: Pencil, label: 'Vẽ' },
            { key: 'sticker' as EditorTab, icon: Smile, label: 'Sticker' },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ImageEditorModal);
