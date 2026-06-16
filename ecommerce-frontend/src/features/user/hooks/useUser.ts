import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  userService,
  UpdateProfilePayload,
  AddressPayload,
  ChangePasswordPayload,
  WarehousePayload,
} from '../services/userService';
import { useAuthStore } from '@/stores/authStore';

const PROFILE_KEY = ['user', 'profile'];
const ADDRESSES_KEY = ['user', 'addresses'];

export function useProfile() {
  const { isAuthenticated } = useAuthStore();
  const updateUser = useAuthStore((s) => s.updateUser);
  const query = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => userService.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // cache 5 phút — không refetch liên tục khi navigate
  });

  // Sync profile data vào authStore (persist → localStorage) sau mỗi lần fetch thành công
  // Không đặt trong select() vì sẽ gây infinite re-render
  useEffect(() => {
    const data = query.data;
    if (!data) return;
    const patch: Partial<any> = {};
    if (data.avatarUrl) patch.avatarUrl = data.avatarUrl;
    if (data.fullName) patch.fullName = data.fullName;
    if (data.phone) patch.phone = data.phone;
    if (data.status) patch.status = data.status;
    if (data.accountStatus) patch.accountStatus = data.accountStatus;
    if (data.banned !== undefined) patch.banned = data.banned;
    if (data.muted !== undefined) patch.muted = data.muted;
    if (data.muteUntil) patch.muteUntil = data.muteUntil;
    if (data.mutedUntil) patch.mutedUntil = data.mutedUntil;
    if (Object.keys(patch).length) updateUser(patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return query;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userService.updateProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success('Cập nhật thông tin thành công!');
    },
    onError: () => toast.error('Không thể cập nhật thông tin.'),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: async (file: File) => {
      // Upload lên S3 + backend tự lưu URL vào DB, trả về URL string
      const avatarUrl = await userService.uploadAvatar(file);
      if (!avatarUrl) throw new Error('Không nhận được URL từ server');
      return avatarUrl;
    },
    onSuccess: (avatarUrl: string) => {
      // Sync vào authStore (localStorage) để không mất sau re-login
      updateUser({ avatarUrl });
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success('Cập nhật ảnh đại diện thành công!');
    },
    onError: () => toast.error('Không thể tải ảnh lên.'),
  });
}

export function useAddresses() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ADDRESSES_KEY,
    queryFn: () => userService.getAddresses(),
    enabled: isAuthenticated,
  });
}

export function useAddAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddressPayload) => userService.addAddress(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADDRESSES_KEY });
      toast.success('Đã thêm địa chỉ mới!');
    },
    onError: () => toast.error('Không thể thêm địa chỉ.'),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AddressPayload> }) =>
      userService.updateAddress(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADDRESSES_KEY });
      toast.success('Đã cập nhật địa chỉ!');
    },
    onError: () => toast.error('Không thể cập nhật địa chỉ.'),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADDRESSES_KEY });
      toast.success('Đã xóa địa chỉ!');
    },
    onError: () => toast.error('Không thể xóa địa chỉ.'),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => userService.changePassword(payload),
    onSuccess: () => toast.success('Đổi mật khẩu thành công!'),
    onError: () => toast.error('Mật khẩu cũ không đúng hoặc có lỗi xảy ra.'),
  });
}

// ─── Payment: Bank Accounts ───────────────────────────────────────────────────

const BANK_ACCOUNTS_KEY = ['user', 'bankAccounts'];

export function useBankAccounts() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: BANK_ACCOUNTS_KEY,
    queryFn: () => userService.getBankAccounts(),
    enabled: isAuthenticated,
  });
}

export function useSendBankOtp() {
  return useMutation({
    mutationFn: () => userService.sendBankOtp(),
    onSuccess: () => {
      toast.success('Mã OTP đã được gửi đến email của bạn.');
    },
    onError: () => toast.error('Không thể gửi mã OTP, vui lòng thử lại.'),
  });
}

export function useAddBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../services/userService').BankAccountPayload) =>
      userService.addBankAccount(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANK_ACCOUNTS_KEY });
      toast.success('Đã thêm tài khoản ngân hàng mới!');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.response?.data;
      if (msg === 'OTP_EXPIRED' || msg === 'INVALID_OTP') {
        toast.error('Mã OTP không hợp lệ hoặc đã hết hạn.');
      } else {
        toast.error('Không thể thêm tài khoản ngân hàng.');
      }
    },
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteBankAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANK_ACCOUNTS_KEY });
      toast.success('Đã xóa tài khoản ngân hàng!');
    },
    onError: () => toast.error('Không thể xóa tài khoản ngân hàng.'),
  });
}

// ─── Payment: Credit Cards ────────────────────────────────────────────────────

const CREDIT_CARDS_KEY = ['user', 'creditCards'];

export function useCreditCards() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: CREDIT_CARDS_KEY,
    queryFn: () => userService.getCreditCards(),
    enabled: isAuthenticated,
  });
}

export function useSendCreditCardOtp() {
  return useMutation({
    mutationFn: () => userService.sendCreditCardOtp(),
    onSuccess: () => {
      toast.success('Mã OTP đã được gửi đến email của bạn.');
    },
    onError: () => toast.error('Không thể gửi mã OTP, vui lòng thử lại.'),
  });
}

export function useAddCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../services/userService').CreditCardPayload) =>
      userService.addCreditCard(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CREDIT_CARDS_KEY });
      toast.success('Đã thêm thẻ mới!');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.response?.data;
      if (msg === 'OTP_EXPIRED' || msg === 'INVALID_OTP') {
        toast.error('Mã OTP không hợp lệ hoặc đã hết hạn.');
      } else {
        toast.error('Không thể thêm thẻ.');
      }
    },
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteCreditCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CREDIT_CARDS_KEY });
      toast.success('Đã xóa thẻ!');
    },
    onError: () => toast.error('Không thể xóa thẻ.'),
  });
}

// ─── Seller: Warehouse ────────────────────────────────────────────────────────

const WAREHOUSE_KEY = ['user', 'warehouse'];

export function useMyWarehouse() {
  const { isAuthenticated, user } = useAuthStore();
  return useQuery({
    queryKey: WAREHOUSE_KEY,
    queryFn: () => userService.getMyWarehouse(),
    enabled: isAuthenticated && user?.role === 'SELLER',
  });
}

export function useUpdateMyWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WarehousePayload) => userService.updateMyWarehouse(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_KEY });
      toast.success('Đã lưu thông tin kho hàng!');
    },
    onError: () => toast.error('Không thể lưu kho hàng.'),
  });
}