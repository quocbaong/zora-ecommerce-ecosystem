import { Check, Star } from 'lucide-react';
import { useCategories } from '@/features/product/hooks/useCategories';

const PRICE_RANGES = [
  { label: 'Dưới 200k', min: undefined as number | undefined, max: 200000 },
  { label: '200k – 500k', min: 200000, max: 500000 },
  { label: '500k – 1tr', min: 500000, max: 1000000 },
  { label: '1tr – 5tr', min: 1000000, max: 5000000 },
  { label: 'Trên 5 triệu', min: 5000000, max: undefined as number | undefined },
];

interface FilterSidebarProps {
  categoryId?: string;
  onCategoryChange: (id: string) => void;
  minPrice?: number;
  maxPrice?: number;
  onPriceChange: (min?: number, max?: number) => void;
  rating?: number;
  onRatingChange: (rating?: number) => void;
}

export default function FilterSidebar({
  categoryId,
  onCategoryChange,
  minPrice,
  maxPrice,
  onPriceChange,
  rating,
  onRatingChange,
}: FilterSidebarProps) {
  const { data: categories } = useCategories();

  const selectedPriceIndex = PRICE_RANGES.findIndex(
    (r) => r.min === minPrice && r.max === maxPrice
  );

  const toggleRating = (star: number) => {
    if (rating === star) {
      onRatingChange(undefined);
    } else {
      onRatingChange(star);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Categories */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Danh mục
        </h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => onCategoryChange('')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !categoryId
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {!categoryId
                ? <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                : <span className="h-4 w-4 flex-shrink-0" />
              }
              Tất cả
            </button>
          </li>
          {categories?.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => onCategoryChange(cat.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  categoryId === cat.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {categoryId === cat.id
                  ? <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                  : <span className="h-4 w-4 flex-shrink-0" />
                }
                {cat.imageUrl && (
                  <img src={cat.imageUrl} alt={cat.name} className="h-5 w-5 flex-shrink-0 rounded object-cover" />
                )}
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Khoảng giá
        </h3>
        <ul className="space-y-0.5">
          {PRICE_RANGES.map((range, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                <input
                  type="radio"
                  name="priceRange"
                  checked={selectedPriceIndex === i}
                  onChange={() => onPriceChange(range.min, range.max)}
                  className="accent-primary"
                />
                {range.label}
              </label>
            </li>
          ))}
        </ul>
        {selectedPriceIndex !== -1 && (
          <button
            onClick={() => onPriceChange(undefined, undefined)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Xoá bộ lọc giá
          </button>
        )}
      </div>

      {/* Rating */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Đánh giá
        </h3>

        <ul className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const isChecked = rating === star;
            return (
              <li key={star}>
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRating(star)}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 checked:border-pink-500 checked:bg-pink-500 transition-all"
                    />
                    <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 left-0.5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < star ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    {star < 5 && <span className="text-xs text-muted-foreground">trở lên</span>}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
        {rating !== undefined && (
          <button
            onClick={() => onRatingChange(undefined)}
            className="mt-4 text-xs text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
