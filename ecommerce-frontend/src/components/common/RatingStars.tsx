import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
}

const RatingStars: React.FC<RatingStarsProps> = ({ rating, reviewCount, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(rating);
          const halfFilled = !filled && star <= rating + 0.5;
          return (
            <Star
              key={star}
              className={`${sizeClass} ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : halfFilled
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'fill-transparent text-gray-300'
              }`}
            />
          );
        })}
      </div>
      {typeof reviewCount === 'number' && (
        <span className={`${textClass} text-muted-foreground`}>
          {rating.toFixed(1)} ({reviewCount} đánh giá)
        </span>
      )}
    </div>
  );
};

export default React.memo(RatingStars);
