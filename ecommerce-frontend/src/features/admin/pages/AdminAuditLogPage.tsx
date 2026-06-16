import { useState } from 'react';
import { Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  APPROVE_SELLER: 'green',
  REJECT_SELLER: 'red',
  CHANGE_ROLE: 'blue',
  BAN_USER: 'red',
  UNBAN_USER: 'green',
};

function fetchAuditLogs(page: number, size = 20) {
  return api
    .get<{ content: AuditLog[]; totalElements: number }>('/api/users/admin/audit-logs', {
      params: { page, size },
    })
    .then((r) => r.data);
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => fetchAuditLogs(page - 1),
  });

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('vi-VN'),
      width: 160,
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      render: (v: string) => <Tag color={ACTION_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    { title: 'Đối tượng', dataIndex: 'targetType', key: 'targetType', width: 140 },
    { title: 'Target ID', dataIndex: 'targetId', key: 'targetId', ellipsis: true },
    { title: 'Admin ID', dataIndex: 'adminId', key: 'adminId', ellipsis: true },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Trước',
      dataIndex: 'oldValue',
      key: 'oldValue',
      ellipsis: true,
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Sau',
      dataIndex: 'newValue',
      key: 'newValue',
      ellipsis: true,
      render: (v?: string) => v ?? '—',
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Audit Log</Typography.Title>
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
        scroll={{ x: 900 }}
      />
    </div>
  );
}
