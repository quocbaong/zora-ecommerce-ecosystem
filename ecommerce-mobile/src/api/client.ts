import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// LƯU Ý: Thay đổi 'localhost' thành IP của máy tính nếu chạy trên máy thật
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://47-130-20-137.sslip.io/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const userId = await SecureStore.getItemAsync('user_id');
  if (userId) {
    config.headers['X-User-Id'] = userId;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data;
          await SecureStore.setItemAsync('access_token', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Handle logout logic here (e.g., redirect to login)
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
