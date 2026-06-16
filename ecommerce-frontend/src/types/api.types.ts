export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  status?: string;
  accountStatus?: string;
  banned?: boolean;
  muted?: boolean;
  muteUntil?: string;
  mutedUntil?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

// ─── Product ────────────────────────────────────────────────────

export interface ProductVariant {
  id?: string;
  color: string | null;
  size: string | null;
  additionalPrice: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  variants?: ProductVariant[];
  sellerId: string;
  categoryId?: string;
  categoryName?: string;
  ratingAvg?: number;
  ratingCount?: number;
  soldCount?: number;
  discountPercent?: number;
  verified?: boolean;
  createdAt?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISABLED';
  attributes?: Record<string, unknown>;
  weightG?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ProductsResponse {
  content: Product[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  status: 'ACTIVE' | 'INACTIVE';
  variants?: Omit<ProductVariant, 'id'>[];
  attributes?: Record<string, unknown>;
  weightG?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  categoryId?: string;
  variants?: ProductVariant[];
  attributes?: Record<string, unknown>;
  weightG?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export type CategoryAttributeType = 'TEXT' | 'TEXTAREA' | 'NUMBER';

export interface CategoryAttribute {
  id: string;
  categoryId: string;
  name: string;
  label: string;
  type: CategoryAttributeType;
  required: boolean;
  displayOrder: number;
  placeholder?: string;
}

// ─── Product Review ─────────────────────────────────────────────

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CreateReviewPayload {
  rating: number;
  comment: string;
}

// ─── Category ───────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  imageUrl?: string;
  children?: Category[];
}

// ─── Notification ────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: 'ORDER_CREATED' | 'PAYMENT_SUCCESS' | 'ORDER_SHIPPED' | 'PRODUCT_CREATED' | 'PROMOTION' | 'ORDER_UPDATE' | 'SYSTEM_ALERT' | 'SELLER_APPLICATION_APPROVED' | 'SELLER_APPLICATION_REJECTED' | 'ACCOUNT_BANNED';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Order (Full) ────────────────────────────────────────────────

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  street: string;
  ward: string;
  district: string;
  province: string;
  postalCode: string;
  fullAddress?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
  variantId: string | null;
  subtotal?: number;
  sellerId?: string | null;
}

export interface CreateOrderPayload {
  items: {
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    price: number;
    variantId: string | null;
    sellerId?: string | null;
  }[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  voucherId?: string;
  toGhnDistrictId?: number;
  toGhnWardCode?: string;
  clientShippingFee?: number;
}

// ─── Chat Unread ─────────────────────────────────────────────────

export interface ChatNewNotification {
  conversationId: string;
  fromUserId: string;
  fromRole: string;
  preview: string;
  type: string;
  timestamp: string;
}
