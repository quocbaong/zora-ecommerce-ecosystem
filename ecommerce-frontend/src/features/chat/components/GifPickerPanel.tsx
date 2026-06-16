import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { giphyService, type GiphyResult } from '../services/giphyService';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function GifPickerPanel({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const fn = debouncedQuery.trim()
      ? giphyService.search(debouncedQuery)
      : giphyService.trending();
    fn.then((data) => { if (!cancelled) setGifs(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  return (
    <div className="absolute bottom-full mb-2 left-0 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden flex flex-col">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm GIF..."
          className="flex-1 text-sm outline-none bg-transparent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Label */}
      <div className="px-3 py-1 bg-gray-50 border-b shrink-0">
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
          {query.trim() ? `Kết quả "${query}"` : 'Đang thịnh hành'}
        </span>
      </div>

      {/* Grid */}
      <div className="h-60 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Không thể tải GIF
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Không tìm thấy GIF nào
          </div>
        ) : (
          <div className="columns-3 gap-1.5 space-y-1.5">
            {gifs.map((gif) => {
              const small = gif.images.fixed_height_small;
              const still = gif.images.fixed_height_small_still;
              return (
                <button
                  key={gif.id}
                  onClick={() => onSelect(gif.images.fixed_height.url)}
                  className="w-full rounded-lg overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-300 break-inside-avoid block"
                >
                  <img
                    src={still.url}
                    data-src-animated={small.url}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.src = el.dataset.srcAnimated!;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.src = still.url;
                    }}
                    alt={gif.title}
                    loading="lazy"
                    className="w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Giphy attribution — required by ToS */}
      <div className="px-3 py-1.5 border-t bg-gray-50 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-gray-400">Powered by</span>
        <img
          src="https://giphy.com/static/img/giphy_logo_square_social.png"
          alt="GIPHY"
          className="h-4"
        />
      </div>
    </div>
  );
}
