import { useQuery } from '@tanstack/react-query';
import { vietnamLocationService } from '../services/vietnamLocationService';

export function useProvinces() {
  return useQuery({
    queryKey: ['ghn-provinces'],
    queryFn: () => vietnamLocationService.getProvinces(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useDistricts(provinceId?: number) {
  return useQuery({
    queryKey: ['ghn-districts', provinceId],
    queryFn: () => vietnamLocationService.getDistricts(provinceId!),
    enabled: provinceId != null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useWards(districtId?: number) {
  return useQuery({
    queryKey: ['ghn-wards', districtId],
    queryFn: () => vietnamLocationService.getWards(districtId!),
    enabled: districtId != null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
