import { useQuery } from '@tanstack/react-query';
import { shippingService } from '../services/shippingService';

interface FeeItem {
  productId: string;
  quantity: number;
  price: number;
  sellerId: string | null | undefined;
  weightG?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

interface UseShippingFeeArgs {
  items: FeeItem[];
  toGhnDistrictId?: number;
  toGhnWardCode?: string;
}

export interface ShippingFeeBreakdown {
  totalFee: number;
  perSeller: { sellerId: string; fee: number; error?: string }[];
  hasError: boolean;
}

export function useShippingFee({ items, toGhnDistrictId, toGhnWardCode }: UseShippingFeeArgs) {
  const sellerKey = items
    .map((i) => `${i.sellerId}:${i.productId}:${i.quantity}:${i.weightG ?? 500}`)
    .sort()
    .join('|');

  return useQuery<ShippingFeeBreakdown>({
    queryKey: ['shipping-fee', toGhnDistrictId, toGhnWardCode, sellerKey],
    enabled: !!toGhnDistrictId && !!toGhnWardCode && items.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const bySeller = new Map<string, FeeItem[]>();
      items.forEach((i) => {
        const sid = i.sellerId || '';
        if (!sid) return;
        if (!bySeller.has(sid)) bySeller.set(sid, []);
        bySeller.get(sid)!.push(i);
      });

      const perSeller: { sellerId: string; fee: number; error?: string }[] = [];

      for (const [sellerId, sellerItems] of bySeller.entries()) {
        try {
          const wh = await shippingService.getSellerWarehouse(sellerId);
          if (!wh.configured || !wh.warehouseGhnDistrictId || !wh.warehouseGhnWardCode) {
            perSeller.push({ sellerId, fee: 0, error: 'Shop chưa cấu hình kho' });
            continue;
          }

          let totalWeight = 0;
          let maxL = 10, maxW = 10, maxH = 10;
          sellerItems.forEach((i) => {
            const w = i.weightG ?? 500;
            const l = i.lengthCm ?? 20;
            const wd = i.widthCm ?? 15;
            const h = i.heightCm ?? 10;
            totalWeight += w * i.quantity;
            if (l > maxL) maxL = l;
            if (wd > maxW) maxW = wd;
            if (h > maxH) maxH = h;
          });
          if (totalWeight < 1) totalWeight = 500;

          const fee = await shippingService.calculateFee({
            serviceTypeId: 2,
            fromDistrictId: wh.warehouseGhnDistrictId,
            fromWardCode: wh.warehouseGhnWardCode,
            toDistrictId: toGhnDistrictId!,
            toWardCode: toGhnWardCode!,
            weight: totalWeight,
            length: maxL,
            width: maxW,
            height: maxH,
            insuranceValue: 0,
          });
          perSeller.push({ sellerId, fee: fee.total });
        } catch (e: any) {
          perSeller.push({
            sellerId,
            fee: 0,
            error: e?.response?.data?.error || 'Không tính được phí ship',
          });
        }
      }

      const totalFee = perSeller.reduce((s, p) => s + p.fee, 0);
      const hasError = perSeller.some((p) => p.error);
      return { totalFee, perSeller, hasError };
    },
  });
}
