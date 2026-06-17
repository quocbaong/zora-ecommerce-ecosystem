import { useState, useEffect } from 'react';
import { useProductDetail } from '@/features/product/hooks/useProducts';
import ProductCard from './ProductCard';
import { Sparkles } from 'lucide-react';
import type { Product } from '@/types/api.types';

const RecommendedProductItem = ({ productId }: { productId: string }) => {
  const { data: product, isLoading } = useProductDetail(productId);

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  if (!product) return null;

  return <ProductCard product={product} />;
};

export default function RecommendedProducts({ productIds }: { productIds: string[] }) {
  if (!productIds || productIds.length === 0) return null;

  return (
    <div className="mt-12 rounded-xl border border-orange-100 bg-orange-50/30 p-6">
      <div className="mb-6 flex items-center gap-2 text-orange-600">
        <Sparkles className="h-6 w-6" />
        <h2 className="text-xl font-bold">Sản phẩm tương tự</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {productIds.map((id) => (
          <RecommendedProductItem key={id} productId={id} />
        ))}
      </div>
    </div>
  );
}
