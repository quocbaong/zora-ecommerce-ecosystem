import { useState } from 'react';
import { Table, Tag, Button, Typography, message, Modal, Input } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import { CloseCircleOutlined, ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [viewingOrder, setViewingOrder] = useState<any>(null); // For detailed view modal

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [actionOrderId, setActionOrderId] = useState<string>('');
  const [adminNote, setAdminNote] = useState('');

  // Lấy danh sách các đơn hàng đang bị khiếu nại
  const { data: disputedOrders, isLoading } = useQuery({
    queryKey: ['admin-disputed-orders'],
    queryFn: () => adminService.getDisputedOrders(),
    refetchInterval: 15000, // Tự động làm mới mỗi 15 giây
  });

  // Mutation duyệt hoàn tiền
  const approveMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) => adminService.approveRefund(id, adminNote),
    onSuccess: () => {
      message.success('Đã duyệt hoàn tiền thành công! Tiền sẽ được trả về Ví người mua hoặc Thẻ ngân hàng.');
      queryClient.invalidateQueries({ queryKey: ['admin-disputed-orders'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi duyệt hoàn tiền.');
    },
  });

  // Mutation từ chối hoàn tiền
  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) => adminService.rejectRefund(id, adminNote),
    onSuccess: () => {
      message.success('Đã từ chối khiếu nại. Tiền sẽ được chuyển cho Người bán.');
      queryClient.invalidateQueries({ queryKey: ['admin-disputed-orders'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi từ chối.');
    },
  });

  const handleApprove = (orderId: string) => {
    setActionType('APPROVE');
    setActionOrderId(orderId);
    setAdminNote('');
    setActionModalVisible(true);
  };

  const handleReject = (orderId: string) => {
    setActionType('REJECT');
    setActionOrderId(orderId);
    setAdminNote('');
    setActionModalVisible(true);
  };

  const submitAction = () => {
    if (!actionOrderId) return;
    if (!adminNote.trim()) {
      message.error(actionType === 'REJECT' ? "Vui lòng nhập lý do từ chối để thông báo cho khách hàng!" : "Vui lòng nhập lý do hoàn tiền để thông báo cho Seller!");
      return;
    }
    if (actionType === 'APPROVE') {
      approveMutation.mutate({ id: actionOrderId, adminNote });
    } else {
      rejectMutation.mutate({ id: actionOrderId, adminNote });
    }
    setActionModalVisible(false);
  };

  const columns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (text: string) => <span className="font-mono text-xs">{text.slice(0, 8).toUpperCase()}</span>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 150,
      render: (price: number) => (
        <span className="font-semibold text-orange-500">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}
        </span>
      ),
    },
    {
      title: 'Lý do khiếu nại',
      key: 'reason',
      width: 250,
      render: (_: any, record: any) => (
        <div className="max-w-xs p-2 bg-red-50 text-red-700 border border-red-100 rounded text-sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {record.refundRequest?.reason || record.disputeReason || 'Không có lý do rõ ràng'}
        </div>
      ),
    },
    {
      title: 'Trạng thái YC',
      key: 'status',
      width: 160,
      render: (_: any, record: any) => {
        const s = record.refundRequest?.status;
        if (s === 'UNDER_REVIEW') return <Tag color="orange">Admin Phân Xử</Tag>;
        if (s === 'DISPUTED_BY_SELLER') return <Tag color="red">Seller Khiếu Nại</Tag>;
        if (s === 'REQUESTED') return <Tag color="blue">Đang Thương Lượng</Tag>;
        if (s === 'RETURN_SHIPPING') return <Tag color="cyan">Đang Trả Hàng</Tag>;
        if (s === 'RETURN_RECEIVED') return <Tag color="green">Đã Nhận Hàng Hoàn</Tag>;
        return <Tag color="default">{s || record.status}</Tag>;
      }
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 130,
      render: (method: string) => (
        <Tag color={method === 'COD' || method === 'PAYOS' ? 'purple' : 'blue'}>
          {method}
        </Tag>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => <span className="text-gray-500 text-sm">{new Date(date).toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          type="text"
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
          onClick={() => setViewingOrder(record)}
        />
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title level={3} style={{ margin: 0 }}>Trung tâm Giải quyết Khiếu nại (Dispute Center)</Title>
          <p className="text-gray-500 mt-1">
            Nơi Admin đưa ra phán quyết cuối cùng về dòng tiền cho các đơn hàng tranh chấp.
          </p>
        </div>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={disputedOrders || []}
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: 1270 }}
      />

      <Modal
        title={<span className="text-lg font-bold text-gray-800">Chi tiết Khiếu nại - Đơn #{viewingOrder?.id?.slice(0, 8).toUpperCase()}</span>}
        open={!!viewingOrder}
        onCancel={() => setViewingOrder(null)}
        footer={(() => {
          const isResolved = ['REFUNDED', 'DELIVERED', 'REJECTED'].includes(viewingOrder?.status || viewingOrder?.refundRequest?.status);
          if (isResolved) {
            return [
              <Button key="close" onClick={() => setViewingOrder(null)}>Đóng</Button>
            ];
          }
          return [
            <Button key="close" onClick={() => setViewingOrder(null)}>Đóng</Button>,
            <Button key="reject" style={{ backgroundColor: '#52c41a', color: 'white' }} onClick={() => { handleReject(viewingOrder?.id); setViewingOrder(null); }}>Bảo vệ Seller (Từ chối)</Button>,
            <Button key="approve" danger type="primary" onClick={() => { handleApprove(viewingOrder?.id); setViewingOrder(null); }}>Hoàn tiền (Ủng hộ Buyer)</Button>,
          ];
        })()}
        width={900}
      >
        {viewingOrder && (
          <div className="space-y-6 pt-4">
            {/* Side-by-side Evidence Block */}
            <div className="grid grid-cols-2 gap-4">
              {/* Cánh Trái (Người Mua) */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                <h4 className="text-blue-700 font-semibold mb-2 flex items-center gap-2">
                  <ExclamationCircleOutlined /> Người Mua (Yêu cầu trả hàng)
                </h4>
                <div className="mb-3">
                  <span className="text-xs text-gray-500 font-semibold uppercase">Lý do:</span>
                  <p className="text-gray-800 text-sm mt-1 bg-white p-2 rounded border border-blue-100 min-h-[60px]">
                    {viewingOrder.refundRequest?.reason || "Không để lại ghi chú chi tiết"}
                  </p>
                </div>
                {viewingOrder.refundRequest?.evidenceUrls?.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase mb-1 block">Bằng chứng:</span>
                    <div className="flex gap-2 flex-wrap">
                      {viewingOrder.refundRequest.evidenceUrls.map((url: string, index: number) => (
                        <div key={index} className="w-16 h-16 rounded overflow-hidden border border-gray-300 shadow-sm bg-gray-100">
                          {url.includes('.mp4') || url.includes('.mov') ? (
                            <video src={url} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(url, '_blank')} />
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`buyer-evidence-${index}`} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cánh Phải (Người Bán) */}
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <h4 className="text-red-700 font-semibold mb-2 flex items-center gap-2">
                  <CloseCircleOutlined /> Người Bán (Khiếu nại ngược)
                </h4>
                <div className="mb-3">
                  <span className="text-xs text-gray-500 font-semibold uppercase">Lý do:</span>
                  <p className="text-gray-800 text-sm mt-1 bg-white p-2 rounded border border-red-100 min-h-[60px]">
                    {viewingOrder.refundRequest?.sellerDisputeReason || "Không để lại ghi chú chi tiết"}
                  </p>
                </div>
                {viewingOrder.refundRequest?.sellerEvidenceUrls?.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase mb-1 block">Bằng chứng (Unboxing):</span>
                    <div className="flex gap-2 flex-wrap">
                      {viewingOrder.refundRequest.sellerEvidenceUrls.map((url: string, index: number) => (
                        <div key={index} className="w-16 h-16 rounded overflow-hidden border border-gray-300 shadow-sm bg-gray-100">
                          {url.includes('.mp4') || url.includes('.mov') ? (
                            <video src={url} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(url, '_blank')} />
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`seller-evidence-${index}`} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Tổng tiền hoàn trả</p>
                <p className="text-2xl font-bold text-orange-500">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewingOrder.totalPrice)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Phương thức thanh toán gốc</p>
                <Tag color={viewingOrder.paymentMethod === 'COD' ? 'purple' : 'blue'} className="text-sm mt-1 py-1 px-3">
                  {viewingOrder.paymentMethod}
                </Tag>
              </div>
            </div>

            {/* Products (if available) */}
            {viewingOrder.items && viewingOrder.items.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">Danh sách sản phẩm trong đơn</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {viewingOrder.items.map((item: any) => (
                    <div key={item.id} className="flex gap-4 items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">Ảnh</div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 line-clamp-2">{item.productName}</p>
                        <p className="text-sm text-gray-500">SL: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-orange-500">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={actionType === 'APPROVE' ? 'Xác nhận Hoàn Tiền' : 'Từ chối Hoàn Tiền'}
        open={actionModalVisible}
        onOk={submitAction}
        onCancel={() => setActionModalVisible(false)}
        okText={actionType === 'APPROVE' ? 'Duyệt Hoàn Tiền' : 'Từ Chối Yêu Cầu'}
        okButtonProps={{
          danger: actionType === 'APPROVE',
          style: actionType === 'REJECT' ? { backgroundColor: '#52c41a' } : undefined,
          loading: approveMutation.isPending || rejectMutation.isPending
        }}
        cancelText="Hủy"
      >
        <div className="flex items-start mb-4">
          <ExclamationCircleOutlined
            className="text-2xl mr-3 mt-1"
            style={{ color: actionType === 'APPROVE' ? '#faad14' : '#ff4d4f' }}
          />
          <p>
            {actionType === 'APPROVE'
              ? 'Bạn có chắc chắn muốn xử thắng cho NGƯỜI MUA? Hành động này sẽ trừ tiền từ Ví Escrow của Người bán và hoàn trả lại cho Người mua.'
              : 'Bạn có chắc chắn muốn bảo vệ NGƯỜI BÁN? Hành động này sẽ bác bỏ yêu cầu của Người mua và cộng tiền vào Ví Khả Dụng của Người bán.'}
          </p>
        </div>
        <div className="mt-4">
          <p className="mb-2 font-medium">
            <span className="text-red-500">
              {actionType === 'APPROVE' ? 'Lý do hoàn tiền (Bắt buộc để báo cho Seller)*' : 'Lý do từ chối (Bắt buộc để báo cho Khách)*'}
            </span>
          </p>
          <Input.TextArea
            rows={4}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder={actionType === 'APPROVE' ? "Nhập lý do chấp thuận hoàn tiền (Seller sẽ đọc được)..." : "Nhập lý do từ chối khiếu nại (Khách hàng sẽ đọc được)..."}
          />
        </div>
      </Modal>
    </div>
  );
}
