import React, { useState } from 'react';
import { X, BarChart2, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import { useCreatePoll } from '../hooks/useGroup';

interface Props {
  groupId: string;
  onClose: () => void;
}

const QUICK_CLOSE: { label: string; minutes: number }[] = [
  { label: '30 phút', minutes: 30 },
  { label: '1 giờ', minutes: 60 },
  { label: '2 giờ', minutes: 120 },
  { label: '6 giờ', minutes: 360 },
  { label: '1 ngày', minutes: 1440 },
  { label: '3 ngày', minutes: 4320 },
];

export default function CreatePollModal({ groupId, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultiple, setIsMultiple] = useState(false);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');
  const createPoll = useCreatePoll(groupId);

  const addOption = () => { if (options.length < 10) setOptions([...options, '']); };
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, val: string) => setOptions(options.map((o, idx) => idx === i ? val : o));

  const applyQuickClose = (minutes: number) => {
    const d = new Date(Date.now() + minutes * 60000);
    setDeadline(d.toISOString().slice(0, 16));
    setHasDeadline(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;
    let autoCloseAt: number | null = null;
    if (hasDeadline && deadline) {
      const ts = new Date(deadline).getTime();
      if (!isNaN(ts) && ts > Date.now()) autoCloseAt = ts;
    }
    createPoll.mutate(
      { question: question.trim(), options: validOptions, isMultiple, autoCloseAt },
      { onSuccess: onClose }
    );
  };

  const minDeadline = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <BarChart2 className="w-4 h-4 text-purple-500" /> Tạo bình chọn
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Question */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Câu hỏi *</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Nhập câu hỏi bình chọn..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Các lựa chọn *</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Lựa chọn ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button type="button" onClick={addOption} className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Thêm lựa chọn
              </button>
            )}
          </div>

          {/* Multiple choice */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isMultiple} onChange={(e) => setIsMultiple(e.target.checked)} className="w-4 h-4 accent-purple-500" />
            <span className="text-sm text-gray-700">Cho phép chọn nhiều đáp án</span>
          </label>

          {/* Optional deadline */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={hasDeadline} onChange={(e) => { setHasDeadline(e.target.checked); if (!e.target.checked) setDeadline(''); }} className="w-4 h-4 accent-purple-500" />
              <span className="text-sm text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Đặt thời gian kết thúc
              </span>
            </label>

            {hasDeadline && (
              <div className="space-y-2 pl-7">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CLOSE.map((p) => (
                    <button
                      key={p.minutes}
                      type="button"
                      onClick={() => applyQuickClose(p.minutes)}
                      className="text-[11px] px-2 py-1 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 font-medium transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={minDeadline}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2 || createPoll.isPending}
            className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {createPoll.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo bình chọn
          </button>
        </form>
      </div>
    </div>
  );
}
