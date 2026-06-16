import { Link } from 'react-router-dom';
import { Star, Store } from 'lucide-react';
import { useShop, useShopVouchers } from '../hooks/useShop';
import { useProducts } from '@/features/product/hooks/useProducts';
import { formatPrice } from '@/utils/format';

interface SellerSearchCardProps {
  sellerId: string;
  fullName: string;
  avatarUrl?: string;
  description?: string;
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export default function SellerSearchCard({ sellerId, fullName, avatarUrl, description }: SellerSearchCardProps) {
  const { data: shop } = useShop(sellerId);
  const { data: products } = useProducts({ page: 0, size: 6, sellerId, sort: 'top_sold' });
  const { data: vouchers = [] } = useShopVouchers(sellerId);

  const topVoucher = vouchers[0];
  const items = products?.content ?? [];
  const PRODUCT_SLOTS = 6;

  return (
    <div className="flex items-stretch gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      {/* Shop info */}
      <div className="flex w-40 flex-shrink-0 flex-col items-center gap-1.5 text-center">
        <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-white flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <h3 className="text-xs font-semibold text-secondary line-clamp-2 leading-tight">
          {description || fullName}
        </h3>
        <div className="flex items-center gap-1 text-[10px] text-gray-600">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-yellow-600">4.9</span>
          <span className="text-gray-300">|</span>
          <span>{formatFollowers(shop?.followerCount ?? 0)} Followers</span>
        </div>
        <Link
          to={`/shop/${sellerId}`}
          className="mt-auto rounded border border-primary px-4 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
        >
          Xem Shop
        </Link>
      </div>

      {/* Products — grid 6 cột, fills available space evenly */}
      <div className="grid flex-1 grid-cols-6 gap-2">
        {Array.from({ length: PRODUCT_SLOTS }).map((_, i) => {
          const product = items[i];
          if (!product) {
            return (
              <div key={i} className="flex flex-col rounded-lg bg-gray-50">
                <div className="aspect-square w-full" />
              </div>
            );
          }
          const discount = product.discountPercent ?? 0;
          return (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="relative flex flex-col overflow-hidden rounded-lg border border-gray-100 bg-white hover:shadow-md transition-shadow"
            >
              {discount > 0 && (
                <span className="absolute right-0 top-0 z-10 rounded-bl-md bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-500">
                  -{discount}%
                </span>
              )}
              <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Store className="h-4 w-4 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 p-1.5">
                <p className="line-clamp-2 text-[10px] font-medium text-secondary leading-tight">{product.name}</p>
                <span className="mt-auto text-[11px] font-bold text-primary">{formatPrice(product.price)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Voucher (if any) */}
      {topVoucher && (
        <div className="relative flex w-24 flex-shrink-0 flex-col items-center rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-2 text-center">
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-[10px] font-medium text-secondary">Giảm</p>
            <p className="my-0.5 text-lg font-bold text-primary leading-none">
              {topVoucher.discountType === 'PERCENT'
                ? `${topVoucher.discountValue}%`
                : formatPrice(topVoucher.discountValue).replace(/[^\d]/g, '') + 'đ'}
            </p>
            {topVoucher.minOrderAmount > 0 && (
              <p className="mt-1 text-[9px] text-gray-500 leading-tight">
                Đơn tối thiểu<br />{formatPrice(topVoucher.minOrderAmount)}
              </p>
            )}
          </div>
          <Link
            to={`/shop/${sellerId}`}
            className="mt-2 w-full rounded bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary/90"
          >
            Lưu
          </Link>
        </div>
      )}
    </div>
  );
}
