import { Row, Col, Card, Statistic, Spin, Typography, Divider, Table, Tag, Button, Space, Badge } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  CarOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { adminService } from '../services/adminService';
import type { SellerApplicationResponse } from '@/features/user/services/sellerApplicationService';

const { Title, Text } = Typography;

function fmtMoney(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' tr';
  return n.toLocaleString('vi-VN');
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: '#faad14',
  CONFIRMED: '#1677ff',
  SHIPPING: '#722ed1',
  DELIVERED: '#52c41a',
  CANCELLED: '#ff4d4f',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export default function AdminOverviewPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getStats,
    staleTime: 60_000,
  });

  const { data: pendingApps, isLoading: appsLoading } = useQuery({
    queryKey: ['admin-seller-apps', 'PENDING', 1],
    queryFn: () => adminService.getSellerApplications('PENDING', 0, 5),
    staleTime: 60_000,
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />;
  if (!data) return null;

  const orderPieData = [
    { name: ORDER_STATUS_LABELS.PENDING, value: data.pendingOrders, status: 'PENDING' },
    { name: ORDER_STATUS_LABELS.CONFIRMED, value: data.confirmedOrders, status: 'CONFIRMED' },
    { name: ORDER_STATUS_LABELS.SHIPPING, value: data.shippingOrders, status: 'SHIPPING' },
    { name: ORDER_STATUS_LABELS.DELIVERED, value: data.deliveredOrders, status: 'DELIVERED' },
    { name: ORDER_STATUS_LABELS.CANCELLED, value: data.cancelledOrders, status: 'CANCELLED' },
  ].filter((d) => d.value > 0);

  const appColumns = [
    {
      title: 'Shop',
      dataIndex: 'shopName',
      key: 'shopName',
      ellipsis: true,
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      ellipsis: true,
    },
    {
      title: 'OCR',
      key: 'ocr',
      width: 90,
      render: (_: unknown, r: SellerApplicationResponse) => {
        if (r.ocrMatch === null || r.ocrMatch === undefined)
          return <Tag color="default">Chưa quét</Tag>;
        return <Tag color={r.ocrMatch ? 'green' : 'red'}>{r.ocrMatch ? 'Khớp' : 'Không khớp'}</Tag>;
      },
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: () => (
        <Button
          size="small"
          type="link"
          onClick={() => navigate('/admin/seller-applications')}
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 8 }}>
      <Title level={4} style={{ marginBottom: 16 }}>Tổng quan hệ thống</Title>

      {/* ── Users ── */}
      <Divider orientation="left">Người dùng</Divider>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={6}>
          <Card bordered={false} style={{ background: '#e6f4ff' }}>
            <Statistic title="Tổng Users" value={data.totalUsers} prefix={<UserOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="Sellers" value={data.totalSellers} prefix={<TeamOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card bordered={false} style={{ background: '#f9f0ff' }}>
            <Statistic title="Mới hôm nay" value={data.newUsersToday} prefix={<RiseOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card
            bordered={false}
            style={{ background: data.pendingApplications > 0 ? '#fffbe6' : '#fafafa', cursor: 'pointer' }}
            onClick={() => navigate('/admin/seller-applications')}
          >
            <Statistic
              title="Đơn duyệt Seller"
              value={data.pendingApplications}
              prefix={<FileTextOutlined style={{ color: data.pendingApplications > 0 ? '#faad14' : undefined }} />}
              valueStyle={data.pendingApplications > 0 ? { color: '#faad14' } : undefined}
              suffix={data.pendingApplications > 0 ? <Badge status="processing" /> : undefined}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Revenue ── */}
      <Divider orientation="left" style={{ marginTop: 24 }}>Doanh thu</Divider>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={6}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic
              title="Tổng doanh thu"
              value={fmtMoney(data.totalRevenue)}
              suffix="₫"
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card bordered={false}>
            <Statistic title="Hôm nay" value={fmtMoney(data.revenueToday)} suffix="₫" prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card bordered={false}>
            <Statistic title="Tháng này" value={fmtMoney(data.revenueMonth)} suffix="₫" prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card bordered={false} style={{ background: '#fff1f0' }}>
            <Statistic
              title="Tổng đơn hàng"
              value={data.totalOrders}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Orders + Products ── */}
      <Divider orientation="left" style={{ marginTop: 24 }}>Đơn hàng & Sản phẩm</Divider>
      <Row gutter={[16, 16]}>
        {/* Order status breakdown */}
        <Col xs={24} lg={12}>
          <Card title="Phân bổ trạng thái đơn hàng" bordered={false}>
            <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Space>
                  <ShoppingCartOutlined style={{ color: '#faad14' }} />
                  <Text>Chờ xác nhận: <strong>{data.pendingOrders}</strong></Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#1677ff' }} />
                  <Text>Đã xác nhận: <strong>{data.confirmedOrders}</strong></Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <CarOutlined style={{ color: '#722ed1' }} />
                  <Text>Đang giao: <strong>{data.shippingOrders}</strong></Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>Đã giao: <strong>{data.deliveredOrders}</strong></Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text>Đã hủy: <strong>{data.cancelledOrders}</strong></Text>
                </Space>
              </Col>
            </Row>
            {orderPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={orderPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {orderPieData.map((entry) => (
                      <Cell key={entry.status} fill={ORDER_STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [String(v) + ' đơn', '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có đơn hàng</Text>
            )}
          </Card>
        </Col>

        {/* Products */}
        <Col xs={24} lg={12}>
          <Card title="Sản phẩm" bordered={false} style={{ height: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card bordered style={{ textAlign: 'center' }}>
                  <Statistic title="Tổng sản phẩm" value={data.totalProducts} prefix={<ShoppingOutlined />} />
                </Card>
              </Col>
              <Col span={12}>
                <Card bordered style={{ textAlign: 'center', background: '#f6ffed' }}>
                  <Statistic
                    title="Đang bán"
                    value={data.activeProducts}
                    prefix={<ShoppingOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card bordered style={{ textAlign: 'center', background: '#fff1f0' }}>
                  <Statistic
                    title="Đã ẩn"
                    value={data.disabledProducts}
                    prefix={<ShoppingOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card bordered style={{ textAlign: 'center', background: '#f9f0ff' }}>
                  <Statistic
                    title="Mới hôm nay"
                    value={data.newProductsToday}
                    prefix={<RiseOutlined style={{ color: '#722ed1' }} />}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ── Pending seller applications ── */}
      {(data.pendingApplications > 0 || appsLoading) && (
        <>
          <Divider orientation="left" style={{ marginTop: 24 }}>
            Đơn đăng ký Seller chờ duyệt{' '}
            {data.pendingApplications > 0 && (
              <Badge count={data.pendingApplications} style={{ marginLeft: 8 }} />
            )}
          </Divider>
          <Card
            bordered={false}
            extra={
              <Button type="link" onClick={() => navigate('/admin/seller-applications')}>
                Xem tất cả →
              </Button>
            }
          >
            <Table
              rowKey="id"
              dataSource={pendingApps?.content}
              columns={appColumns}
              loading={appsLoading}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Không có đơn chờ duyệt' }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
