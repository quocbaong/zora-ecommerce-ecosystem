import api from '@/lib/axios';

export interface Wallet {
  id: string;
  userId: string;
  walletType: string;
  availableBalance: number;
  escrowBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  orderId: string | null;
  amount: number;
  transactionType: string;
  description: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  sellerId: string;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: string; // PENDING, APPROVED, REJECTED
  createdAt: string;
  updatedAt: string;
}

export interface WalletDetailsResponse {
  wallet: Wallet;
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
}

export const walletService = {
  getMyWalletDetails: () =>
    api.get<WalletDetailsResponse>('/api/users/v1/wallets/me').then((r) => r.data),

  requestWithdrawal: (data: {
    amount: number;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  }) =>
    api.post<{ message: string }>('/api/users/v1/wallets/withdraw', data).then((r) => r.data),

  getAdminWithdrawals: () =>
    api.get<WithdrawalRequest[]>('/api/users/v1/wallets/admin/withdrawals').then((r) => r.data),

  processWithdrawal: (requestId: string, isApproved: boolean) =>
    api.post<{ message: string }>(`/api/users/v1/wallets/admin/withdrawals/${requestId}/process`, {
      isApproved,
    }).then((r) => r.data),
};
