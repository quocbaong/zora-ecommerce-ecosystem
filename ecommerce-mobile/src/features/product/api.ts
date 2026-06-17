import apiClient from '../../api/client';
import { ApiResponse, ProductsResponse, Category } from '../../types';

export const productApi = {
  getProducts: async (params?: { categoryId?: string; sort?: string; size?: number; page?: number }) => {
    const response = await apiClient.get<ProductsResponse>('/products', { params });
    return response.data;
  },

  getProductById: async (id: string) => {
    const response = await apiClient.get<any>(`/products/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get<Category[]>('/products/categories');
    return response.data;
  },

  getProductsBySeller: async (sellerId: string) => {
    const response = await apiClient.get<ProductsResponse>('/products', { 
      params: { sellerId, size: 100 } 
    });
    return response.data.content;
  },

  createProduct: async (payload: any) => {
    const response = await apiClient.post<any>('/products', payload);
    return response.data;
  },

  uploadProductImages: async (productId: string, files: any[]) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      // @ts-ignore
      formData.append('files', {
        uri: file.uri,
        name: `image_${index}.jpg`,
        type: 'image/jpeg',
      });
    });

    const response = await apiClient.post(`/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  getReviews: async (productId: string) => {
    const response = await apiClient.get<any[]>(`/products/${productId}/reviews`);
    return response.data;
  },

  getRecommendations: async (productId: string) => {
    const response = await apiClient.get<string[]>(`/ai/recommendations/${productId}`);
    return response.data;
  },
};
