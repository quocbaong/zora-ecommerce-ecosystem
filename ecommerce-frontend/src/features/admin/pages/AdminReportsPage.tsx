import { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Tabs,
  Descriptions,
  Typography,
  message,
  Card,
  List,
  Select,
  Image,
} from 'antd';
import {
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type ChatReportItem, type EvidenceMessageSnapshot } from '../services/adminService';
import { userService } from '@/features/user/services/userService';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'gold',
  RESOLVED: 'green',
  REJECTED: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối',
};

const MODERATION_ACTION_COLORS: Record<string, string> = {
  NONE: 'default',
  WARNING: 'orange',
  BAN_7D: 'purple',
  BANNED: 'red',
};

const MODERATION_ACTION_LABELS: Record<string, string> = {
  NONE: 'Không áp dụng',
  WARNING: 'Cảnh cáo',
  BAN_7D: 'Khóa tài khoản 7 ngày',
  BANNED: 'Khóa tài khoản vĩnh viễn',
};

const REASON_COLORS: Record<string, string> = {
  SPAM: 'orange',
  SCAM: 'red',
  FAKE_PRODUCT: 'volcano',
  HARASSMENT: 'magenta',
  OTHER: 'blue',
};

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam / Tin nhắn rác',
  SCAM: 'Lừa đảo',
  FAKE_PRODUCT: 'Sản phẩm giả/cấm',
  HARASSMENT: 'Quấy rối / Đe dọa',
  OTHER: 'Lý do khác',
};

function renderMessageContent(msg: EvidenceMessageSnapshot) {
  if (!msg) return '';
  const type = msg.type || 'TEXT';
  const content = msg.content || msg.text || '';
  if (type === 'TEXT') return content;

  try {
    const parsed = JSON.parse(content);
    switch (type) {
      case 'FRIEND_REQUEST':
        return '[Lời mời kết bạn]';
      case 'FRIEND_ACCEPT':
        return '[Đã chấp nhận kết bạn]';
      case 'PRODUCT':
        return `[Sản phẩm: ${parsed.name || parsed.productId || 'Sản phẩm'}]`;
      case 'INVOICE':
        return `[Hóa đơn đơn hàng #${(parsed.orderId || '').slice(-8).toUpperCase()}]`;
      case 'VOUCHER':
        return `[Voucher: ${parsed.code || parsed.voucherId || 'Voucher'}]`;
      case 'CALL':
        return parsed.status === 'missed' ? '[Cuộc gọi nhỡ]' : '[Cuộc gọi thoại/video]';
      case 'IMAGE':
        return '[Hình ảnh]';
      case 'VIDEO':
        return '[Video]';
      case 'AUDIO':
        return '[Tin nhắn thoại]';
      case 'PDF':
        return '[Tài liệu PDF]';
      case 'GIF':
        return '[Ảnh GIF]';
      default:
        return content;
    }
  } catch (e) {
    return content;
  }
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState('PENDING');
  const [viewReport, setViewReport] = useState<ChatReportItem | null>(null);
  const [actionModal, setActionModal] = useState<{ report: ChatReportItem; action: 'RESOLVED' | 'REJECTED' } | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: reporterProfile } = useQuery({
    queryKey: ['user-profile', viewReport?.reporterId],
    queryFn: () => userService.getProfileById(viewReport!.reporterId),
    enabled: !!viewReport?.reporterId,
  });

  const { data: reportedUserProfile } = useQuery({
    queryKey: ['user-profile', viewReport?.reportedUserId],
    queryFn: () => userService.getProfileById(viewReport!.reportedUserId),
    enabled: !!viewReport?.reportedUserId,
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-chat-reports', tab],
    queryFn: () => adminService.getReports(tab),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, adminNote, action }: { id: string; status: 'RESOLVED' | 'REJECTED'; adminNote?: string; action?: string }) =>
      adminService.updateReportStatus(id, status, adminNote, action),
    onSuccess: (_, variables) => {
      message.success(variables.status === 'RESOLVED' ? 'Đã giải quyết báo cáo!' : 'Đã từ chối báo cáo!');
      queryClient.invalidateQueries({ queryKey: ['admin-chat-reports'] });
      setActionModal(null);
      setViewReport(null);
      form.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Lỗi khi cập nhật trạng thái báo cáo.');
    },
  });

  const handleActionSubmit = () => {
    form.validateFields().then(({ adminNote, moderationAction }) => {
      if (!actionModal) return;
      updateStatusMutation.mutate({
        id: actionModal.report.id,
        status: actionModal.action,
        adminNote,
        action: actionModal.action === 'RESOLVED' ? moderationAction : undefined,
      });
    });
  };

  const columns = [
    {
      title: 'Mã báo cáo',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string | null | undefined) => {
        const safeId = id || '';
        return (
          <Text code copyable={safeId ? { text: safeId } : false}>
            {safeId ? safeId.slice(-8).toUpperCase() : '—'}
          </Text>
        );
      },
    },
    {
      title: 'Người báo cáo',
      dataIndex: 'reporterId',
      key: 'reporterId',
      width: 120,
      render: (id: string | null | undefined) => {
        const safeId = id || '';
        return (
          <Text code copyable={safeId ? { text: safeId } : false} style={{ fontSize: 11 }}>
            {safeId ? safeId.slice(-8).toUpperCase() : '—'}
          </Text>
        );
      },
    },
    {
      title: 'Người bị báo cáo',
      dataIndex: 'reportedUserId',
      key: 'reportedUserId',
      width: 130,
      render: (id: string | null | undefined) => {
        const safeId = id || '';
        return (
          <Text code copyable={safeId ? { text: safeId } : false} style={{ fontSize: 11 }}>
            {safeId ? safeId.slice(-8).toUpperCase() : '—'}
          </Text>
        );
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 180,
      render: (reason: string | null | undefined) => {
        const safeReason = reason || 'OTHER';
        return (
          <Tag color={REASON_COLORS[safeReason] || 'blue'} style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {REASON_LABELS[safeReason] || safeReason}
          </Tag>
        );
      },
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 220,
      ellipsis: true,
      render: (desc: string | null | undefined) => {
        const safeDesc = desc || '';
        return <span title={safeDesc}>{safeDesc}</span>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string | null | undefined) => {
        const safeStatus = status || 'PENDING';
        let icon = <ClockCircleOutlined />;
        if (safeStatus === 'RESOLVED') icon = <CheckCircleOutlined />;
        if (safeStatus === 'REJECTED') icon = <CloseCircleOutlined />;

        return (
          <Tag color={STATUS_COLORS[safeStatus] || 'default'} icon={icon}>
            {STATUS_LABELS[safeStatus] || safeStatus}
          </Tag>
        );
      },
    },
    {
      title: 'Biện pháp',
      dataIndex: 'moderationAction',
      key: 'moderationAction',
      width: 180,
      render: (action: string | null | undefined) => {
        const safeAction = action || 'NONE';
        if (safeAction === 'NONE') return '—';
        return (
          <Tag color={MODERATION_ACTION_COLORS[safeAction] || 'default'} style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {MODERATION_ACTION_LABELS[safeAction] || safeAction}
          </Tag>
        );
      },
    },
    {
      title: 'Lần vi phạm',
      dataIndex: 'violationCount',
      key: 'violationCount',
      width: 110,
      render: (count: number | null | undefined) => {
        const safeCount = count ?? 0;
        return <Tag color={safeCount > 0 ? 'red' : 'green'}>{safeCount} lần</Tag>;
      },
    },
    {
      title: 'User bị khóa?',
      dataIndex: 'banned',
      key: 'banned',
      width: 130,
      render: (banned: boolean | null | undefined) => {
        return banned ? <Tag color="red">ĐÃ KHÓA</Tag> : <Tag color="green">Hoạt động</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string | null | undefined) => (v ? new Date(v).toLocaleString('vi-VN') : '—'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: unknown, r: ChatReportItem) => (
        <Button
          type="text"
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
          onClick={async () => {
            try {
              const fullReport = await adminService.getReportDetail(r.id);
              setViewReport(fullReport);
            } catch (e) {
              message.error('Không thể tải chi tiết báo cáo');
              setViewReport(r); // fallback to list data
            }
          }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', minHeight: '100%' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            Quản lý Báo cáo Chat
          </Typography.Title>
        </div>

        <Tabs
          activeKey={tab}
          onChange={(k) => {
            setTab(k);
          }}
          items={Object.entries(STATUS_LABELS).map(([k, v]) => ({ key: k, label: v }))}
        />

        <Table
          rowKey="id"
          dataSource={reports}
          columns={columns}
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng số ${total} báo cáo`,
          }}
          size="small"
          locale={{ emptyText: 'Không có báo cáo nào' }}
          scroll={{ x: 1740 }}
        />
      </Space>

      {/* Report Detail Modal */}
      <Modal
        open={!!viewReport}
        onCancel={() => setViewReport(null)}
        footer={
          viewReport?.status === 'PENDING' ? (
            <Space>
              <Button onClick={() => setViewReport(null)}>Đóng</Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => {
                  setActionModal({ report: viewReport, action: 'RESOLVED' });
                  form.resetFields();
                }}
              >
                Giải quyết
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setActionModal({ report: viewReport, action: 'REJECTED' });
                  form.resetFields();
                }}
              >
                Từ chối
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setViewReport(null)}>Đóng</Button>
          )
        }
        width={750}
        title="Chi tiết báo cáo hội thoại"
      >
        {viewReport && (
          <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '16px' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã báo cáo" span={2}>
                <Text code copyable={viewReport.id ? { text: viewReport.id } : false}>{viewReport.id || '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Người báo cáo">
                <Space direction="vertical" size={0}>
                  <Text strong>{reporterProfile?.fullName || '—'}</Text>
                  <Text code copyable={viewReport.reporterId ? { text: viewReport.reporterId } : false} style={{ fontSize: 11 }}>
                    {viewReport.reporterId || '—'}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Người bị báo cáo">
                <Space direction="vertical" size={0}>
                  <Text strong>{reportedUserProfile?.fullName || '—'}</Text>
                  <Text code copyable={viewReport.reportedUserId ? { text: viewReport.reportedUserId } : false} style={{ fontSize: 11 }}>
                    {viewReport.reportedUserId || '—'}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Mã cuộc trò chuyện" span={2}>
                <Text code copyable={viewReport.conversationId ? { text: viewReport.conversationId } : false}>{viewReport.conversationId || '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Lý do">
                <Tag color={REASON_COLORS[viewReport.reason || 'OTHER'] || 'blue'}>
                  {REASON_LABELS[viewReport.reason || 'OTHER'] || viewReport.reason || 'Khác'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {viewReport.createdAt ? new Date(viewReport.createdAt).toLocaleString('vi-VN') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={STATUS_COLORS[viewReport.status || 'PENDING'] || 'default'}>
                  {STATUS_LABELS[viewReport.status || 'PENDING'] || viewReport.status || '—'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Số lần vi phạm">
                <Tag color={(viewReport.violationCount ?? 0) > 0 ? 'red' : 'green'}>
                  {viewReport.violationCount ?? 0} lần
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tài khoản bị báo cáo">
                {viewReport.banned ? (
                  <Tag color="red">Đã khóa vĩnh viễn</Tag>
                ) : (
                  <Tag color="green">Đang hoạt động</Tag>
                )}
              </Descriptions.Item>
              {viewReport.status !== 'PENDING' && (
                <Descriptions.Item label="Biện pháp xử lý">
                  {viewReport.moderationAction && viewReport.moderationAction !== 'NONE' ? (
                    <Tag color={MODERATION_ACTION_COLORS[viewReport.moderationAction] || 'default'}>
                      {MODERATION_ACTION_LABELS[viewReport.moderationAction] || viewReport.moderationAction}
                    </Tag>
                  ) : (
                    'Không áp dụng'
                  )}
                </Descriptions.Item>
              )}
              {viewReport.status === 'RESOLVED' && viewReport.resolvedAt && (
                <Descriptions.Item label="Thời gian giải quyết" span={2}>
                  {new Date(viewReport.resolvedAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
              )}
              {viewReport.status === 'REJECTED' && viewReport.rejectedAt && (
                <Descriptions.Item label="Thời gian từ chối" span={2}>
                  {new Date(viewReport.rejectedAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
              )}
              {viewReport.adminNote && (
                <Descriptions.Item label="Ghi chú của Admin" span={2}>
                  <Text type="secondary">{viewReport.adminNote}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Mô tả chi tiết" span={2}>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {viewReport.description || '—'}
                </Paragraph>
              </Descriptions.Item>
            </Descriptions>

            {/* Evidence messages list */}
            <div>
              {viewReport.evidenceImages && viewReport.evidenceImages.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Typography.Title level={5} style={{ marginBottom: '12px' }}>
                    Hình ảnh bằng chứng đính kèm
                  </Typography.Title>
                  <Space size="middle" wrap>
                    {viewReport.evidenceImages.map((imgUrl, index) => (
                      <Image
                        key={index}
                        width={120}
                        height={120}
                        src={imgUrl}
                        alt={`Bằng chứng ${index + 1}`}
                        style={{ objectFit: 'cover', borderRadius: '8px' }}
                      />
                    ))}
                  </Space>
                </div>
              )}

              <Typography.Title level={5} style={{ marginBottom: '12px' }}>
                Tin nhắn chứng cứ đính kèm
              </Typography.Title>
              {viewReport.evidenceMessages && viewReport.evidenceMessages.length > 0 ? (
                <List
                  dataSource={viewReport.evidenceMessages}
                  renderItem={(msg: EvidenceMessageSnapshot) => {
                    const isReporterSender = msg && msg.senderId === viewReport.reporterId;
                    const isReportedSender = msg && msg.senderId === viewReport.reportedUserId;
                    const safeSenderId = msg?.senderId || '';

                    // Lấy tên hiển thị: Tên người dùng thực tế từ API, fallback về nhãn cứng và ID rút gọn
                    let senderName = '';
                    if (isReporterSender) {
                      senderName = reporterProfile?.fullName || 'Người báo cáo';
                    } else if (isReportedSender) {
                      senderName = reportedUserProfile?.fullName || 'Người bị báo cáo';
                    } else {
                      senderName = 'Hệ thống';
                    }
                    const formattedSenderLabel = `${senderName} (${safeSenderId ? safeSenderId.slice(-6).toUpperCase() : ''})`;

                    return (
                      <List.Item style={{ padding: '8px 0' }}>
                        <Card
                          size="small"
                          style={{
                            width: '100%',
                            backgroundColor: isReporterSender ? '#f5f5f5' : '#e6f7ff',
                            borderLeft: `4px solid ${isReporterSender ? '#d9d9d9' : '#1890ff'}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <Text strong>
                              {formattedSenderLabel}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {msg?.createdAt || msg?.timestamp ? new Date(msg.createdAt || msg.timestamp).toLocaleString('vi-VN') : '—'}
                            </Text>
                          </div>
                          <Paragraph style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                            {renderMessageContent(msg)}
                          </Paragraph>
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Text type="secondary" italic>Không có tin nhắn chứng cứ đính kèm.</Text>
              )}
            </div>
          </Space>
        )}
      </Modal>

      {/* Resolve/Reject Note Modal */}
      <Modal
        open={!!actionModal}
        onCancel={() => setActionModal(null)}
        onOk={handleActionSubmit}
        okText={actionModal?.action === 'RESOLVED' ? 'Giải quyết' : 'Từ chối'}
        okButtonProps={{
          danger: actionModal?.action === 'REJECTED',
          loading: updateStatusMutation.isPending,
        }}
        title={actionModal?.action === 'RESOLVED' ? 'Giải quyết báo cáo' : 'Từ chối báo cáo'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '16px' }} initialValues={{ moderationAction: 'NONE' }}>
          {actionModal?.action === 'RESOLVED' && (
            <Form.Item
              name="moderationAction"
              label="Biện pháp xử lý"
              rules={[{ required: true, message: 'Vui lòng chọn biện pháp xử lý' }]}
            >
              <Select placeholder="Chọn biện pháp xử lý">
                <Select.Option value="NONE">Không áp dụng</Select.Option>
                <Select.Option value="WARNING">Cảnh cáo</Select.Option>
                <Select.Option value="BAN_7D">Khóa tài khoản 7 ngày</Select.Option>
                <Select.Option value="BANNED">Khóa tài khoản vĩnh viễn</Select.Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item
            name="adminNote"
            label="Ghi chú phản hồi / lý do xử lý"
            rules={[
              {
                required: actionModal?.action === 'REJECTED',
                message: 'Vui lòng điền lý do từ chối báo cáo',
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder={
                actionModal?.action === 'RESOLVED'
                  ? 'Ví dụ: Đã nhắc nhở cảnh cáo người dùng vi phạm...'
                  : 'Ví dụ: Báo cáo không đúng sự thật hoặc không đủ chứng cứ...'
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
