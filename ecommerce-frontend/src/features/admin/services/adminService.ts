import api from '@/lib/axios';
import type { SellerApplicationResponse } from '@/features/user/services/sellerApplicationService';

export interface ChatReportItem {
  id: string;
  reporterId: string;
  reportedUserId: string;
  conversationId: string;
  reason: string;
  description: string;
  status: string;
  adminNote?: string;
  moderationAction?: string;
  resolvedAt?: string;
  rejectedAt?: string;
  violationCount: number;
  banned: boolean;
  createdAt: string;
  updatedAt?: string;
  evidenceMessages?: EvidenceMessageSnapshot[];
  evidenceImages?: string[];
}

export interface EvidenceMessageSnapshot {
  messageId: string;
  senderId: string;
  text?: string;
  content?: string;
  timestamp?: string;
  createdAt?: string;
  type?: string;
}

export interface AdminProductResponse {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: string;
  categoryName?: string;
  sellerId: string;
  status: string;
  ratingAvg?: number;
  ratingCount?: number;
  discountPercent?: number;
  verified?: boolean;
  createdAt?: string;
  images: string[];
}

export interface CommissionRateItem {
  categoryId: string;
  categoryName: string;
  rate: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  parentId?: string;
  imageUrl?: string;
}

export type AttributeType = 'TEXT' | 'TEXTAREA' | 'NUMBER';

export interface CategoryAttributeItem {
  id: string;
  categoryId: string;
  name: string;
  label: string;
  type: AttributeType;
  required: boolean;
  displayOrder: number;
  placeholder?: string;
}

export interface CategoryAttributePayload {
  name: string;
  label: string;
  type: AttributeType;
  required: boolean;
  displayOrder: number;
  placeholder?: string;
}

export interface AdminRevenuePoint {
  label: string;
  revenue: number;
  orderCount: number;
}

export interface AdminSellerRevenue {
  sellerId: string;
  revenue: number;
  orderCount: number;
  itemsSold: number;
}

export interface AdminStats {
  totalUsers: number;
  totalSellers: number;
  totalAdmins: number;
  newUsersToday: number;
  pendingApplications: number;
  totalOrders: number;
  totalRevenue: number;
  revenueToday: number;
  revenueMonth: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  activeProducts: number;
  disabledProducts: number;
  newProductsToday: number;
}

export interface AdminUserResponse {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  status: string;
  statusReason?: string;
  createdAt?: string;
  emailVerified?: boolean;
}

export interface AdminReviewRequest {
  reason?: string;
  adminNotes?: string;
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const [userStats, orderStats, productStats] = await Promise.all([
      api.get<any>('/api/users/admin/users/stats').then((r) => r.data),
      api.get<any>('/api/orders/admin/stats').then((r) => r.data),
      api.get<any>('/api/products/admin/stats').then((r) => r.data),
    ]);
    return {
      totalUsers: userStats.totalUsers,
      totalSellers: userStats.totalSellers,
      totalAdmins: userStats.totalAdmins,
      newUsersToday: userStats.newUsersToday,
      pendingApplications: userStats.pendingApplications,
      totalOrders: orderStats.totalOrders,
      totalRevenue: Number(orderStats.totalRevenue),
      revenueToday: Number(orderStats.revenueToday),
      revenueMonth: Number(orderStats.revenueMonth),
      pendingOrders: orderStats.pendingOrders,
      confirmedOrders: orderStats.confirmedOrders,
      shippingOrders: orderStats.shippingOrders,
      deliveredOrders: orderStats.deliveredOrders,
      cancelledOrders: orderStats.cancelledOrders,
      totalProducts: productStats.totalProducts,
      activeProducts: productStats.activeProducts,
      disabledProducts: productStats.disabledProducts,
      newProductsToday: productStats.newProductsToday,
    };
  },

  getSellerApplications: (status: string, page = 0, size = 20) =>
    api
      .get<{ content: SellerApplicationResponse[]; totalElements: number }>('/api/users/admin/seller-applications', {
        params: { status, page, size },
      })
      .then((r) => r.data),

  approveApplication: (id: string, data: AdminReviewRequest) =>
    api.post(`/api/users/admin/seller-applications/${id}/approve`, data).then((r) => r.data),

  rejectApplication: (id: string, data: AdminReviewRequest) =>
    api.post(`/api/users/admin/seller-applications/${id}/reject`, data).then((r) => r.data),

  getUsers: (params: { page?: number; size?: number; filterRole?: string; filterStatus?: string; search?: string }) =>
    api
      .get<{ content: AdminUserResponse[]; totalElements: number }>('/api/users/admin/users', { params })
      .then((r) => r.data),

  updateUserRole: (userId: string, role: string) =>
    api.patch(`/api/users/admin/users/${userId}/role`, null, { params: { role } }).then((r) => r.data),

  updateUserStatus: (userId: string, status: string, reason?: string) =>
    api.patch(`/api/users/admin/users/${userId}/status`, { status, reason }).then((r) => r.data),

  // Admin product management
  getAdminProducts: (params: {
    page?: number;
    size?: number;
    keyword?: string;
    categoryId?: string;
    status?: string;
    sellerId?: string;
  }) =>
    api
      .get<{ content: AdminProductResponse[]; totalElements: number }>('/api/products/admin/products', { params })
      .then((r) => r.data),

  updateProductStatus: (id: string, status: string) =>
    api.patch(`/api/products/admin/products/${id}/status`, null, { params: { status } }).then((r) => r.data),

  hardDeleteProduct: (id: string) =>
    api.delete(`/api/products/admin/products/${id}/hard`).then((r) => r.data),

  // Commission rates
  getCategoriesWithRates: (): Promise<CommissionRateItem[]> =>
    api.get<CommissionRateItem[]>('/api/products/admin/commission-rates/categories').then((r) => r.data),

  setCommissionRate: (categoryId: string, rate: number) =>
    api.put(`/api/products/admin/commission-rates/${categoryId}`, { rate }).then((r) => r.data),

  // Admin revenue
  getAdminRevenue: (range: 'day' | 'month'): Promise<AdminRevenuePoint[]> =>
    api.get<AdminRevenuePoint[]>('/api/orders/admin/revenue', { params: { range } }).then((r) => r.data),

  getAdminRevenueBySeller: (limit = 20): Promise<AdminSellerRevenue[]> =>
    api.get<AdminSellerRevenue[]>('/api/orders/admin/revenue/sellers', { params: { limit } }).then((r) => r.data),

  exportRevenueCsv: (days = 90) => {
    const url = `${import.meta.env.VITE_API_URL}/api/orders/admin/revenue/export?days=${days}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_${days}days.csv`;
    a.click();
  },

  // Category management
  getCategories: (): Promise<CategoryItem[]> =>
    api.get<CategoryItem[]>('/api/products/categories').then((r) => r.data),

  createCategory: (data: { name: string; parentId?: string | null; imageUrl?: string }) =>
    api.post<CategoryItem>('/api/products/categories', data).then((r) => r.data),

  updateCategory: (id: string, data: { name: string; parentId?: string | null; imageUrl?: string }) =>
    api.put<CategoryItem>(`/api/products/categories/${id}`, data).then((r) => r.data),

  deleteCategory: (id: string) =>
    api.delete(`/api/products/categories/${id}`).then((r) => r.data),

  uploadCategoryImage: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<{ url: string }>('/api/products/categories/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  // Category attribute schema (admin cấu hình)
  getCategoryAttributes: (categoryId: string): Promise<CategoryAttributeItem[]> =>
    api.get<CategoryAttributeItem[]>(`/api/products/categories/${categoryId}/attributes`).then((r) => r.data),

  createCategoryAttribute: (categoryId: string, payload: CategoryAttributePayload) =>
    api.post<CategoryAttributeItem>(`/api/products/categories/${categoryId}/attributes`, payload).then((r) => r.data),

  updateCategoryAttribute: (categoryId: string, attributeId: string, payload: CategoryAttributePayload) =>
    api.put<CategoryAttributeItem>(`/api/products/categories/${categoryId}/attributes/${attributeId}`, payload).then((r) => r.data),

  deleteCategoryAttribute: (categoryId: string, attributeId: string) =>
    api.delete(`/api/products/categories/${categoryId}/attributes/${attributeId}`).then((r) => r.data),

  // Chat reports management
  getReports: (status?: string): Promise<ChatReportItem[]> =>
    api.get('/api/chat/admin/reports', { params: { status } }).then((r) => {
      let rawList: any[] = [];
      if (r.data && Array.isArray(r.data.data)) {
        rawList = r.data.data;
      } else if (Array.isArray(r.data)) {
        rawList = r.data;
      } else if (r.data && Array.isArray(r.data.content)) {
        rawList = r.data.content;
      }

      return rawList.map((item: any) => ({
        id: item.reportId || item.id || '',
        reporterId: item.reporterId || '',
        reportedUserId: item.reportedUserId || '',
        conversationId: item.conversationId || '',
        reason: (item.reason || 'OTHER').toUpperCase(),
        description: item.description || '',
        status: item.status || 'PENDING',
        adminNote: item.adminNote || '',
        moderationAction: item.moderationAction || item.action || '',
        resolvedAt: item.resolvedAt || (item.status === 'RESOLVED' ? item.updatedAt : ''),
        rejectedAt: item.rejectedAt || (item.status === 'REJECTED' ? item.updatedAt : ''),
        violationCount: item.violationCount ?? item.violations ?? 0,
        banned: !!(item.banned ?? item.reportedUserBanned ?? false),
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
        evidenceMessages: item.evidence || item.evidenceMessages || [],
        evidenceImages: item.evidenceImages || [],
      }));
    }),

  getReportDetail: (id: string): Promise<ChatReportItem> =>
    api.get(`/api/chat/admin/reports/${id}`).then((r) => {
      const data = r.data?.data || r.data;
      if (data) {
        return {
          id: data.reportId || data.id || '',
          reporterId: data.reporterId || '',
          reportedUserId: data.reportedUserId || '',
          conversationId: data.conversationId || '',
          reason: (data.reason || 'OTHER').toUpperCase(),
          description: data.description || '',
          status: data.status || 'PENDING',
          adminNote: data.adminNote || '',
          moderationAction: data.moderationAction || data.action || '',
          resolvedAt: data.resolvedAt || (data.status === 'RESOLVED' ? data.updatedAt : ''),
          rejectedAt: data.rejectedAt || (data.status === 'REJECTED' ? data.updatedAt : ''),
          violationCount: data.violationCount ?? data.violations ?? 0,
          banned: !!(data.banned ?? data.reportedUserBanned ?? false),
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          evidenceMessages: data.evidence || data.evidenceMessages || [],
          evidenceImages: data.evidenceImages || [],
        };
      }
      return data;
    }),

  updateReportStatus: (id: string, status: 'RESOLVED' | 'REJECTED', adminNote?: string, action?: string): Promise<any> =>
    api.patch(`/api/chat/admin/reports/${id}`, { status, adminNote, action }).then((r) => r.data),

  // Admin Disputes
  getDisputedOrders: (page = 0, size = 1000) =>
    api.get<any>('/api/orders', { params: { page, size } }).then((r) => {
      const content = r.data?.content || [];
      // Frontend filtering for DISPUTED status
      return content.filter((order: any) => order.status === 'DISPUTED');
    }),

  approveRefund: (id: string, adminNote?: string) =>
    api.post<any>(`/api/orders/admin/${id}/refund/approve`, { adminNote }).then((r) => r.data),

  rejectRefund: (id: string, adminNote?: string) =>
    api.post<any>(`/api/orders/admin/${id}/refund/reject`, { adminNote }).then((r) => r.data),
};
