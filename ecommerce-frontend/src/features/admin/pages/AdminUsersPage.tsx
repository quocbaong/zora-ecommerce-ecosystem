import { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Avatar,
  Typography,
  message,
  Drawer,
  Descriptions,
  Popconfirm,
  Tooltip,
  Badge,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  StopOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminUserResponse } from '../services/adminService';
import { useDebounce } from '@/hooks/useDebounce';

const { Option } = Select;
const { Text } = Typography;

const ROLE_COLORS: Record<string, string> = { USER: 'blue', SELLER: 'purple', ADMIN: 'red' };
const ROLE_LABELS: Record<string, string> = { USER: 'User', SELLER: 'Seller', ADMIN: 'Admin' };

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('vi-VN');
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [detailUser, setDetailUser] = useState<AdminUserResponse | null>(null);
  const [statusModal, setStatusModal] = useState<AdminUserResponse | null>(null);
  const [roleModal, setRoleModal] = useState<AdminUserResponse | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch, filterRole, filterStatus],
    queryFn: () =>
      adminService.getUsers({
        page: page - 1,
        size: 20,
        search: debouncedSearch || undefined,
        filterRole: filterRole || undefined,
        filterStatus: filterStatus || undefined,
      }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: () => {
      message.success('Đã cập nhật role');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setRoleModal(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi'),
  });

  const warningMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.issueWarning(userId, reason),
    onSuccess: () => {
      message.success('Đã gửi cảnh cáo');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setStatusModal(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi'),
  });

  const handleQuickUnban = (user: AdminUserResponse) => {
    // Optionally we can keep direct unban, or it's now handled by appeals
    adminService.updateUserStatus(user.userId, 'ACTIVE').then(() => {
      message.success('Đã mở khóa');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    });
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: unknown, r: AdminUserResponse) => (
        <Space>
          <Badge dot={r.status === 'BANNED'} color="red" offset={[-2, 2]}>
            <Avatar src={r.avatarUrl} icon={<UserOutlined />} />
          </Badge>
          <div>
            <div style={{ fontWeight: 500 }}>{r.name || '—'}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (v: string) => v || '—',
    },
    {
      title: 'Role',
      key: 'role',
      render: (_: unknown, r: AdminUserResponse) => (
        <Tag color={ROLE_COLORS[r.role] ?? 'default'}>{ROLE_LABELS[r.role] ?? r.role}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: unknown, r: AdminUserResponse) => {
        if (r.status === 'BANNED') {
          return (
            <Tooltip title={r.statusReason ? `Lý do: ${r.statusReason}` : 'Bị cấm'}>
              <Tag color="red" icon={<StopOutlined />} style={{ cursor: 'help' }}>
                BANNED
              </Tag>
            </Tooltip>
          );
        }
        if (r.emailVerified === false) {
          return (
            <Tooltip title="Người dùng chưa xác thực email">
              <Tag color="orange">CHƯA XÁC THỰC</Tag>
            </Tooltip>
          );
        }
        return <Tag color="green" icon={<CheckCircleOutlined />}>ACTIVE</Tag>;
      },
    },
    {
      title: 'Ngày tham gia',
      key: 'createdAt',
      render: (_: unknown, r: AdminUserResponse) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{fmtDate(r.createdAt)}</Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: unknown, r: AdminUserResponse) => (
        <Space size="small">
          <Button
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => setDetailUser(r)}
          >
            Chi tiết
          </Button>
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => { setRoleModal(r); form.setFieldsValue({ role: r.role }); }}
          >
            Role
          </Button>
          {r.status === 'BANNED' ? (
            <Popconfirm
              title="Mở khóa tài khoản này?"
              onConfirm={() => handleQuickUnban(r)}
              okText="Mở khóa"
              cancelText="Hủy"
            >
              <Button size="small" type="primary" ghost>
                Mở khóa
              </Button>
            </Popconfirm>
          ) : (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => { setStatusModal(r); form.resetFields(); }}
            >
              Cảnh cáo
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Quản lý người dùng</Typography.Title>

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="Tìm theo tên, email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          placeholder="Lọc Role"
          allowClear
          style={{ width: 130 }}
          value={filterRole || undefined}
          onChange={(v) => { setFilterRole(v ?? ''); setPage(1); }}
        >
          <Option value="USER">User</Option>
          <Option value="SELLER">Seller</Option>
          <Option value="ADMIN">Admin</Option>
        </Select>
        <Select
          placeholder="Lọc Trạng thái"
          allowClear
          style={{ width: 150 }}
          value={filterStatus || undefined}
          onChange={(v) => { setFilterStatus(v ?? ''); setPage(1); }}
        >
          <Option value="ACTIVE">Active</Option>
          <Option value="BANNED">Banned</Option>
        </Select>
      </Space>

      <Table
        rowKey="userId"
        dataSource={data?.content}
        columns={columns}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.totalElements,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} người dùng`,
        }}
        size="small"
        rowClassName={(r: AdminUserResponse) => (r.status === 'BANNED' ? 'ant-table-row-banned' : '')}
        onRow={(r) => ({ style: r.status === 'BANNED' ? { opacity: 0.7 } : {} })}
      />

      {/* User detail drawer */}
      <Drawer
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        title={
          <Space>
            <Avatar src={detailUser?.avatarUrl} icon={<UserOutlined />} />
            {detailUser?.name || 'Chi tiết người dùng'}
          </Space>
        }
        width={420}
      >
        {detailUser && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="User ID">
                <Text code copyable style={{ fontSize: 11 }}>{detailUser.userId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên">{detailUser.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailUser.email}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{detailUser.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color={ROLE_COLORS[detailUser.role]}>{ROLE_LABELS[detailUser.role] ?? detailUser.role}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={detailUser.status === 'ACTIVE' ? 'green' : 'red'}>{detailUser.status}</Tag>
              </Descriptions.Item>
              {detailUser.statusReason && (
                <Descriptions.Item label="Lý do khóa">
                  <Text type="danger">{detailUser.statusReason}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Ngày tham gia">{fmtDate(detailUser.createdAt)}</Descriptions.Item>
            </Descriptions>

            <Space style={{ marginTop: 16, width: '100%', justifyContent: 'flex-end' }}>
              <Button
                icon={<SwapOutlined />}
                onClick={() => { setRoleModal(detailUser); form.setFieldsValue({ role: detailUser.role }); }}
              >
                Đổi Role
              </Button>
              {detailUser.status === 'BANNED' ? (
                <Popconfirm
                  title="Mở khóa tài khoản này?"
                  onConfirm={() => { handleQuickUnban(detailUser); setDetailUser(null); }}
                  okText="Mở khóa"
                >
                  <Button type="primary" ghost>Mở khóa</Button>
                </Popconfirm>
              ) : (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => { setStatusModal(detailUser); form.resetFields(); setDetailUser(null); }}
                >
                  Cảnh cáo
                </Button>
              )}
            </Space>
          </>
        )}
      </Drawer>

      {/* Change Role Modal */}
      <Modal
        open={!!roleModal}
        title={`Đổi role: ${roleModal?.name}`}
        onCancel={() => setRoleModal(null)}
        onOk={() =>
          form.validateFields().then(({ role }) => {
            if (roleModal) roleMutation.mutate({ userId: roleModal.userId, role });
          })
        }
        okButtonProps={{ loading: roleMutation.isPending }}
        okText="Xác nhận"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="role" label="Role mới" rules={[{ required: true }]}>
            <Select>
              <Option value="USER">USER — người dùng thường</Option>
              <Option value="SELLER">SELLER — người bán hàng</Option>
              <Option value="ADMIN">ADMIN — quản trị viên</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Warning Modal */}
      <Modal
        open={!!statusModal}
        title={
          <Space>
            <StopOutlined style={{ color: '#ff4d4f' }} />
            {`Cảnh cáo người dùng: ${statusModal?.name}`}
          </Space>
        }
        onCancel={() => setStatusModal(null)}
        onOk={() =>
          form.validateFields().then(({ reason }) => {
            if (statusModal) warningMutation.mutate({ userId: statusModal.userId, reason });
          })
        }
        okButtonProps={{ loading: warningMutation.isPending, danger: true }}
        okText="Gửi cảnh cáo"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="reason"
            label="Lý do cảnh cáo"
            rules={[{ required: true, message: 'Nhập lý do cảnh cáo' }]}
          >
            <Input.TextArea rows={3} placeholder="Vi phạm điều khoản sử dụng..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
