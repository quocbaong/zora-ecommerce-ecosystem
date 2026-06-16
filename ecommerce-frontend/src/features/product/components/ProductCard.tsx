import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@/types/api.types';
import { formatPrice } from '@/utils/format';
import RatingStars from '@/components/common/RatingStars';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const mainImage = product.images?.[0] || '/placeholder-product.png';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-minimal transition-all duration-300 hover:-translate-y-1 hover:shadow-minimal-hover">
      {/* Image */}
      <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden rounded-xl bg-[#F8F9FA]">
        <img
          src={mainImage}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {product.status !== 'ACTIVE' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <span className="rounded-full bg-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
              Ngưng bán
            </span>
          </div>
        )}
      </Link>

      {/* Quick Add to Cart (Bottom Center of Image) */}
      {onAddToCart && product.status === 'ACTIVE' && product.stock > 0 && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onAddToCart(product);
          }}
          className="absolute bottom-[calc(40%+1rem)] left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg opacity-0 transition-all duration-300 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-orange-600 hover:scale-105 z-10"
        >
          <ShoppingCart className="h-4 w-4 stroke-[2]" />
          Thêm vào giỏ
        </button>
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-3 pb-1 pt-4">
        <Link
          to={`/products/${product.id}`}
          className="line-clamp-2 text-sm font-semibold leading-tight text-secondary hover:text-primary transition-colors"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <span className="text-lg font-bold text-primary tracking-tight">
              {formatPrice(product.price)}
            </span>
            {product.stock <= 5 && product.stock > 0 ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                Còn {product.stock}
              </span>
            ) : product.stock === 0 ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/50 bg-secondary/5 px-2 py-0.5 rounded-full">Hết hàng</span>
            ) : null}
          </div>
          
          <div className="flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity">
            <RatingStars rating={product.ratingAvg ?? 0} reviewCount={product.ratingCount ?? 0} />
            {(product.soldCount ?? 0) > 0 && (
              <span className="text-[11px] text-gray-400">
                Đã bán {product.soldCount! >= 1000
                  ? `${(product.soldCount! / 1000).toFixed(1)}k`
                  : product.soldCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
