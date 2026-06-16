import api from '@/lib/axios';
import {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
} from '@/types/api.types';

const BASE = '/api/auth';

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<AuthTokens>(`${BASE}/login`, payload).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    api.post<{ email: string; message: string }>(`${BASE}/register`, payload).then((r) => r.data),

  logout: () =>
    api.post<string>(`${BASE}/logout`).then((r) => r.data),

  refreshToken: (refreshToken: string) =>
    api.post<AuthTokens>(`${BASE}/refresh`, { refreshToken }).then((r) => r.data),

  verifyEmail: (email: string, code: string) =>
    api.post<string>(`${BASE}/verify-email?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`).then((r) => r.data),

  resendVerification: (email: string) =>
    api.post<string>(`${BASE}/resend-verification?email=${encodeURIComponent(email)}`).then((r) => r.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put<string>(`${BASE}/password`, { oldPassword, newPassword }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<string>(`${BASE}/forgot-password`, { email }).then((r) => r.data),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post<string>(`${BASE}/reset-password`, { email, otp, newPassword }).then((r) => r.data),
};
