import api from '@/lib/axios';
import type {
  Product,
  ProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
  ProductReview,
  CreateReviewPayload,
} from '@/types/api.types';

const BASE = '/api/products';

type ReviewApiResponse = ProductReview & {
  reviewText?: string;
  comment?: string;
  customerName?: string;
};

const normalizeReview = (review: ReviewApiResponse): ProductReview => ({
  ...review,
  userId: review.userId ?? review.customerName ?? '',
  comment: review.comment ?? review.reviewText ?? '',
});

export const productService = {
  getAll: (params?: { page?: number; size?: number; keyword?: string; categoryId?: string; sort?: string; sellerId?: string; minPrice?: number; maxPrice?: number; rating?: number }) =>
    api.get<ProductsResponse>(BASE, { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get(`${BASE}/${id}`).then((r) => {
      // Handle both direct object and wrapped { data: {...} }
      const raw = r.data;
      if (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
        return raw.data as Product;
      }
      return raw as Product;
    }),

  create: (payload: CreateProductPayload) =>
    api.post<Product>(BASE, payload).then((r) => r.data),

  update: (id: string, payload: UpdateProductPayload) =>
    api.put<Product>(`${BASE}/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete<Product>(`${BASE}/${id}`).then((r) => r.data),

  uploadImages: (id: string, files: File[], replace = false) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api
      .post<string[]>(`${BASE}/${id}/images`, formData, {
        params: { replace },
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  getReviews: (productId: string) =>
    api.get<ReviewApiResponse[]>(`${BASE}/${productId}/reviews`).then((r) => r.data.map(normalizeReview)),

  createReview: (productId: string, payload: CreateReviewPayload) =>
    api
      .post<ReviewApiResponse | string>(`${BASE}/${productId}/reviews`, {
        productId,
        rating: payload.rating,
        comment: payload.comment,
      })
      .then((r) => (typeof r.data === 'string' ? r.data : normalizeReview(r.data))),
};
