// ĐÂY LÀ FILE CHUẨN. Mọi API call PHẢI đi qua instance này.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL,
  timeout: 10000, // 10 giây timeout
  headers: { 'Content-Type': 'application/json' },
});

// ───────── Client-side rate limiter (token bucket) ─────────
// Giới hạn request phát đi từ client để tránh spam/quá tải, giữ DƯỚI ngưỡng gateway (10 req/s).
const REFILL_PER_SEC = 8; // số token nạp mỗi giây
const BUCKET_SIZE = 8; // sức chứa tối đa (burst)
let tokens = BUCKET_SIZE;
let lastRefill = Date.now();

function refillTokens() {
  const now = Date.now();
  tokens = Math.min(BUCKET_SIZE, tokens + ((now - lastRefill) / 1000) * REFILL_PER_SEC);
  lastRefill = now;
}

async function acquireToken(): Promise<void> {
  refillTokens();
  while (tokens < 1) {
    const waitMs = Math.max(((1 - tokens) / REFILL_PER_SEC) * 1000, 50);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    refillTokens();
  }
  tokens -= 1;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Request Interceptor: rate-limit phía client + đính kèm Access Token
api.interceptors.request.use(async (config) => {
  await acquireToken();
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response Interceptor: 429 backoff-retry + silent refresh token (401) + banned
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Tài khoản bị khóa → logout ngay, không retry
    if (error.response?.data?.code === 'ACCOUNT_BANNED') {
      localStorage.clear();
      window.location.href = '/login?banned=1';
      return Promise.reject(error);
    }

    // 429 Too Many Requests → đợi (Retry-After hoặc backoff) rồi thử lại (tối đa 2 lần)
    if (error.response?.status === 429 && originalRequest) {
      originalRequest._rlRetry = (originalRequest._rlRetry || 0) + 1;
      if (originalRequest._rlRetry <= 2) {
        const retryAfter = Number(error.response.headers?.['retry-after']);
        const backoffMs =
          !Number.isNaN(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 1000 * originalRequest._rlRetry; // 1s, 2s
        await delay(backoffMs);
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const baseUrl = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL;
        const res = await axios.post(`${baseUrl}/api/auth/refresh`, { refreshToken });
        const newToken = res.data.accessToken;
        localStorage.setItem('access_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Refresh trả ACCOUNT_BANNED → logout ngay
        if (refreshError?.response?.data?.message === 'ACCOUNT_BANNED' ||
            refreshError?.response?.data?.code === 'ACCOUNT_BANNED') {
          localStorage.clear();
          window.location.href = '/login?banned=1';
          return Promise.reject(refreshError);
        }
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
export default api;
