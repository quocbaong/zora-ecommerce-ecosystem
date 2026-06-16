import { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Space, Typography, message, Select, Image } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appealService, BanAppeal } from '../services/appealService';
import { getStompClient } from '@/lib/stompClient';

const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ',
  APPROVED: 'Đã duyệt (Mở khóa/Hủy cảnh cáo)',
  REJECTED: 'Từ chối (Bị phạt)',
  FINE_REQUIRED: 'Yêu cầu phạt tiền (Cũ)',
  PAID: 'Đã thanh toán (Cũ)',
};

export default function AdminAppealsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  const [reviewModal, setReviewModal] = useState<BanAppeal | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    let client: any;
    try {
      client = getStompClient();
    } catch (e) {
      console.warn('[AdminAppealsPage Socket] Failed to get STOMP client:', e);
      return;
    }

    let subscription: any = null;

    const subscribeToTopic = () => {
      try {
        subscription = client.subscribe('/topic/notifications/admin', (frame: any) => {
          try {
            const notification = JSON.parse(frame.body);
            if (notification.title === 'Đơn kháng nghị mới' || notification.message?.includes('kháng nghị mới')) {
              message.info(notification.message || 'Có đơn kháng nghị mới!');
              queryClient.invalidateQueries({ queryKey: ['admin-appeals'] });
            }
          } catch (e) {
            // ignore
          }
        });
        console.log('[STOMP] Subscribed to admin topic: /topic/notifications/admin');
      } catch (err) {
        console.error('Error subscribing to Admin STOMP topic:', err);
      }
    };

    if (client.active) {
      subscribeToTopic();
    } else {
      client.onConnect = () => {
        subscribeToTopic();
      };
      client.activate();
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
          console.log('[STOMP] Unsubscribed from admin topic');
        } catch (err) {
          // ignore
        }
      }
    };
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appeals', page, filterStatus],
    queryFn: () => appealService.getAdminAppeals({ page: page - 1, size: 20, status: filterStatus || undefined }),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { id: string; status: string; fineAmount?: number; adminNote?: string }) =>
      appealService.reviewAppeal(payload.id, payload),
    onSuccess: () => {
      message.success('Đã duyệt đơn kháng nghị');
      queryClient.invalidateQueries({ queryKey: ['admin-appeals'] });
      setReviewModal(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi xử lý'),
  });

  const handleReviewClick = (record: BanAppeal) => {
    setReviewModal(record);
    form.setFieldsValue({ status: record.status, adminNote: record.adminNote });
  };

  const onReviewSubmit = async () => {
    try {
      const values = await form.validateFields();
      reviewMutation.mutate({
        id: reviewModal!.id,
        ...values,
      });
    } catch (e) {
      // Validate failed
    }
  };

  const columns = [
    {
      title: 'Tài khoản (Email)',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 300,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v}</span>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 220,
      render: (_: any, r: BanAppeal) => <Tag color={STATUS_COLORS[r.status] || 'default'}>{STATUS_LABELS[r.status] || r.status}</Tag>,
    },
    {
      title: 'Ghi chú Admin',
      dataIndex: 'adminNote',
      key: 'adminNote',
      width: 220,
      ellipsis: true,
      render: (v?: string) => <span title={v || '—'}>{v || '—'}</span>,
    },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      width: 150,
      render: (_: any, r: BanAppeal) => new Date(r.createdAt).toLocaleString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, r: BanAppeal) => (
        <Button size="small" type="primary" onClick={() => handleReviewClick(r)}>
          Xử lý
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Quản lý Kháng nghị</Typography.Title>
      
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Lọc trạng thái"
          style={{ width: 280 }}
          value={filterStatus || undefined}
          onChange={(v) => { setFilterStatus(v ?? ''); setPage(1); }}
        >
          <Option value="PENDING">Đang chờ</Option>
          <Option value="APPROVED">Chấp nhận (Hủy cảnh cáo/Mở khóa)</Option>
          <Option value="REJECTED">Từ chối (Áp dụng hình phạt)</Option>
        </Select>
      </Space>

      <Table
        rowKey="id"
        dataSource={data?.content}
        columns={columns}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.totalElements,
          onChange: setPage,
        }}
        size="small"
        scroll={{ x: 1190 }}
      />

      <Modal
        open={!!reviewModal}
        title="Xử lý đơn kháng nghị"
        onCancel={() => setReviewModal(null)}
        onOk={onReviewSubmit}
        confirmLoading={reviewMutation.isPending}
        okText="Lưu thay đổi"
      >
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
          <p><strong>Tài khoản (Email):</strong> {reviewModal?.email}</p>
          <p><strong>Lý do:</strong> {reviewModal?.reason}</p>
          
          {reviewModal?.evidenceImages && reviewModal.evidenceImages.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold mb-1">Hình ảnh bằng chứng:</p>
              <Space wrap>
                {reviewModal.evidenceImages.map((img, i) => (
                  <Image key={i} src={img} width={80} height={80} style={{ objectFit: 'cover' }} />
                ))}
              </Space>
            </div>
          )}
        </div>

        <Form form={form} layout="vertical">
          <Form.Item name="status" label="Quyết định" rules={[{ required: true }]}>
            <Select>
              <Option value="PENDING">Đang chờ</Option>
              <Option value="APPROVED">Chấp nhận (Hủy cảnh cáo/Mở khóa)</Option>
              <Option value="REJECTED">Từ chối (Áp dụng hình phạt)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="adminNote" label="Ghi chú (Gửi cho người dùng)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
