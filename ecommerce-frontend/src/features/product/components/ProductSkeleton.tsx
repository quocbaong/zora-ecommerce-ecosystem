import React from 'react';

const ProductSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-square bg-muted" />

      {/* Info placeholder */}
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-5 w-1/3 rounded bg-muted" />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3.5 w-3.5 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
};

export default React.memo(ProductSkeleton);
