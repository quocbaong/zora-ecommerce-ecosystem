import { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, Building2, CheckCircle2, Info } from 'lucide-react';
import { useWalletDetails, useRequestWithdrawal } from '../hooks/useWallet';
import { useOrderById } from '@/features/order/hooks/useOrders';

const formatVND = (value?: number) => {
  if (value === undefined || value === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const getTxnTypeStyle = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
    case 'ESCROW_RELEASE':
    case 'WITHDRAWAL_REJECTED':
      return { bg: 'bg-green-50 text-green-600', sign: '+', color: 'text-green-600' };
    case 'WITHDRAWAL_APPROVED':
      return { bg: 'bg-green-50 text-green-600', sign: '', color: 'text-green-600' };
    case 'WITHDRAWAL_REQUEST':
      return { bg: 'bg-red-50 text-red-600', sign: '-', color: 'text-red-600' };
    default:
      return { bg: 'bg-gray-50 text-gray-600', sign: '', color: 'text-gray-700' };
  }
};

const getTxnTypeText = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return 'Cộng tiền đơn hàng';
    case 'ESCROW_DEPOSIT':
      return 'Tạm giữ tiền bán hàng';
    case 'ESCROW_RELEASE':
      return 'Giải phóng tiền tạm giữ';
    case 'WITHDRAWAL_REQUEST':
      return 'Yêu cầu rút tiền';
    case 'WITHDRAWAL_APPROVED':
      return 'Duyệt lệnh rút tiền thành công';
    case 'WITHDRAWAL_REJECTED':
      return 'Hoàn tiền lệnh rút bị từ chối';
    default:
      return type;
  }
};

function TransactionItem({ txn }: { txn: any }) {
  const { data: order } = useOrderById(txn.orderId || '');
  const [showDetails, setShowDetails] = useState(false);
  
  const style = getTxnTypeStyle(txn.transactionType);
  const saleTxnTypes = ['ESCROW_DEPOSIT', 'ESCROW_RELEASE', 'DEPOSIT', 'DEDUCT', 'ESCROW_DEDUCT'];
  const isSaleTxn = saleTxnTypes.includes(txn.transactionType);
  
  let orderName = txn.description || getTxnTypeText(txn.transactionType);
  if (isSaleTxn && order && order.items && order.items.length > 0) {
    const itemNames = order.items.map((i: any) => i.productName).join(', ');
    
    let prefix = 'Tiền bán: ';
    if (txn.transactionType === 'ESCROW_RELEASE') prefix = 'Giải phóng tiền: ';
    else if (txn.transactionType === 'ESCROW_DEPOSIT') prefix = 'Tiền bán (tạm giữ): ';
    else if (txn.transactionType === 'DEDUCT') prefix = 'Thu hồi tiền: ';
    else if (txn.transactionType === 'ESCROW_DEDUCT') prefix = 'Thu hồi tạm giữ: ';
    
    orderName = prefix + itemNames;
  }

  const netAmount = Math.abs(txn.amount);
  const grossAmount = isSaleTxn ? netAmount / 0.95 : 0;
  const platformFee = isSaleTxn ? grossAmount * 0.05 : 0;

  return (
    <div className="flex flex-col p-4 border rounded-xl hover:border-orange-200 transition bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${style.bg}`}>
            {txn.transactionType === 'WITHDRAWAL_APPROVED' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : txn.amount < 0 ? (
              <ArrowUpRight className="w-5 h-5" />
            ) : (
              <ArrowDownLeft className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900" title={orderName}>{orderName}</p>
              {isSaleTxn && (
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="p-1 hover:bg-orange-100 rounded-full text-gray-400 hover:text-orange-500 transition"
                  title="Xem chi tiết dòng tiền"
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(txn.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
        {txn.transactionType === 'WITHDRAWAL_APPROVED' ? (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
            Thành công
          </span>
        ) : (
          <span className={`font-bold text-base whitespace-nowrap ${style.color}`}>
            {style.sign}{formatVND(netAmount)}
          </span>
        )}
      </div>

      {showDetails && isSaleTxn && (
        <div className="mt-3 p-3 bg-orange-50/60 rounded-lg text-sm border border-orange-100/50">
          <div className="flex justify-between text-gray-600 mb-1.5">
            <span>Giá trị đơn hàng gốc:</span>
            <span>{formatVND(grossAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600 mb-2 border-b border-orange-100 pb-2">
            <span>Phí nền tảng ZORA (5%):</span>
            <span className="text-red-500 font-medium">-{formatVND(platformFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900">
            <span>Thực nhận {txn.transactionType === 'ESCROW_RELEASE' ? '(Vào ví Khả dụng)' : '(Vào ví Escrow)'}:</span>
            <span className="text-green-600">{formatVND(netAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerWalletPage() {
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');

  const { data, isLoading } = useWalletDetails();
  const requestWithdrawal = useRequestWithdrawal();

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !bank || !accountNo || !accountName) {
      alert('Vui lòng điền đầy đủ thông tin yêu cầu rút tiền.');
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Số tiền rút không hợp lệ.');
      return;
    }

    if (data?.wallet && data.wallet.availableBalance < numAmount) {
      alert('Số tiền yêu cầu vượt quá số dư khả dụng.');
      return;
    }

    requestWithdrawal.mutate({
      amount: numAmount,
      bankName: bank,
      bankAccountNumber: accountNo,
      bankAccountName: accountName,
    }, {
      onSuccess: () => {
        setAmount('');
        setBank('');
        setAccountNo('');
        setAccountName('');
      }
    });
  };



  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-gray-200 rounded-2xl lg:col-span-1"></div>
          <div className="h-96 bg-gray-200 rounded-2xl lg:col-span-2"></div>
        </div>
      </div>
    );
  }

  const wallet = data?.wallet;
  const transactions = data?.transactions || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quản lý Ví Marketplace</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Số dư khả dụng */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 mb-1">Tổng tiền khả dụng</p>
              <h2 className="text-4xl font-bold">{formatVND(wallet?.availableBalance)}</h2>
              <p className="text-sm text-orange-200 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Có thể rút ngay
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Wallet className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Tiền đang tạm giữ */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 mb-1">Tiền đang tạm giữ (Escrow)</p>
              <h2 className="text-3xl font-bold text-gray-900">{formatVND(wallet?.escrowBalance)}</h2>
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-500" /> Chờ giao hàng thành công
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <ArrowDownLeft className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rút tiền */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-600" />
            Yêu cầu rút tiền
          </h3>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Số tiền cần rút (đ)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="w-full border rounded-xl px-4 py-2" 
                placeholder="0 đ" 
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ngân hàng thụ hưởng</label>
              <select 
                value={bank} 
                onChange={(e) => setBank(e.target.value)} 
                className="w-full border rounded-xl px-4 py-2"
                required
              >
                <option value="">Chọn ngân hàng</option>
                <option value="Vietcombank">Vietcombank</option>
                <option value="MB Bank">MB Bank</option>
                <option value="Techcombank">Techcombank</option>
                <option value="VietinBank">VietinBank</option>
                <option value="BIDV">BIDV</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Số tài khoản ngân hàng</label>
              <input 
                type="text" 
                value={accountNo} 
                onChange={(e) => setAccountNo(e.target.value)} 
                className="w-full border rounded-xl px-4 py-2" 
                placeholder="Nhập số tài khoản" 
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tên chủ tài khoản (Không dấu)</label>
              <input 
                type="text" 
                value={accountName} 
                onChange={(e) => setAccountName(e.target.value.toUpperCase())} 
                className="w-full border rounded-xl px-4 py-2" 
                placeholder="NGUYEN VAN A" 
                required
              />
            </div>
            <button 
              type="submit"
              disabled={requestWithdrawal.isPending}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 disabled:bg-gray-400 transition"
            >
              {requestWithdrawal.isPending ? 'Đang xử lý...' : 'Tạo Lệnh Rút'}
            </button>
          </form>
        </div>

        {/* Lịch sử giao dịch */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm lg:col-span-2 flex flex-col h-[520px]">
          <h3 className="text-lg font-semibold mb-4">Lịch sử giao dịch ví</h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Clock className="w-12 h-12 mb-2 text-gray-300 animate-pulse" />
                <p>Chưa có biến động giao dịch nào</p>
              </div>
            ) : (
              transactions.map((txn) => (
                <TransactionItem key={txn.id} txn={txn} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
