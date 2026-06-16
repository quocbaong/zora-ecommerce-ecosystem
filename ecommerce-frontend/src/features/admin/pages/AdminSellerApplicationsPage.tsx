import { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Tabs,
  Image,
  Descriptions,
  Typography,
  message,
  Space,
} from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import type { SellerApplicationResponse } from '@/features/user/services/sellerApplicationService';

const { TextArea } = Input;
const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
  RESUBMIT_REQUIRED: 'orange',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  RESUBMIT_REQUIRED: 'Cần bổ sung',
};

export default function AdminSellerApplicationsPage() {
  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [viewApp, setViewApp] = useState<SellerApplicationResponse | null>(null);
  const [reviewModal, setReviewModal] = useState<{ app: SellerApplicationResponse; action: 'approve' | 'reject' } | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-seller-apps', tab, page],
    queryFn: () => adminService.getSellerApplications(tab, page - 1, 20),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.approveApplication(id, { reason }),
    onSuccess: () => {
      message.success('Đã duyệt đơn!');
      queryClient.invalidateQueries({ queryKey: ['admin-seller-apps'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setReviewModal(null);
      setViewApp(null);
      form.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.rejectApplication(id, { reason }),
    onSuccess: () => {
      message.success('Đã từ chối đơn');
      queryClient.invalidateQueries({ queryKey: ['admin-seller-apps'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setReviewModal(null);
      setViewApp(null);
      form.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi'),
  });

  const handleReviewSubmit = () => {
    form.validateFields().then(({ reason }) => {
      if (!reviewModal) return;
      if (reviewModal.action === 'approve') {
        approveMutation.mutate({ id: reviewModal.app.id, reason });
      } else {
        rejectMutation.mutate({ id: reviewModal.app.id, reason });
      }
    });
  };

  const columns = [
    { title: 'Shop', dataIndex: 'shopName', key: 'shopName' },
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Số CCCD', dataIndex: 'idNumber', key: 'idNumber' },
    {
      title: 'OCR',
      key: 'ocr',
      render: (_: unknown, r: SellerApplicationResponse) => {
        if (r.ocrMatch === null || r.ocrMatch === undefined)
          return <Tag color="default">Chưa quét</Tag>;
        return <Tag color={r.ocrMatch ? 'green' : 'red'}>{r.ocrMatch ? 'Khớp' : 'Không khớp'}</Tag>;
      },
    },
    {
      title: 'Ngân hàng',
      key: 'bank',
      render: (_: unknown, r: SellerApplicationResponse) => (
        <Tag color={r.bankNameMatch ? 'green' : 'orange'}>{r.bankName} {r.bankNameMatch ? '✓' : '?'}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: unknown, r: SellerApplicationResponse) => (
        <Tag color={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Tag>
      ),
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: unknown, r: SellerApplicationResponse) => (
        <Button
          type="text"
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
          onClick={() => setViewApp(r)}
        />
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Duyệt đăng ký Seller</Typography.Title>

      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k); setPage(1); }}
        items={Object.entries(STATUS_LABELS).map(([k, v]) => ({ key: k, label: v }))}
      />

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
          showSizeChanger: false,
        }}
        size="small"
      />

      {/* Detail modal */}
      <Modal
        open={!!viewApp}
        onCancel={() => setViewApp(null)}
        footer={
          viewApp?.status === 'PENDING' ? (
            <Space>
              <Button onClick={() => setViewApp(null)}>Đóng</Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => {
                  setReviewModal({ app: viewApp, action: 'approve' });
                  form.resetFields();
                }}
              >
                Duyệt
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setReviewModal({ app: viewApp, action: 'reject' });
                  form.resetFields();
                }}
              >
                Từ chối
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setViewApp(null)}>Đóng</Button>
          )
        }
        width={700}
        title="Chi tiết đơn đăng ký"
      >
        {viewApp && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Shop" span={2}>{viewApp.shopName}</Descriptions.Item>
            <Descriptions.Item label="Loại TK">{viewApp.accountType}</Descriptions.Item>
            <Descriptions.Item label="Gửi lần">{viewApp.resubmitCount + 1}</Descriptions.Item>
            <Descriptions.Item label="Họ tên">{viewApp.fullName}</Descriptions.Item>
            <Descriptions.Item label="Số CCCD">{viewApp.idNumber}</Descriptions.Item>
            <Descriptions.Item label="OCR khớp">
              {viewApp.ocrMatch === null || viewApp.ocrMatch === undefined
                ? <Tag color="default">Chưa quét</Tag>
                : <Tag color={viewApp.ocrMatch ? 'green' : 'red'}>{viewApp.ocrMatch ? 'Có' : 'Không'}</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Ngân hàng">{viewApp.bankName} — {viewApp.bankAccount}</Descriptions.Item>
            <Descriptions.Item label="Chủ TK">{viewApp.bankHolder}</Descriptions.Item>
            <Descriptions.Item label="Tên TK khớp">
              <Tag color={viewApp.bankNameMatch ? 'green' : 'orange'}>{viewApp.bankNameMatch ? 'Có' : 'Không'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ảnh CCCD mặt trước" span={2}>
              <Image src={viewApp.idFrontUrl} height={120} />
            </Descriptions.Item>
            <Descriptions.Item label="Ảnh CCCD mặt sau" span={2}>
              <Image src={viewApp.idBackUrl} height={120} />
            </Descriptions.Item>
            <Descriptions.Item label="Selfie" span={2}>
              <Image src={viewApp.selfieUrl} height={120} />
            </Descriptions.Item>
            {viewApp.rejectionReason && (
              <Descriptions.Item label="Lý do từ chối" span={2}>
                <Text type="danger">{viewApp.rejectionReason}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Approve/Reject modal */}
      <Modal
        open={!!reviewModal}
        onCancel={() => setReviewModal(null)}
        onOk={handleReviewSubmit}
        okText={reviewModal?.action === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
        okButtonProps={{
          danger: reviewModal?.action === 'reject',
          loading: approveMutation.isPending || rejectMutation.isPending,
        }}
        title={reviewModal?.action === 'approve' ? `Duyệt đơn: ${reviewModal.app.shopName}` : `Từ chối đơn: ${reviewModal?.app.shopName}`}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label={reviewModal?.action === 'approve' ? 'Ghi chú (tuỳ chọn)' : 'Lý do từ chối'}
            rules={reviewModal?.action === 'reject' ? [{ required: true, message: 'Nhập lý do từ chối' }] : []}
          >
            <TextArea rows={3} placeholder={reviewModal?.action === 'reject' ? 'Ảnh CCCD không rõ...' : 'Mọi thứ OK'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
