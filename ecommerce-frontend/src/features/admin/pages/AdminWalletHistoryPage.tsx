import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Search, Filter, Calendar } from 'lucide-react';
import { useWalletDetails } from '../../shop/hooks/useWallet';
import { useOrderById } from '@/features/order/hooks/useOrders';
import { orderService } from '@/features/order/services/orderService';

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
      return { bg: 'bg-blue-50 text-blue-600', sign: '+', color: 'text-blue-600' };
  }
};

function AdminTransactionRow({ txn }: { txn: any }) {
  const { data: order } = useOrderById(txn.orderId || '');
  const style = getTxnTypeStyle(txn.transactionType);
  
  let orderName = txn.description || 'Giao dịch hệ thống';
  if (txn.orderId && order && order.items && order.items.length > 0) {
    const itemNames = order.items.map((i: any) => i.productName).join(', ');
    orderName = `Thu phí hoa hồng: ${itemNames}`;
  }

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
        {new Date(txn.createdAt).toLocaleString('vi-VN')}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${style.bg}`}>
            {txn.amount < 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownLeft className="w-4 h-4" />
            )}
          </div>
          <span className="font-medium text-gray-900">
            {txn.transactionType === 'DEPOSIT' ? 'Thu Phí Sàn' : txn.transactionType}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 max-w-md">
        <p className="text-gray-900 font-medium truncate" title={orderName}>
          {orderName}
        </p>
        {txn.orderId && (
          <p className="text-xs text-gray-500 font-mono mt-0.5" title={txn.orderId}>
            ID: {txn.orderId.substring(0, 8)}...
          </p>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <span className={`font-bold text-base ${style.color}`}>
          {style.sign}{formatVND(Math.abs(txn.amount))}
        </span>
      </td>
    </tr>
  );
}

export default function AdminWalletHistoryPage() {
  const { data, isLoading } = useWalletDetails();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderNames, setOrderNames] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const transactions = data?.transactions || [];

  useEffect(() => {
    const fetchNames = async () => {
      const newNames = { ...orderNames };
      let changed = false;
      const ids = Array.from(new Set(transactions.map((t: any) => t.orderId).filter(Boolean))) as string[];
      
      for (const id of ids) {
        if (!newNames[id]) {
          try {
            const order = await orderService.getOrderById(id);
            if (order && order.items) {
              newNames[id] = order.items.map((i: any) => i.productName).join(', ');
              changed = true;
            }
          } catch (e) {}
        }
      }
      if (changed) setOrderNames(newNames);
    };
    if (transactions.length > 0) fetchNames();
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-gray-200 rounded-lg"></div>
        <div className="h-20 bg-gray-200 rounded-xl"></div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  // Lọc theo Tìm kiếm, Loại giao dịch và Thời gian
  const filteredTransactions = transactions.filter((txn: any) => {
    const orderName = orderNames[txn.orderId] || '';
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || 
                          (txn.description?.toLowerCase() || '').includes(term) || 
                          (txn.orderId?.toLowerCase() || '').includes(term) ||
                          orderName.toLowerCase().includes(term);

    const matchesType = filterType === 'ALL' || txn.transactionType === filterType;
    
    let matchesDate = true;
    const txDate = new Date(txn.createdAt).getTime();
    if (startDate) {
      matchesDate = matchesDate && txDate >= new Date(startDate).setHours(0, 0, 0, 0);
    }
    if (endDate) {
      matchesDate = matchesDate && txDate <= new Date(endDate).setHours(23, 59, 59, 999);
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentData = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sao kê Tài chính Toàn sàn</h1>
          <p className="text-gray-500 mt-1">Lịch sử thu phí hoa hồng và các biến động số dư của Admin</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tên SP hoặc ID Đơn..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-56"
            />
          </div>
          
          <div className="flex items-center border rounded-lg overflow-hidden bg-white px-2">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="py-2 outline-none text-sm text-gray-700 bg-transparent"
              title="Từ ngày"
            />
            <span className="text-gray-300 mx-1">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="py-2 outline-none text-sm text-gray-700 bg-transparent"
              title="Đến ngày"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select 
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer text-gray-700"
            >
              <option value="ALL">Tất cả giao dịch</option>
              <option value="DEPOSIT">Thu phí sàn</option>
              <option value="WITHDRAWAL_REQUEST">Lệnh rút tiền</option>
              <option value="WITHDRAWAL_APPROVED">Giải ngân</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Thời gian</th>
                <th className="px-6 py-4 font-semibold">Loại giao dịch</th>
                <th className="px-6 py-4 font-semibold">Diễn giải (Order ID)</th>
                <th className="px-6 py-4 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">Không tìm thấy giao dịch nào phù hợp.</p>
                    <p className="text-sm text-gray-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc khoảng thời gian.</p>
                  </td>
                </tr>
              ) : (
                currentData.map((txn: any) => (
                  <AdminTransactionRow key={txn.id} txn={txn} />
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Phân trang */}
        {filteredTransactions.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between text-sm text-gray-500">
            <span>
              Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} trong tổng số <strong className="text-gray-900">{filteredTransactions.length}</strong> giao dịch
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 transition"
              >
                Trước
              </button>
              <span className="font-medium px-2">Trang {currentPage} / {totalPages || 1}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
