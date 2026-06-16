import api from '@/lib/axios';
import type {
  ShopInfo,
  FollowStatus,
  ShopCategory,
  ShopCategoryRequest,
  Voucher,
  VoucherRequest,
} from '../types';

export const shopService = {
  getShop: (sellerId: string) =>
    api.get<ShopInfo>(`/api/users/shops/${sellerId}`).then((r) => r.data),

  follow: (sellerId: string) =>
    api.post<void>(`/api/users/shops/${sellerId}/follow`).then((r) => r.data),

  unfollow: (sellerId: string) =>
    api.delete<void>(`/api/users/shops/${sellerId}/follow`).then((r) => r.data),

  getFollowStatus: (sellerId: string) =>
    api.get<FollowStatus>(`/api/users/shops/${sellerId}/follow-status`).then((r) => r.data),

  listFollowedShops: () =>
    api.get<ShopInfo[]>(`/api/users/shops/followed`).then((r) => r.data),

  listShopCategories: (sellerId: string) =>
    api.get<ShopCategory[]>(`/api/products/shop-categories/seller/${sellerId}`).then((r) => r.data),

  createShopCategory: (data: ShopCategoryRequest) =>
    api.post<ShopCategory>(`/api/products/shop-categories`, data).then((r) => r.data),

  updateShopCategory: (id: string, data: ShopCategoryRequest) =>
    api.put<ShopCategory>(`/api/products/shop-categories/${id}`, data).then((r) => r.data),

  deleteShopCategory: (id: string) =>
    api.delete<void>(`/api/products/shop-categories/${id}`).then((r) => r.data),

  listShopVouchers: (sellerId: string) =>
    api.get<Voucher[]>(`/api/orders/vouchers/shop/${sellerId}`).then((r) => r.data),

  listSellerVouchers: () =>
    api.get<Voucher[]>(`/api/orders/vouchers/seller`).then((r) => r.data),

  listMySavedVouchers: () =>
    api.get<Voucher[]>(`/api/orders/vouchers/my-saved`).then((r) => r.data),

  listAllActiveVouchers: () =>
    api.get<Voucher[]>(`/api/orders/vouchers/active`).then((r) => r.data),

  createVoucher: (data: VoucherRequest) =>
    api.post<Voucher>(`/api/orders/vouchers`, data).then((r) => r.data),

  createPrivateVoucher: (data: VoucherRequest) =>
    api.post<Voucher>(`/api/orders/vouchers/private`, data).then((r) => r.data),

  getVoucherById: (id: string) =>
    api.get<Voucher>(`/api/orders/vouchers/${id}`).then((r) => r.data),

  updateVoucher: (id: string, data: VoucherRequest) =>
    api.put<Voucher>(`/api/orders/vouchers/${id}`, data).then((r) => r.data),

  deleteVoucher: (id: string) =>
    api.delete<void>(`/api/orders/vouchers/${id}`).then((r) => r.data),

  saveVoucher: (id: string) =>
    api.post<void>(`/api/orders/vouchers/${id}/save`).then((r) => r.data),

  unsaveVoucher: (id: string) =>
    api.delete<void>(`/api/orders/vouchers/${id}/save`).then((r) => r.data),
};
