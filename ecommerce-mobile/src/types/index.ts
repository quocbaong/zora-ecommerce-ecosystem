export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
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

// ─── Category ───────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

// ─── Order & Shipping ───────────────────────────────────────────

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
}

export interface Order {
  id: string;
  userId: string;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  createdAt: string;
}

// ─── Notification ───────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'ORDER_CREATED' | 'PAYMENT_SUCCESS' | 'ORDER_SHIPPED' | 'SYSTEM_ALERT' | 'PROMOTION' | 'CHAT';
  isRead: boolean;
  createdAt: string;
}
