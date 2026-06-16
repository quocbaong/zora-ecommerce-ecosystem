import { CheckCircle2, XCircle, Wallet, Clock, CheckCircle, ArrowDownLeft } from 'lucide-react';
import { useWalletDetails, useAdminWithdrawals, useProcessWithdrawal } from '../../shop/hooks/useWallet';

export default function AdminWalletPage() {
  const { data: walletData, isLoading: isWalletLoading } = useWalletDetails();
  const { data: withdrawalsData, isLoading: isWithdrawalsLoading } = useAdminWithdrawals();
  const processWithdrawal = useProcessWithdrawal();

  const handleProcess = (requestId: string, isApproved: boolean) => {
    const confirmation = window.confirm(
      `Bạn có chắc chắn muốn ${isApproved ? 'DUYỆT' : 'TỪ CHỐI'} lệnh rút tiền này không?`
    );
    if (!confirmation) return;

    processWithdrawal.mutate({ requestId, isApproved });
  };

  const formatVND = (value?: number) => {
    if (value === undefined || value === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (isWalletLoading || isWithdrawalsLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  const wallet = walletData?.wallet;
  const withdrawals = withdrawalsData || [];
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING');
  const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  // Giả sử tổng tiền hệ thống = Tiền của Admin + Tiền rút chờ duyệt + Tất cả tiền tạm giữ của hệ thống (mock hoặc ước lượng)
  const systemTotal = (wallet?.availableBalance || 0) + totalPendingAmount;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài chính Marketplace</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Doanh thu hoa hồng */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 mb-1">Doanh thu hoa hồng (5%)</p>
              <h2 className="text-3xl font-bold">{formatVND(wallet?.availableBalance)}</h2>
              <p className="text-sm text-indigo-200 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-white" /> Đã thu về ví khả dụng
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Tổng tiền chờ rút */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 mb-1">Tổng tiền chờ rút</p>
              <h2 className="text-3xl font-bold text-gray-900">{formatVND(totalPendingAmount)}</h2>
              <p className="text-sm text-orange-500 mt-2 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {pendingWithdrawals.length} lệnh đang chờ duyệt
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Tổng quỹ khả dụng hệ thống */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 mb-1">Tổng quỹ tích lũy Admin</p>
              <h2 className="text-3xl font-bold text-gray-900">{formatVND(systemTotal)}</h2>
              <p className="text-sm text-gray-500 mt-2">Bao gồm hoa hồng + tiền dự trữ</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <ArrowDownLeft className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm mt-8">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách yêu cầu rút tiền của Seller</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-6 py-3">Ngày tạo</th>
                <th className="px-6 py-3">ID Seller</th>
                <th className="px-6 py-3">Số tiền</th>
                <th className="px-6 py-3">Thông tin Ngân hàng</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    Chưa có yêu cầu rút tiền nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                withdrawals.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {new Date(req.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-900">{req.sellerId}</td>
                    <td className="px-6 py-4 font-bold text-orange-600">{formatVND(req.amount)}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{req.bankName}</p>
                      <p className="text-xs text-gray-500">
                        {req.bankAccountNumber} - {req.bankAccountName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          req.status === 'PENDING'
                            ? 'bg-orange-50 text-orange-600'
                            : req.status === 'APPROVED'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {req.status === 'PENDING'
                          ? 'Chờ duyệt'
                          : req.status === 'APPROVED'
                          ? 'Đã duyệt'
                          : 'Bị từ chối'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {req.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleProcess(req.id, true)}
                            disabled={processWithdrawal.isPending}
                            className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1.5 rounded hover:bg-green-100 font-medium transition"
                          >
                            <CheckCircle className="w-4 h-4" /> Duyệt
                          </button>
                          <button
                            onClick={() => handleProcess(req.id, false)}
                            disabled={processWithdrawal.isPending}
                            className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 font-medium transition"
                          >
                            <XCircle className="w-4 h-4" /> Từ chối
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Đã hoàn thành</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
