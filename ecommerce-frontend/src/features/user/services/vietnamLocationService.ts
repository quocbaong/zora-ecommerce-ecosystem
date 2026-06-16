import api from '@/lib/axios';

export interface GhnProvince {
  provinceId: number;
  provinceName: string;
  code: string | null;
}

export interface GhnDistrict {
  districtId: number;
  provinceId: number;
  districtName: string;
  code: string | null;
}

export interface GhnWard {
  wardCode: string;
  districtId: number;
  wardName: string;
}

export const vietnamLocationService = {
  getProvinces: () =>
    api.get<GhnProvince[]>('/api/shipping/provinces').then((r) => r.data),

  getDistricts: (provinceId: number) =>
    api.get<GhnDistrict[]>(`/api/shipping/districts/${provinceId}`).then((r) => r.data),

  getWards: (districtId: number) =>
    api.get<GhnWard[]>(`/api/shipping/wards/${districtId}`).then((r) => r.data),
};
