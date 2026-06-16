import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Smile, Plus, X, FileText, Video, Mic, Square, BarChart2, Bell, AlertCircle, UserSquare2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupMessage, GroupMember, ReplyTo } from '../types/group';
import ImageEditorModal from './ImageEditorModal';
import GifPickerPanel from './GifPickerPanel';

const EMOJI_LIST = [
  '😀','😂','🥰','😍','🤩','😎','🥳','🤔','😅','😭',
  '😱','🤯','😴','🤗','😏','🙄','😤','🥺','😇','🤣',
  '👍','👎','👏','🙌','🤝','❤️','🔥','✨','💯','🎉',
];

interface Props {
  onSend: (content: string, type?: string, replyTo?: ReplyTo | null, mentions?: string[], important?: boolean) => void;
  onUploadFile: (file: File) => Promise<void>;
  onTyping: () => void;
  onOpenPoll: () => void;
  onOpenReminder: () => void;
  onOpenContactPicker: () => void;
  members: GroupMember[];
  profileCache?: Record<string, { name: string; avatarUrl?: string }>;
  currentUserId: string;
  replyingTo: GroupMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
  postingBlocked?: boolean;
}

function formatDuration(sec: number) {
  return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
}

export default function GroupChatInput({
  onSend,
  onUploadFile,
  onTyping,
  onOpenPoll,
  onOpenReminder,
  onOpenContactPicker,
  members,
  profileCache = {},
  currentUserId,
  replyingTo,
  onCancelReply,
  disabled,
  postingBlocked = false,
}: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPlus, setShowPlus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [showGif, setShowGif] = useState(false);

  // Image editor state (single image only)
  const [editorSrc, setEditorSrc] = useState<string | null>(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Close emoji on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const handleTyping = useCallback(() => {
    onTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {}, 2000);
  }, [onTyping]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    handleTyping();

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const getMemberDisplayName = (m: GroupMember) =>
    m.nickname || profileCache[m.userId]?.name || 'Người dùng';

  const insertMention = (member: GroupMember) => {
    const display = getMemberDisplayName(member);
    const before = text.slice(0, mentionStart);
    const after = text.slice(textareaRef.current?.selectionStart ?? mentionStart + (mentionQuery?.length ?? 0) + 1);
    const newText = `${before}@${display} ${after}`;
    setText(newText);
    setPendingMentions((prev) => [...prev, member.userId]);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const mentionSuggestions = mentionQuery !== null
    ? members.filter(
        (m) => m.userId !== currentUserId &&
          getMemberDisplayName(m).toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || uploading || disabled || sendingRef.current) return;
    sendingRef.current = true;

    const replyTo = replyingTo
      ? { messageId: replyingTo.messageId, senderId: replyingTo.senderId, content: replyingTo.content, type: replyingTo.type }
      : null;

    onSend(trimmed, 'TEXT', replyTo, pendingMentions, isImportant);
    setText('');
    setPendingMentions([]);
    setIsImportant(false);
    onCancelReply();

    setTimeout(() => { sendingRef.current = false; }, 300);
    // Refocus textarea so user can keep typing without re-clicking.
    // preventScroll: true → don't let the browser auto-scroll any ancestor
    // container to bring the textarea into view (it's already visible and
    // any scroll here would conflict with the messages-list scrollToBottom).
    textareaRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileInput = async (files: FileList | null, isImage = false) => {
    if (!files || files.length === 0) return;
    setShowPlus(false);

    let fileList = Array.from(files);
    if (isImage && fileList.length > 10) {
      toast.warning('Chỉ có thể gửi tối đa 10 ảnh cùng lúc.');
      fileList = fileList.slice(0, 10);
    }

    if (isImage && fileList.length === 1) {
      if (editorSrc) URL.revokeObjectURL(editorSrc);
      setEditorSrc(URL.createObjectURL(fileList[0]));
      return;
    }

    setUploading(true);
    try {
      for (const file of fileList) {
        await onUploadFile(file);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleEditorDone = async (editedFile: File) => {
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    setEditorSrc(null);
    setUploading(true);
    try {
      await onUploadFile(editedFile);
    } finally {
      setUploading(false);
    }
  };

  const handleEditorCancel = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    setEditorSrc(null);
  };

  // ─── Voice recording ─────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading(true);
        try { await onUploadFile(file); } finally { setUploading(false); }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch { /* mic denied */ }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // Posting blocked banner
  if (postingBlocked) {
    return (
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 shrink-0 flex items-center gap-2 text-gray-400 text-sm">
        <Lock className="w-4 h-4 shrink-0" />
        <span>Chỉ trưởng nhóm và phó nhóm mới được gửi tin nhắn</span>
      </div>
    );
  }

  return (
    <>
    {editorSrc && (
      <ImageEditorModal
        imageSrc={editorSrc}
        onDone={handleEditorDone}
        onCancel={handleEditorCancel}
      />
    )}
    <div className="border-t border-gray-100 bg-white px-3 py-2 shrink-0 relative">
      {/* Important badge */}
      {isImportant && (
        <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-xs text-red-600 font-medium flex-1">Tin nhắn quan trọng — chữ to, màu đỏ</span>
          <button onClick={() => setIsImportant(false)} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-start gap-2 mb-2 px-2 py-1.5 bg-orange-50 border-l-2 border-orange-400 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-orange-500">
              {members.find((m) => m.userId === replyingTo.senderId)?.nickname || 'Ai đó'}
            </p>
            <p className="text-xs text-gray-600 truncate">{replyingTo.content.slice(0, 80)}</p>
          </div>
          <button onClick={onCancelReply} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* @mention suggestions */}
      {mentionSuggestions.length > 0 && (
        <div className="absolute bottom-full mb-1 left-3 right-3 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20">
          {mentionSuggestions.map((m) => {
            const displayName = getMemberDisplayName(m);
            const avatarUrl = profileCache[m.userId]?.avatarUrl;
            return (
              <button
                key={m.userId}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-orange-50 text-sm text-left transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    : displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
                  {m.nickname && <p className="text-[10px] text-gray-400 truncate">{profileCache[m.userId]?.name}</p>}
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  m.role === 'OWNER' ? 'bg-yellow-100 text-yellow-700' :
                  m.role === 'DEPUTY' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {m.role === 'OWNER' ? 'Trưởng nhóm' : m.role === 'DEPUTY' ? 'Phó nhóm' : 'Thành viên'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Plus menu */}
        <div className="relative">
          <button
            onClick={() => setShowPlus((v) => !v)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition"
          >
            <Plus className="w-5 h-5" />
          </button>
          {showPlus && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[170px] z-20">
              <button onClick={() => { imageInputRef.current?.click(); setShowPlus(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                <ImageIcon className="w-4 h-4 text-green-500" /> Hình ảnh
              </button>
              <button onClick={() => { videoInputRef.current?.click(); setShowPlus(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                <Video className="w-4 h-4 text-blue-500" /> Video
              </button>
              <button onClick={() => { fileInputRef.current?.click(); setShowPlus(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                <FileText className="w-4 h-4 text-red-500" /> File PDF
              </button>
              <div className="border-t my-1" />
              <button
                onClick={() => { setIsImportant((v) => !v); setShowPlus(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 ${isImportant ? 'text-red-600 font-medium' : 'text-gray-700'}`}
              >
                <AlertCircle className={`w-4 h-4 ${isImportant ? 'text-red-500' : 'text-red-400'}`} />
                {isImportant ? 'Bỏ đánh dấu quan trọng' : 'Tin nhắn quan trọng'}
              </button>
              <button onClick={() => { onOpenContactPicker(); setShowPlus(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                <UserSquare2 className="w-4 h-4 text-teal-500" /> Gửi danh thiếp
              </button>
              <div className="border-t my-1" />
              <button onClick={() => { onOpenPoll(); setShowPlus(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                <BarChart2 className="w-4 h-4 text-purple-500" /> Bình chọn
              </button>
              <button onClick={() => { onOpenReminder(); setShowPlus(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                <Bell className="w-4 h-4 text-orange-500" /> Nhắc hẹn
              </button>
            </div>
          )}

          {/* GIF picker */}
          {showGif && (
            <GifPickerPanel
              onSelect={(url) => { onSend(url, 'GIF'); setShowGif(false); }}
              onClose={() => setShowGif(false)}
            />
          )}
        </div>

        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFileInput(e.target.files, true); e.target.value = ''; }} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { handleFileInput(e.target.files); e.target.value = ''; }} />
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { handleFileInput(e.target.files); e.target.value = ''; }} />

        {/* Textarea */}
        <div className="relative flex-1">
          {isRecording ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatDuration(recordSeconds)}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn... (@ để mention)"
              // Never disable during a pending send — losing focus mid-typing
              // breaks UX. `postingBlocked` is handled separately with a banner
              // (early return above). Send is gated by sendingRef debounce + disabled prop.
              rows={1}
              className={`w-full resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 max-h-[120px] overflow-y-auto transition ${
                isImportant
                  ? 'border-red-300 focus:ring-red-300 bg-red-50/40'
                  : 'border-gray-200 focus:ring-orange-300'
              }`}
            />
          )}
        </div>

        {/* GIF button */}
        <button
          onClick={() => { setShowGif((v) => !v); setShowPlus(false); setShowEmoji(false); }}
          className={`p-2 rounded-xl transition text-xs font-black tracking-tight ${showGif ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          GIF
        </button>

        {/* Emoji */}
        <div className="relative" ref={emojiRef}>
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition"
          >
            <Smile className="w-5 h-5" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-xl shadow-xl p-2 grid grid-cols-10 gap-0.5 z-20 w-72">
              {EMOJI_LIST.map((e) => (
                <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }} className="text-lg hover:scale-125 transition-transform">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Voice / Send */}
        {isRecording ? (
          <button onClick={stopRecording} className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition">
            <Square className="w-5 h-5" />
          </button>
        ) : text.trim() ? (
          <button
            onClick={handleSend}
            disabled={disabled || uploading}
            className={`p-2 rounded-xl disabled:opacity-50 text-white transition ${
              isImportant ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={startRecording} disabled={disabled || uploading} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 disabled:opacity-50 transition">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
    </>
  );
}
