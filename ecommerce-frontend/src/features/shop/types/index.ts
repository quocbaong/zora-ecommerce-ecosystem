export interface ShopInfo {
  sellerId: string;
  shopName: string;
  avatarUrl: string | null;
  email: string;
  joinedAt: string;
  followerCount: number;
  followingCount: number;
  following: boolean;
}

export interface FollowStatus {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

export interface ShopCategory {
  id: string;
  sellerId: string;
  name: string;
  position: number;
  productCount: number;
  productIds: string[];
}

export interface ShopCategoryRequest {
  name: string;
  position?: number;
  productIds?: string[];
}

export type VoucherDiscountType = 'PERCENT' | 'FIXED';

export interface Voucher {
  id: string;
  sellerId: string;
  targetUserId?: string | null;
  code: string;
  title?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  active: boolean;
  saved: boolean;
  expired?: boolean;
  usedUp?: boolean;
}

export interface VoucherRequest {
  code: string;
  title?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  expiresAt?: string;
  active?: boolean;
  targetUserId?: string;
}
