import React from 'react';
import type { Product } from '@/types/api.types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart?: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}
    </div>
  );
};

export default React.memo(ProductGrid);
