import api from '@/lib/axios';

// Khớp với UserResponse của user-service backend
export interface UserProfile {
  id: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  // email & role không có trong user-service — lấy từ authStore (auth-service)
  email?: string;
  role?: 'USER' | 'SELLER' | 'ADMIN';
  status?: string;
  accountStatus?: string;
  banned?: boolean;
  muted?: boolean;
  muteUntil?: string;
  mutedUntil?: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Address {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  default: boolean;
  ghnProvinceId?: number;
  ghnDistrictId?: number;
  ghnWardCode?: string;
}

export interface AddressPayload {
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  default?: boolean;
  ghnProvinceId?: number;
  ghnDistrictId?: number;
  ghnWardCode?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── Payment: Bank Accounts ───────────────────────────────────────────────────

export interface BankAccountPayload {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchName?: string;
  isDefault?: boolean;
  otp?: string;
}

export interface BankAccount extends BankAccountPayload {
  id: string;
}

// ─── Payment: Credit Cards ────────────────────────────────────────────────────

export interface CreditCardPayload {
  cardBrand: string;
  last4Digits: string;
  expiryDate: string;
  cardHolderName: string;
  isDefault?: boolean;
  otp?: string;
}

export interface CreditCard extends CreditCardPayload {
  id: string;
}

// ─── Seller: Warehouse ────────────────────────────────────────────────────────

export interface WarehousePayload {
  warehouseProvince: string;
  warehouseDistrict: string;
  warehouseWard: string;
  warehouseStreet: string;
  warehousePhone: string;
  warehouseGhnProvinceId?: number;
  warehouseGhnDistrictId?: number;
  warehouseGhnWardCode?: string;
}

export interface Warehouse {
  sellerId: string;
  warehouseProvince: string | null;
  warehouseDistrict: string | null;
  warehouseWard: string | null;
  warehouseStreet: string | null;
  warehousePhone: string | null;
  warehouseGhnProvinceId: number | null;
  warehouseGhnDistrictId: number | null;
  warehouseGhnWardCode: string | null;
  configured: boolean;
}

export const userService = {
  getProfile: () => api.get<UserProfile>('/api/users/me').then((r) => r.data),

  getProfileById: (id: string) =>
    api.get<UserProfile>(`/api/users/${id}`).then((r) => r.data),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.put<UserProfile>('/api/users/me', payload).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<string>('/api/users/avatar', form, {
        headers: { 'Content-Type': undefined }, // xoá default application/json, để Axios tự set multipart/form-data; boundary=...
      })
      .then((r) => {
        const url = typeof r.data === 'string' ? r.data : (r.data as any)?.url ?? (r.data as any)?.data?.url ?? '';
        return url as string;
      });
  },

  getAddresses: () => api.get<Address[]>('/api/users/address').then((r) => r.data),

  addAddress: (payload: AddressPayload) =>
    api.post<Address>('/api/users/address', payload).then((r) => r.data),

  updateAddress: (id: string, payload: Partial<AddressPayload>) =>
    api.put<Address>(`/api/users/address/${id}`, payload).then((r) => r.data),

  deleteAddress: (id: string) =>
    api.delete<Address>(`/api/users/address/${id}`).then((r) => r.data),

  changePassword: (payload: ChangePasswordPayload) =>
    api.put('/api/auth/password', payload).then((r) => r.data),

  // ─── Payment: Bank Accounts ─────────────────────────────────────

  getBankAccounts: () => api.get<BankAccount[]>('/api/users/bank-accounts').then((r) => r.data),

  sendBankOtp: () => api.post<void>('/api/users/bank-accounts/send-otp').then((r) => r.data),

  addBankAccount: (payload: BankAccountPayload) =>
    api.post<BankAccount>('/api/users/bank-accounts', payload).then((r) => r.data),

  deleteBankAccount: (id: string) =>
    api.delete<void>(`/api/users/bank-accounts/${id}`).then((r) => r.data),

  // ─── Payment: Credit Cards ──────────────────────────────────────

  getCreditCards: () => api.get<CreditCard[]>('/api/users/credit-cards').then((r) => r.data),

  sendCreditCardOtp: () => api.post<void>('/api/users/credit-cards/send-otp').then((r) => r.data),

  addCreditCard: (payload: CreditCardPayload) =>
    api.post<CreditCard>('/api/users/credit-cards', payload).then((r) => r.data),

  deleteCreditCard: (id: string) =>
    api.delete<void>(`/api/users/credit-cards/${id}`).then((r) => r.data),

  // ─── Seller: Warehouse ──────────────────────────────────────────

  getMyWarehouse: () =>
    api.get<Warehouse>('/api/users/me/warehouse').then((r) => r.data),

  updateMyWarehouse: (payload: WarehousePayload) =>
    api.put<Warehouse>('/api/users/me/warehouse', payload).then((r) => r.data),
};