import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/features/product/services/productService';
import type {
  Product,
  ProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
  ProductReview,
  CreateReviewPayload,
} from '@/types/api.types';

const STALE_TIME = 2 * 60 * 1000; // 2 minutes

// ─── Queries ────────────────────────────────────────────────────

export const useProducts = (
  params?: { page?: number; size?: number; keyword?: string; categoryId?: string; sort?: string; sellerId?: string; minPrice?: number; maxPrice?: number; rating?: number },
  options?: { enabled?: boolean }
) => {
  return useQuery<ProductsResponse>({
    queryKey: ['products', params],
    queryFn: () => productService.getAll(params),
    staleTime: STALE_TIME,
    enabled: options?.enabled,
  });
};

export const useProductDetail = (id: string) => {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => productService.getById(id),
    staleTime: STALE_TIME,
    enabled: !!id,
  });
};

export const useProductReviews = (productId: string) => {
  return useQuery<ProductReview[]>({
    queryKey: ['productReviews', productId],
    queryFn: () => productService.getReviews(productId),
    enabled: !!productId,
  });
};

export const useProductRecommendations = (productId: string) => {
  return useQuery<string[]>({
    queryKey: ['productRecommendations', productId],
    queryFn: () => productService.getRecommendations(productId),
    staleTime: STALE_TIME,
    enabled: !!productId,
  });
};

// ─── Mutations ──────────────────────────────────────────────────

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; payload: UpdateProductPayload }) =>
      productService.update(params.id, params.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUploadProductImages = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; files: File[]; replace?: boolean }) =>
      productService.uploadImages(params.id, params.files, params.replace ?? false),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
    },
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { productId: string; payload: CreateReviewPayload }) =>
      productService.createReview(params.productId, params.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productReviews', variables.productId] });
    },
  });
};
