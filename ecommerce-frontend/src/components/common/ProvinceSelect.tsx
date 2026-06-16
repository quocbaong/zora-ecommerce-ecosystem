import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { PROVINCES } from '@/data/vietnamLocations';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ProvinceSelect({ value, onChange, placeholder = 'Chọn tỉnh / thành phố', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = PROVINCES.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch('');
  }, [open]);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-sm transition-all focus:outline-none
          ${open ? 'border-orange-400 ring-2 ring-orange-400/30' : 'border-gray-200 hover:border-gray-300'}
          ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <span onClick={handleClear} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tỉnh / thành phố..."
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
            />
          </div>

          {/* List */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">Không tìm thấy</li>
            ) : (
              filtered.map((p) => (
                <li key={p.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p.name)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors
                      ${value === p.name
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {p.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
