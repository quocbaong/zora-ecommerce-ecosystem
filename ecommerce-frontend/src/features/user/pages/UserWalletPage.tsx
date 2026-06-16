import { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, Info } from 'lucide-react';
import { useWalletDetails, useRequestWithdrawal } from '@/features/shop/hooks/useWallet';

const formatVND = (value?: number) => {
  if (value === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const getTxnTypeStyle = (type: string) => {
  switch (type) {
    case 'ADD_FUNDS':
    case 'REFUND':
    case 'ORDER_REVENUE':
    case 'DEPOSIT':
      return { icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-100', label: 'Cộng tiền' };
    case 'DEDUCT_FUNDS':
    case 'WITHDRAWAL':
    case 'ORDER_PAYMENT':
      return { icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-100', label: 'Trừ tiền' };
    default:
      return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Khác' };
  }
};

export default function UserWalletPage() {
  const { data, isLoading } = useWalletDetails();
  const requestWithdrawal = useRequestWithdrawal();
  
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    requestWithdrawal.mutate({
      amount: Number(amount),
      bankName: bank,
      bankAccountNumber: accountNo,
      bankAccountName: accountName,
    });
    setAmount('');
    setBank('');
    setAccountNo('');
    setAccountName('');
  };

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-gray-500">Đang tải thông tin ví...</div>;
  }

  const wallet = data?.wallet;
  const transactions = data?.transactions || [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Wallet className="w-7 h-7 text-orange-500" />
        Ví ZORA của tôi
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Balance Card & Withdraw Form */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium opacity-90">Số dư khả dụng</h2>
              <div className="relative group">
                <Info className="w-4 h-4 opacity-80 cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50 pointer-events-none">
                  Số dư này đến từ các đơn hàng thanh toán bằng PayOS/COD bị hủy hoặc khiếu nại thành công. Bạn có thể rút số tiền này về ngân hàng bất kỳ lúc nào.
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight">{formatVND(wallet?.availableBalance)}</p>
          </div>
          
          {/* Withdraw Form */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Rút tiền về ngân hàng</h2>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền muốn rút (VNĐ)</label>
                <input
                  type="number"
                  required
                  max={wallet?.availableBalance || 0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngân hàng</label>
                  <input
                    required
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: Vietcombank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                  <input
                    required
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Nhập STK"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ thẻ</label>
                <input
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
                  placeholder="NGUYEN VAN A"
                />
              </div>
              <button
                type="submit"
                disabled={requestWithdrawal.isPending || !wallet?.availableBalance || wallet.availableBalance <= 0}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {requestWithdrawal.isPending ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Transaction History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Lịch sử giao dịch</h2>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Chưa có giao dịch nào.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((txn: any) => {
                  const style = getTxnTypeStyle(txn.transactionType);
                  const Icon = style.icon;
                  return (
                    <div key={txn.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${style.bg} ${style.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{txn.description}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(txn.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${style.color}`}>
                          {txn.transactionType === 'ADD_FUNDS' || txn.transactionType === 'REFUND' || txn.transactionType === 'ORDER_REVENUE' || txn.transactionType === 'DEPOSIT' ? '+' : '-'}
                          {formatVND(txn.amount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{txn.status?.toLowerCase() || 'Thành công'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
