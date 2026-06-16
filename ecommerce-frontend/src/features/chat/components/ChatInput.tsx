import React, { useState, useRef, FormEvent, KeyboardEvent, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Send, Image as ImageIcon, Smile, Plus, X, FileText, Video, Receipt, Pencil, Mic, Square, Ticket } from 'lucide-react';
import ImageEditorModal from './ImageEditorModal';
import GifPickerPanel from './GifPickerPanel';

interface Props {
  onSend: (content: string, type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'INVOICE' | 'VOUCHER' | 'GIF') => void;
  onUploadFile: (file: File) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  onOpenInvoice?: () => void;
  onOpenVoucher?: () => void;
  disabled?: boolean;
}

const EMOJI_LIST = [
  '😀','😂','🥰','😍','🤩','😎','🥳','🤔','😅','😭',
  '😱','🤯','😴','🤗','😏','🙄','😤','🥺','😇','🤣',
  '👍','👎','👏','🙌','🤝','🤜','❤️','🔥','✨','💯',
  '🎉','🎊','🙏','💪','👀','💀','🤡','👻','💩','🦄',
  '🌟','⭐','🌈','🌸','🌺','🍕','🍔','☕','🍰','🎂',
];

const IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp';
const VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime,video/x-msvideo';
const FILE_TYPES  = 'application/pdf';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ChatInput: React.FC<Props> = ({ onSend, onUploadFile, onTyping, onOpenInvoice, onOpenVoucher, disabled }) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [preview, setPreview] = useState<{ name: string; type: string; file: File; objectUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const emojiRef      = useRef<HTMLDivElement>(null);
  const gifRef        = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const isTypingRef   = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Revoke object URL on unmount / preview change
  useEffect(() => {
    return () => { if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl); };
  }, [preview]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close GIF picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gifRef.current && !gifRef.current.contains(e.target as Node)) setShowGif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const stopTyping = () => {
    if (isTypingRef.current) { onTyping(false); isTypingRef.current = false; }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!isTypingRef.current) { onTyping(true); isTypingRef.current = true; }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 1000);
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (preview) { handleSendFile(); return; }
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    onTyping(false);
    isTypingRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    // Keep focus on the textarea so the user can keep typing without re-clicking
    textareaRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let fileArray = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (fileArray.length === 0) return;

    // Limit to 10 images at once
    if (fileArray.length > 10) {
      toast.warning('Chỉ có thể gửi tối đa 10 ảnh cùng lúc.');
      fileArray = fileArray.slice(0, 10);
    }

    // Multiple images selected → skip editor, upload all directly
    if (fileArray.length > 1) {
      setUploading(true);
      try {
        for (const file of fileArray) {
          await onUploadFile(file);
        }
      } finally {
        setUploading(false);
      }
      return;
    }

    const file = fileArray[0];
    if (file.type.startsWith('image/')) {
      if (editorSrc) URL.revokeObjectURL(editorSrc);
      const src = URL.createObjectURL(file);
      setEditorSrc(src);
      setShowEditor(true);
      return;
    }
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    setPreview({ name: file.name, type: file.type, file, objectUrl: URL.createObjectURL(file) });
  };

  const openEditorForPreview = () => {
    if (!preview || !preview.type.startsWith('image/')) return;
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    const src = URL.createObjectURL(preview.file);
    setEditorSrc(src);
    setShowEditor(true);
  };

  const handleEditorDone = (editedFile: File) => {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    setEditorSrc(null);
    setShowEditor(false);
    setPreview({
      name: editedFile.name,
      type: editedFile.type,
      file: editedFile,
      objectUrl: URL.createObjectURL(editedFile),
    });
  };

  const handleEditorCancel = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    setEditorSrc(null);
    setShowEditor(false);
  };

  const handleSendFile = async () => {
    if (!preview || uploading) return;
    setUploading(true);
    try {
      await onUploadFile(preview.file);
      if (preview.objectUrl) URL.revokeObjectURL(preview.objectUrl);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
  };

  // ── Voice recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecording || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });

        setIsRecording(false);
        setRecordSeconds(0);

        if (blob.size > 0) {
          setUploading(true);
          try {
            await onUploadFile(file);
          } finally {
            setUploading(false);
          }
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      // Microphone permission denied or not available — silently ignore
    }
  }, [isRecording, disabled, onUploadFile]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    audioChunksRef.current = []; // clear so onstop uploads nothing
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Clear chunks before stopping so onstop skips upload
      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
        setRecordSeconds(0);
      };
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordSeconds(0);
  }, []);

  const isImage = preview?.type.startsWith('image/');
  const isVideo = preview?.type.startsWith('video/');
  const isAudio = preview?.type.startsWith('audio/');

  return (
    <div className="border-t border-gray-200 bg-white px-4 pt-3 pb-4 relative">
      {/* File preview */}
      {preview && (
        <div className="mb-3 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          {isImage ? (
            <div className="relative shrink-0">
              <img src={preview.objectUrl} alt={preview.name} className="w-14 h-14 object-cover rounded-lg" />
              <button
                type="button"
                onClick={openEditorForPreview}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-colors"
                title="Chỉnh sửa ảnh"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ) : isVideo ? (
            <video src={preview.objectUrl} className="w-14 h-14 object-cover rounded-lg shrink-0 bg-black" />
          ) : isAudio ? (
            <div className="w-14 h-14 flex items-center justify-center bg-orange-100 rounded-lg shrink-0">
              <Mic className="w-6 h-6 text-orange-500" />
            </div>
          ) : (
            <div className="w-14 h-14 flex items-center justify-center bg-orange-100 rounded-lg shrink-0">
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{preview.name}</p>
            <p className="text-xs text-gray-400">
              {isImage ? 'Ảnh' : isVideo ? 'Video' : isAudio ? 'Tin nhắn thoại' : 'Tài liệu PDF'}
            </p>
          </div>
          <button type="button" onClick={clearPreview} className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Editor Modal */}
      {showEditor && editorSrc && (
        <ImageEditorModal
          imageSrc={editorSrc}
          onDone={handleEditorDone}
          onCancel={handleEditorCancel}
        />
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mb-3 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-medium text-red-600 flex-1">Đang ghi âm... {formatDuration(recordSeconds)}</span>
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Huỷ"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
            title="Dừng và gửi"
          >
            <Square className="w-3 h-3 fill-current" />
            Gửi
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Left icons */}
        <div className="flex items-center gap-0.5 shrink-0 pb-1">
          {/* PDF */}
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || isRecording}
            className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-40" aria-label="Đính kèm PDF">
            <Plus className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept={FILE_TYPES} className="hidden" onChange={pickFile} />

          {/* Image */}
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={disabled || isRecording}
            className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-40" aria-label="Gửi ảnh">
            <ImageIcon className="w-5 h-5" />
          </button>
          <input ref={imageInputRef} type="file" accept={IMAGE_TYPES} multiple className="hidden" onChange={pickFile} />

          {/* Video */}
          <button type="button" onClick={() => videoInputRef.current?.click()} disabled={disabled || isRecording}
            className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-40" aria-label="Gửi video">
            <Video className="w-5 h-5" />
          </button>
          <input ref={videoInputRef} type="file" accept={VIDEO_TYPES} className="hidden" onChange={pickFile} />

          {/* Invoice */}
          <button type="button" onClick={onOpenInvoice} disabled={disabled || isRecording}
            className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-40" aria-label="Gửi hoá đơn">
            <Receipt className="w-5 h-5" />
          </button>

          {/* Voucher (chỉ hiện nếu được wire — seller side) */}
          {onOpenVoucher && (
            <button type="button" onClick={onOpenVoucher} disabled={disabled || isRecording}
              className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-40" aria-label="Gửi voucher">
              <Ticket className="w-5 h-5" />
            </button>
          )}

          {/* Emoji */}
          <div className="relative" ref={emojiRef}>
            <button type="button" onClick={() => setShowEmoji((v) => !v)} disabled={disabled || isRecording}
              className={`p-2 rounded-full transition-colors disabled:opacity-40 ${showEmoji ? 'text-orange-500 bg-orange-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`} aria-label="Emoji">
              <Smile className="w-5 h-5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-64">
                <div className="grid grid-cols-10 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => handleEmojiClick(emoji)}
                      className="text-xl hover:bg-gray-100 rounded-lg p-0.5 transition-colors leading-none">
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GIF */}
          <div className="relative" ref={gifRef}>
            <button
              type="button"
              onClick={() => { setShowGif((v) => !v); setShowEmoji(false); }}
              disabled={disabled || isRecording}
              className={`p-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-40 ${showGif ? 'text-orange-500 bg-orange-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
              aria-label="GIF"
            >
              GIF
            </button>
            {showGif && (
              <GifPickerPanel
                onSelect={(url) => { onSend(url, 'GIF'); setShowGif(false); }}
                onClose={() => setShowGif(false)}
              />
            )}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={preview ? 'Thêm chú thích...' : isRecording ? 'Đang ghi âm...' : 'Nhập tin nhắn...'}
          rows={1}
          // Don't disable while a send is in-flight — user can keep typing the
          // next message. Send button is still gated by `disabled`.
          disabled={isRecording}
          className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-300 focus:bg-white transition-all max-h-32 leading-relaxed disabled:opacity-60"
          style={{ minHeight: '42px' }}
        />

        {/* Mic button (shown when no text and no preview) OR Send button */}
        {!text.trim() && !preview && !isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled || uploading}
            aria-label="Ghi âm"
            className="p-2.5 rounded-full bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-500 disabled:opacity-40 transition-all shrink-0 mb-0.5"
          >
            <Mic className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || uploading || (isRecording ? false : (!text.trim() && !preview))}
            aria-label="Gửi"
            className="p-2.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>

      <p className="text-[11px] text-gray-400 text-center mt-2">
        Enter để gửi • Shift+Enter xuống dòng • Giữ mic để ghi âm
      </p>
    </div>
  );
};

export default React.memo(ChatInput);
