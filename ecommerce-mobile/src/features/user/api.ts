import apiClient from '../../api/client';
import { ApiResponse, ShippingAddress } from '../../types';

export interface UserProfileUpdate {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get<any>('/users/me');
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await apiClient.get<any>(`/users/${id}`);
    return response.data;
  },

  updateProfile: async (payload: UserProfileUpdate) => {
    const response = await apiClient.put<any>('/users/profile', payload);
    return response.data;
  },

  getAddresses: async () => {
    const response = await apiClient.get<ShippingAddress[]>('/users/address');
    return response.data;
  },

  addAddress: async (address: Partial<ShippingAddress>) => {
    const response = await apiClient.post<ShippingAddress>('/users/address', address);
    return response.data;
  },

  updateAddress: async (id: string, address: Partial<ShippingAddress>) => {
    const response = await apiClient.put<ShippingAddress>(`/users/address/${id}`, address);
    return response.data;
  },

  deleteAddress: async (id: string) => {
    const response = await apiClient.delete(`/users/address/${id}`);
    return response.data;
  },
};
