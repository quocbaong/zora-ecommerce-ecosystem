import api from '@/lib/axios';

export interface ShippingFeeRequest {
  fromDistrictId?: number;
  fromWardCode?: string;
  toDistrictId: number;
  toWardCode: string;
  serviceTypeId?: number;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  insuranceValue?: number;
}

export interface ShippingFeeResponse {
  total: number;
  serviceFee: number;
  insuranceFee?: number;
  codFee?: number;
}

export interface SellerWarehouse {
  sellerId: string;
  warehouseGhnProvinceId: number | null;
  warehouseGhnDistrictId: number | null;
  warehouseGhnWardCode: string | null;
  configured: boolean;
}

export const shippingService = {
  calculateFee: (req: ShippingFeeRequest) =>
    api.post<ShippingFeeResponse>('/api/shipping/fee', req).then((r) => r.data),

  getSellerWarehouse: (sellerId: string) =>
    api.get<SellerWarehouse>(`/api/users/${sellerId}/warehouse`).then((r) => r.data),
};
