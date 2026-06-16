import { useState, useMemo, useRef } from 'react';
import { ShoppingBag, Search, ChevronLeft, ChevronRight, Eye, Bell, RefreshCw, CheckSquare, Printer, FileSpreadsheet, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSellerOrders, useUpdateOrderStatus, useShipOrder, useSellerApproveRefund } from '@/features/order/hooks/useSellerOrders';
import { useConfirmReturnReceived, useEscalateDispute } from '@/features/order/hooks/useOrders';
import { formatPrice, formatDate } from '@/utils/format';
import EmptyState from '@/components/common/EmptyState';
import { orderService, type Order } from '@/features/order/services/orderService';
import ShippingLabelModal from '@/features/order/components/ShippingLabelModal';
import { exportOrdersToExcel } from '@/features/order/utils/exportOrders';
import { printOrderLabels } from '@/features/order/utils/printLabels';
import DisputeTimeline from '../components/DisputeTimeline';

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<Order['status'], string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  DISPUTED: 'Đang khiếu nại',
  REFUNDED: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<Order['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPING: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-orange-100 text-orange-700 font-bold border border-orange-300 shadow-sm animate-pulse',
  REFUNDED: 'bg-purple-100 text-purple-700 border border-purple-200',
};

const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'DISPUTED', 'REFUNDED'] as const;

export default function SellerOrdersPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [disputeViewingOrder, setDisputeViewingOrder] = useState<Order | null>(null);
  const [shippingLabelOrder, setShippingLabelOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);

  const { data: allOrders, isLoading, isFetching, refetch } = useSellerOrders();
  const { mutate: updateStatus } = useUpdateOrderStatus();

  const pendingOrders = (allOrders ?? []).filter((o) => o.status === 'PENDING');

  // Client-side filter
  const filtered = (allOrders ?? []).filter((o) => {
    const matchStatus = !status || o.status === status;
    const matchKeyword = !keyword ||
      o.id.toLowerCase().includes(keyword.toLowerCase()) ||
      o.shippingAddress?.fullName?.toLowerCase().includes(keyword.toLowerCase());
    return matchStatus && matchKeyword;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const orders = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectedOrders = useMemo(
    () => (allOrders ?? []).filter((o) => selectedIds.has(o.id)),
    [allOrders, selectedIds]
  );

  const pageIds = orders.map((o) => o.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkConfirm = async () => {
    const pending = selectedOrders.filter((o) => o.status === 'PENDING');
    if (!pending.length) { toast.info('Không có đơn PENDING nào trong lựa chọn.'); return; }
    setIsBulkConfirming(true);
    let ok = 0;
    for (const o of pending) {
      await new Promise<void>((res) => {
        updateStatus({ id: o.id, status: 'CONFIRMED' }, { onSuccess: () => { ok++; res(); }, onError: () => res() });
      });
    }
    setIsBulkConfirming(false);
    clearSelection();
    toast.success(`Đã xác nhận ${ok}/${pending.length} đơn hàng`);
  };

  const handleBulkPrint = () => {
    if (!selectedOrders.length) { toast.info('Chưa chọn đơn nào.'); return; }
    printOrderLabels(selectedOrders);
  };

  const handleExportExcel = () => {
    const toExport = selectedIds.size > 0 ? selectedOrders : (allOrders ?? []);
    if (!toExport.length) { toast.info('Không có đơn nào để xuất.'); return; }
    exportOrdersToExcel(toExport);
    toast.success(`Đã xuất ${toExport.length} đơn ra Excel`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(draftKeyword);
    setPage(0);
  };

  const handleStatusFilter = (val: string) => {
    setStatus(val);
    setPage(0);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý đơn hàng</h1>
          {allOrders && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} đơn hàng{status || keyword ? ` (lọc từ ${allOrders.length})` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 transition-colors"
            title="Xuất Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Xuất Excel
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Pending orders banner */}
      {pendingOrders.length > 0 && (
        <button
          onClick={() => { setStatus('PENDING'); setPage(0); }}
          className="mb-5 w-full flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-left hover:bg-yellow-100 transition-colors"
        >
          <Bell className="h-5 w-5 text-yellow-600 shrink-0 animate-bounce" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">
              Có {pendingOrders.length} đơn hàng mới chờ xác nhận
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">Nhấn để xem và xác nhận đơn</p>
          </div>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white shrink-0">
            {pendingOrders.length}
          </span>
        </button>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={draftKeyword}
              onChange={(e) => setDraftKeyword(e.target.value)}
              placeholder="Tìm theo mã đơn hoặc tên người mua..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            Tìm
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Tất cả trạng thái</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted" />
          ))}
        </div>
      ) : !orders.length ? (
        <EmptyState
          icon={<ShoppingBag className="h-12 w-12" />}
          title="Chưa có đơn hàng"
          description={status || keyword ? 'Không tìm thấy đơn hàng phù hợp.' : 'Đơn hàng từ người mua sẽ xuất hiện ở đây.'}
        />
      ) : (
        <>
          {/* Bulk action toolbar */}
          {selectedIds.size > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5">
              <CheckSquare className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="text-sm font-semibold text-orange-800">
                Đã chọn {selectedIds.size} đơn
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleBulkConfirm}
                  disabled={isBulkConfirming}
                  className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isBulkConfirming ? 'Đang xác nhận...' : 'Xác nhận tất cả'}
                </button>
                <button
                  onClick={handleBulkPrint}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  In hàng loạt
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Xuất Excel
                </button>
                <button
                  onClick={clearSelection}
                  className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Bỏ chọn"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer accent-orange-500"
                      title="Chọn tất cả trang này"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mã đơn</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Người mua</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sản phẩm</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tổng tiền</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày đặt</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-muted/30 transition-colors ${order.status === 'PENDING' ? 'bg-yellow-50/60' : ''} ${selectedIds.has(order.id) ? 'bg-orange-50/60' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="h-4 w-4 cursor-pointer accent-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {order.shippingAddress?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.items?.length ? `${order.items.length} sản phẩm` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-orange-500">
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (order.status === 'DISPUTED') {
                            setDisputeViewingOrder(order);
                          } else {
                            setSelectedOrder(order);
                          }
                        }}
                        className={`rounded-lg p-2 transition-colors ${order.status === 'DISPUTED' ? 'text-orange-500 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 font-bold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                        title={order.status === 'DISPUTED' ? 'Xem Khiếu Nại' : 'Xem chi tiết'}
                      >
                        {order.status === 'DISPUTED' ? <AlertTriangle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Trang {page + 1} / {totalPages}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Trước
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sau <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOpenShippingLabel={setShippingLabelOrder}
        />
      )}

      {shippingLabelOrder && (
        <ShippingLabelModal
          order={shippingLabelOrder}
          onClose={() => setShippingLabelOrder(null)}
        />
      )}

      {/* DISPUTE MODAL (Giống Admin) */}
      {disputeViewingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                Chi tiết Khiếu nại - #{disputeViewingOrder.id.slice(0, 8).toUpperCase()}
              </h3>
              <button onClick={() => setDisputeViewingOrder(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <h4 className="text-red-700 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Lời nhắn / Lý do từ Người Mua:
                </h4>
                <p className="text-gray-800 font-medium whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-red-100">
                  {disputeViewingOrder.refundRequest?.reason || "Không để lại ghi chú chi tiết"}
                </p>

                {(() => {
                  const ev = disputeViewingOrder.refundRequest?.evidenceUrls || [];
                  if (ev.length === 0) return null;
                  return (
                    <div className="mt-4">
                      <h5 className="font-semibold text-gray-800 mb-2 text-sm">Bằng chứng (Hình ảnh/Video):</h5>
                      <div className="flex gap-2 flex-wrap">
                        {ev.map((url: string, index: number) => (
                        <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                          {url.includes('.mp4') || url.includes('.mov') ? (
                            <video src={url} className="w-full h-full object-cover" controls />
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`evidence-${index}`} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Tổng tiền hoàn trả</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {formatPrice(disputeViewingOrder.totalPrice)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Phương thức thanh toán gốc</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${disputeViewingOrder.paymentMethod === 'COD' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {disputeViewingOrder.paymentMethod}
                  </span>
                </div>
              </div>

              {disputeViewingOrder.items && disputeViewingOrder.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">Danh sách sản phẩm trong đơn</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {disputeViewingOrder.items.map((item: any) => {
                      const refundItem = disputeViewingOrder.refundRequest?.items?.find((r: any) => r.orderItemId === item.id);
                      const isDisputed = !!refundItem;
                      return (
                      <div key={item.id} className={`flex gap-4 items-center p-3 rounded-lg border shadow-sm ${isDisputed ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">Ảnh</div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 line-clamp-2">{item.productName}</p>
                          <p className="text-sm text-gray-500">SL: {isDisputed ? refundItem.quantity : item.quantity}</p>
                          {isDisputed && <span className="inline-block mt-1 text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Đang khiếu nại</span>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-orange-500">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              )}

              {disputeViewingOrder.refundRequest?.status && (
                <div className="bg-white border border-orange-100 rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-800 mb-2">Tiến trình xử lý</h4>
                  <DisputeTimeline status={disputeViewingOrder.refundRequest.status} type={disputeViewingOrder.refundRequest.type} />
                  
                  {disputeViewingOrder.refundRequest.status === 'WAITING_FOR_RETURN' && disputeViewingOrder.refundRequest.updatedAt && (
                    <div className="mt-4 px-4 py-2.5 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                      <p className="text-sm text-orange-800 font-medium">
                        Khách hàng có thời hạn đến <span className="font-bold">{calculateDeadline(disputeViewingOrder.refundRequest.updatedAt, 6)}</span> để gửi hàng cho bưu tá.
                      </p>
                    </div>
                  )}

                  {disputeViewingOrder.refundRequest.status === 'RETURN_RECEIVED' && disputeViewingOrder.refundRequest.updatedAt && (
                    <div className="mt-4 px-4 py-2.5 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                      <p className="text-sm text-red-800 font-medium">
                        Bạn có thời hạn đến <span className="font-bold">{calculateDeadline(disputeViewingOrder.refundRequest.updatedAt, 2)}</span> để phản hồi/khiếu nại ngược. Quá hạn, hệ thống sẽ tự động đồng ý hoàn tiền cho khách!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {disputeViewingOrder.refundRequest?.returnShipment && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-blue-800 font-semibold mb-2">Thông tin trả hàng</h4>
                  <p className="text-sm">ĐVVC: <span className="font-semibold">{disputeViewingOrder.refundRequest.returnShipment.carrier}</span></p>
                  <p className="text-sm">Mã vận đơn: <span className="font-semibold font-mono">{disputeViewingOrder.refundRequest.returnShipment.trackingCode}</span></p>
                  <p className="text-sm">Trạng thái: <span className="font-semibold">{disputeViewingOrder.refundRequest.returnShipment.status}</span></p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0 flex gap-3 justify-end">
              <button
                onClick={() => setDisputeViewingOrder(null)}
                className="px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
              {disputeViewingOrder.refundRequest?.status === 'RETURN_SHIPPING' ? (
                <ConfirmReturnButton orderId={disputeViewingOrder.id} onClose={() => setDisputeViewingOrder(null)} />
              ) : disputeViewingOrder.refundRequest?.status === 'WAITING_FOR_RETURN' ? (
                <div className="flex-1 rounded-xl bg-gray-100 py-2.5 px-4 text-sm font-semibold text-gray-500 text-center border border-gray-200 flex items-center justify-center">
                  Đang chờ người mua gửi hàng...
                </div>
              ) : disputeViewingOrder.refundRequest?.status === 'RETURN_RECEIVED' ? (
                <>
                  <SellerEscalateDisputeModal orderId={disputeViewingOrder.id} onClose={() => setDisputeViewingOrder(null)} />
                  <SellerApproveRefundButton orderId={disputeViewingOrder.id} onClose={() => setDisputeViewingOrder(null)} />
                </>
              ) : (
                <>
                  <SellerEscalateDisputeModal orderId={disputeViewingOrder.id} onClose={() => setDisputeViewingOrder(null)} />
                  {(!disputeViewingOrder.refundRequest || disputeViewingOrder.refundRequest.status === 'REQUESTED') && (
                    <SellerApproveRefundButton orderId={disputeViewingOrder.id} onClose={() => setDisputeViewingOrder(null)} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bóc tách nút Approve để sử dụng Hook đúng chuẩn
function SellerApproveRefundButton({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const { mutate: approveRefund, isPending } = useSellerApproveRefund();
  return (
    <button
      onClick={() => {
        approveRefund(orderId, {
          onSuccess: () => {
            toast.success('Đã chấp nhận hoàn tiền. Giao dịch đã kết thúc.');
            onClose();
          },
          onError: (e: any) => toast.error(e?.response?.data?.error || 'Không thể hoàn tiền. Vui lòng thử lại.'),
        });
      }}
      disabled={isPending}
      className="px-6 py-2.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 disabled:opacity-50"
    >
      {isPending ? 'Đang xử lý...' : 'Hàng nguyên vẹn (Đồng ý hoàn tiền)'}
    </button>
  );
}

function ConfirmReturnButton({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const { mutate: confirmReceived, isPending } = useConfirmReturnReceived();
  return (
    <button
      onClick={() => {
        confirmReceived(orderId, {
          onSuccess: () => {
            toast.success('Đã nhận hàng. Vui lòng kiểm tra và quyết định hoàn tiền hoặc khiếu nại.');
            onClose();
          }
        });
      }}
      disabled={isPending}
      className="px-6 py-2.5 rounded-xl border border-blue-500 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-50"
    >
      {isPending ? 'Đang xử lý...' : 'Xác nhận Bưu tá ĐÃ GIAO HÀNG'}
    </button>
  );
}

function SellerEscalateDisputeModal({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: escalate, isPending } = useEscalateDispute();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      // Dùng chung api upload của order
      const uploadPromises = Array.from(files).map(file => orderService.uploadEvidence(file));
      const urls = await Promise.all(uploadPromises);
      setEvidenceUrls(prev => [...prev, ...urls]);
      toast.success('Tải bằng chứng lên thành công!');
    } catch (error) {
      toast.error('Lỗi khi tải bằng chứng. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Vui lòng nhập lý do khiếu nại.');
      return;
    }
    if (evidenceUrls.length === 0) {
      toast.error('Vui lòng cung cấp ít nhất 1 hình ảnh hoặc video mở hộp.');
      return;
    }

    escalate({ id: orderId, payload: { sellerDisputeReason: reason, sellerEvidenceUrls: evidenceUrls } }, {
      onSuccess: () => {
        setIsOpen(false);
        onClose();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-2.5 rounded-xl border border-red-500 text-red-600 font-bold hover:bg-red-50 transition-colors bg-white disabled:opacity-50"
      >
        Hàng lỗi/bị tráo (Khiếu nại Khách)
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Khiếu nại người mua</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-sm border border-orange-100">
                <strong>Lưu ý quan trọng:</strong> Bạn chỉ được phép khiếu nại nếu khách hàng gửi trả hàng bị vỡ, hỏng, thiếu phụ kiện, hoặc đánh tráo sản phẩm (gửi cục gạch).
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Lý do khiếu nại chi tiết <span className="text-red-500">*</span></label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Khách hàng gửi trả lại hộp rỗng, không có điện thoại bên trong..."
                  className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Hình ảnh/Video bằng chứng mở hộp (Unboxing) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {evidenceUrls.map((url, idx) => (
                    <div key={idx} className="aspect-square relative rounded-xl overflow-hidden border border-gray-200 group">
                      {url.match(/\.(mp4|mov|webm)$/i) ? (
                        <video src={url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => setEvidenceUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {evidenceUrls.length < 5 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-500 transition-colors bg-gray-50 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <span className="text-xs font-medium">Đang tải...</span>
                      ) : (
                        <>
                          <span className="text-2xl mb-1">+</span>
                          <span className="text-[10px] font-medium px-2 text-center">Thêm Ảnh/Video</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || isUploading}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm shadow-red-200"
              >
                {isPending ? 'Đang gửi...' : 'Gửi Khiếu Nại Cho Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Trạng thái kế tiếp hợp lệ cho từng trạng thái hiện tại
const NEXT_STATUSES: Partial<Record<Order['status'], Order['status'][]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
};

function calculateDeadline(dateStr: string, daysToAdd: number) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + daysToAdd);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `23:59 ngày ${dd}/${mm}/${yyyy}`;
}

function OrderDetailDrawer({
  order,
  onClose,
  onOpenShippingLabel,
}: {
  order: Order;
  onClose: () => void;
  onOpenShippingLabel: (order: Order) => void;
}) {
  const [nextStatus, setNextStatus] = useState<Order['status'] | ''>('');
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
  const { mutate: shipOrder, isPending: isShipping } = useShipOrder();
  const { mutate: approveRefund, isPending: isApproving } = useSellerApproveRefund();

  const allowedNextStatuses = NEXT_STATUSES[order.status] ?? [];

  const handleUpdateStatus = () => {
    if (!nextStatus) return;
    updateStatus(
      { id: order.id, status: nextStatus },
      {
        onSuccess: () => {
          toast.success(`Đã cập nhật trạng thái: ${STATUS_LABELS[nextStatus]}`);
          setNextStatus('');
          onClose();
        },
        onError: () => toast.error('Lỗi cập nhật trạng thái đơn hàng.'),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-background shadow-2xl flex flex-col overflow-y-auto">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="font-bold text-foreground">Chi tiết đơn hàng</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
          </div>

          {/* Buyer info */}
          {order.shippingAddress && (
            <div className="rounded-xl border border-border p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Người nhận</p>
              <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.phoneNumber}</p>
              <p className="text-sm text-muted-foreground">
                {[
                  order.shippingAddress.street,
                  order.shippingAddress.ward,
                  order.shippingAddress.district,
                  order.shippingAddress.province,
                ].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sản phẩm</p>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity} · {formatPrice(item.price)}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-border pt-4 flex justify-between items-center">
            <p className="font-semibold text-foreground">Tổng cộng</p>
            <p className="text-lg font-bold text-orange-500">{formatPrice(order.totalPrice)}</p>
          </div>

          {/* Tracking info */}
          {order.trackingNumber && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-1">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Thông tin giao hàng</p>
              <p className="text-sm font-medium text-blue-900">Mã vận đơn: {order.trackingNumber}</p>
              <p className="text-sm text-blue-800">Đơn vị: {order.shippingProvider}</p>
              {order.estimatedDeliveryDate && (
                <p className="text-sm text-blue-800">Dự kiến giao: {order.estimatedDeliveryDate}</p>
              )}
              <button
                onClick={() => onOpenShippingLabel(order)}
                className="mt-3 w-full rounded-lg border border-blue-300 bg-white py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                In vận đơn
              </button>
              {order.deliveredAt && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-sm font-semibold text-green-700">Giao thành công lúc: {formatDate(order.deliveredAt)}</p>
                </div>
              )}
            </div>
          )}

          {/* Dispute Actions */}
          {order.status === 'DISPUTED' && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-red-700">
                <span className="text-xl">⚠️</span>
                <h4 className="font-bold text-base m-0">Đơn hàng đang bị khiếu nại!</h4>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lời nhắn / Lý do từ người mua:</p>
                <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {order.refundRequest?.reason || 'Khách hàng không ghi rõ lý do'}
                </p>

                {order.refundRequest?.evidenceUrls && order.refundRequest.evidenceUrls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bằng chứng (Hình ảnh/Video):</p>
                    <div className="flex gap-2 flex-wrap">
                      {order.refundRequest.evidenceUrls.map((url: string, index: number) => (
                        <div key={index} className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                          {url.includes('.mp4') || url.includes('.mov') ? (
                            <video src={url} className="w-full h-full object-cover" controls />
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`evidence-${index}`} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Số tiền hoàn lại</p>
                  <p className="text-base font-bold text-orange-500">{formatPrice(order.totalPrice)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phương thức thanh toán</p>
                  <p className="text-sm font-semibold text-gray-900">{order.paymentMethod}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    approveRefund(order.id, {
                      onSuccess: () => {
                        toast.success('Đã chấp nhận hoàn tiền. Giao dịch đã kết thúc.');
                        onClose();
                      },
                      onError: (e: any) => toast.error(e?.response?.data?.error || 'Không thể hoàn tiền. Vui lòng thử lại.'),
                    });
                  }}
                  disabled={isApproving}
                  className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-md shadow-orange-200"
                >
                  {isApproving ? 'Đang xử lý...' : 'Đồng ý hoàn tiền'}
                </button>
                <button
                  onClick={() => {
                    toast.info('Hệ thống đã ghi nhận yêu cầu. Quản trị viên (Admin) sẽ vào phân xử đơn hàng này.');
                    onClose();
                  }}
                  className="flex-1 rounded-xl border border-red-300 bg-white py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Nhờ Admin phân xử
                </button>
              </div>
            </div>
          )}

          {/* Update status */}
          {allowedNextStatuses.length > 0 && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cập nhật trạng thái</p>

              {/* Quick-confirm button for PENDING orders */}
              {order.status === 'PENDING' && (
                <button
                  onClick={() => {
                    updateStatus(
                      { id: order.id, status: 'CONFIRMED' },
                      {
                        onSuccess: () => {
                          toast.success('Đã xác nhận đơn hàng');
                          onClose();
                        },
                        onError: (error: any) => toast.error(error?.response?.data?.error || 'Lỗi xác nhận đơn hàng.'),
                      }
                    );
                  }}
                  disabled={isPending}
                  className="w-full rounded-lg bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? 'Đang xử lý...' : 'Xác nhận đơn hàng'}
                </button>
              )}

              {/* Quick-ship button for CONFIRMED orders */}
              {order.status === 'CONFIRMED' && (
                <button
                  onClick={() => {
                    shipOrder(order.id, {
                      onSuccess: (shippedOrder) => {
                        toast.success('Đã tạo mã vận đơn và giao hàng');
                        onOpenShippingLabel(shippedOrder);
                        onClose();
                      },
                      onError: () => toast.error('Lỗi giao hàng.'),
                    });
                  }}
                  disabled={isShipping}
                  className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isShipping ? 'Đang xử lý...' : 'Giao hàng (Tạo mã vận đơn)'}
                </button>
              )}

              {/* Dropdown for other transitions */}
              {order.status !== 'PENDING' && order.status !== 'CONFIRMED' && (
                <div className="flex gap-2">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as Order['status'])}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Chọn trạng thái mới</option>
                    {allowedNextStatuses.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={!nextStatus || isPending}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPending ? '...' : 'Áp dụng'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
