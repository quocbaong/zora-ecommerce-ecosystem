import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopService } from '../services/shopService';
import type { ShopCategoryRequest, VoucherRequest } from '../types';

export const useShop = (sellerId?: string) =>
  useQuery({
    queryKey: ['shop', sellerId],
    queryFn: () => shopService.getShop(sellerId!),
    enabled: !!sellerId,
    staleTime: 60_000,
  });

export const useFollowedShops = () =>
  useQuery({
    queryKey: ['followed-shops'],
    queryFn: () => shopService.listFollowedShops(),
    staleTime: 30_000,
  });

export const useFollowShop = (sellerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => shopService.follow(sellerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop', sellerId] });
      qc.invalidateQueries({ queryKey: ['followed-shops'] });
    },
  });
};

export const useUnfollowShop = (sellerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => shopService.unfollow(sellerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop', sellerId] });
      qc.invalidateQueries({ queryKey: ['followed-shops'] });
    },
  });
};

export const useUnfollowShopGeneral = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => shopService.unfollow(sellerId),
    onSuccess: (_data, sellerId) => {
      qc.invalidateQueries({ queryKey: ['shop', sellerId] });
      qc.invalidateQueries({ queryKey: ['followed-shops'] });
    },
  });
};

export const useShopCategories = (sellerId?: string) =>
  useQuery({
    queryKey: ['shop-categories', sellerId],
    queryFn: () => shopService.listShopCategories(sellerId!),
    enabled: !!sellerId,
    staleTime: 60_000,
  });

export const useCreateShopCategory = (sellerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ShopCategoryRequest) => shopService.createShopCategory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-categories', sellerId] }),
  });
};

export const useUpdateShopCategory = (sellerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShopCategoryRequest }) =>
      shopService.updateShopCategory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-categories', sellerId] }),
  });
};

export const useDeleteShopCategory = (sellerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopService.deleteShopCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-categories', sellerId] }),
  });
};

export const useShopVouchers = (sellerId?: string) =>
  useQuery({
    queryKey: ['shop-vouchers', sellerId],
    queryFn: () => shopService.listShopVouchers(sellerId!),
    enabled: !!sellerId,
    staleTime: 30_000,
  });

export const useSellerVouchers = () =>
  useQuery({
    queryKey: ['seller-vouchers'],
    queryFn: () => shopService.listSellerVouchers(),
    staleTime: 30_000,
  });

export const useMySavedVouchers = (enabled = true) =>
  useQuery({
    queryKey: ['my-saved-vouchers'],
    queryFn: () => shopService.listMySavedVouchers(),
    enabled,
    staleTime: 30_000,
  });

export const useAllActiveVouchers = () =>
  useQuery({
    queryKey: ['all-active-vouchers'],
    queryFn: () => shopService.listAllActiveVouchers(),
    staleTime: 30_000,
  });

export const useCreateVoucher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VoucherRequest) => shopService.createVoucher(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-vouchers'] }),
  });
};

export const useCreatePrivateVoucher = () => {
  return useMutation({
    mutationFn: (data: VoucherRequest) => shopService.createPrivateVoucher(data),
  });
};

export const useVoucherById = (id: string | null | undefined) =>
  useQuery({
    queryKey: ['voucher', id],
    queryFn: () => shopService.getVoucherById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

export const useUpdateVoucher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoucherRequest }) =>
      shopService.updateVoucher(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-vouchers'] }),
  });
};

export const useDeleteVoucher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopService.deleteVoucher(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-vouchers'] }),
  });
};

export const useSaveVoucher = (sellerId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopService.saveVoucher(id),
    onSuccess: (_data, voucherId) => {
      qc.invalidateQueries({ queryKey: ['shop-vouchers', sellerId] });
      qc.invalidateQueries({ queryKey: ['my-saved-vouchers'] });
      qc.invalidateQueries({ queryKey: ['all-active-vouchers'] });
      qc.invalidateQueries({ queryKey: ['voucher', voucherId] });
    },
  });
};

export const useUnsaveVoucher = (sellerId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopService.unsaveVoucher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-vouchers', sellerId] });
      qc.invalidateQueries({ queryKey: ['my-saved-vouchers'] });
      qc.invalidateQueries({ queryKey: ['all-active-vouchers'] });
    },
  });
};
