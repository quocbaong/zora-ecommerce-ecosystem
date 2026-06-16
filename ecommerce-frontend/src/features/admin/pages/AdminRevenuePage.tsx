import { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Button,
  Radio,
  Typography,
  Space,
  Tag,
  Spin,
} from 'antd';
import {
  DollarOutlined,
  DownloadOutlined,
  RiseOutlined,
  ShoppingOutlined,
  PercentageOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminService, type AdminSellerRevenue } from '../services/adminService';

const { Title, Text } = Typography;

function fmtMoney(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' tr';
  return n.toLocaleString('vi-VN') + ' đ';
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function AdminRevenuePage() {
  const [range, setRange] = useState<'day' | 'month'>('day');

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin-revenue', range],
    queryFn: () => adminService.getAdminRevenue(range),
    staleTime: 60_000,
  });

  const { data: sellerData, isLoading: sellerLoading } = useQuery({
    queryKey: ['admin-revenue-sellers'],
    queryFn: () => adminService.getAdminRevenueBySeller(20),
    staleTime: 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-commission-categories'],
    queryFn: () => adminService.getCategoriesWithRates(),
    staleTime: 60_000,
  });

  // Tính tổng từ dữ liệu chart
  const totalRevenue = revenueData?.reduce((sum, d) => sum + d.revenue, 0) ?? 0;
  const totalOrders = revenueData?.reduce((sum, d) => sum + d.orderCount, 0) ?? 0;

  // Tính estimated commission từ commission rates và doanh thu seller
  const totalCommission = (() => {
    if (!categories || !sellerData) return null;
    // Dùng avg commission rate vì không có category breakdown trong order
    const rates = categories.filter((c) => c.rate > 0).map((c) => c.rate);
    if (rates.length === 0) return null;
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    return (totalRevenue * avgRate) / 100;
  })();

  const handleExport = (days: number) => {
    adminService.exportRevenueCsv(days);
  };

  const sellerColumns = [
    {
      title: '#',
      key: 'rank',
      width: 48,
      render: (_: unknown, __: unknown, idx: number) => (
        <Tag color={idx < 3 ? ['gold', 'silver', '#cd7f32'][idx] : 'default'}>{idx + 1}</Tag>
      ),
    },
    {
      title: 'Seller ID',
      dataIndex: 'sellerId',
      key: 'sellerId',
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v.slice(0, 16)}...</Text>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (v: number) => <Text strong style={{ color: '#52c41a' }}>{fmtMoney(v)}</Text>,
      sorter: (a: AdminSellerRevenue, b: AdminSellerRevenue) => a.revenue - b.revenue,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Số đơn',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (v: number) => <Tag icon={<ShoppingOutlined />}>{v}</Tag>,
    },
    {
      title: 'Sản phẩm bán',
      dataIndex: 'itemsSold',
      key: 'itemsSold',
    },
  ];

  const commissionColumns = [
    { title: 'Danh mục', dataIndex: 'categoryName', key: 'categoryName' },
    {
      title: 'Tỉ lệ',
      dataIndex: 'rate',
      key: 'rate',
      render: (v: number) => <Tag color={v > 0 ? 'blue' : 'default'} icon={<PercentageOutlined />}>{v}%</Tag>,
    },
  ];

  return (
    <div>
      <Title level={4}>Doanh thu sàn</Title>

      {/* KPI cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={`Tổng doanh thu (${range === 'day' ? '30 ngày' : 'toàn bộ'})`}
              value={totalRevenue}
              formatter={(v) => fmtMoney(Number(v))}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đơn đã giao (DELIVERED)"
              value={totalOrders}
              prefix={<ShoppingOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hoa hồng ước tính"
              value={totalCommission ?? 0}
              formatter={(v) => totalCommission == null ? 'Chưa cấu hình' : fmtMoney(Number(v))}
              prefix={<PercentageOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Số seller có doanh thu"
              value={sellerData?.length ?? 0}
              prefix={<UserOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue chart */}
      <Card
        title={
          <Space>
            <RiseOutlined />
            Doanh thu theo thời gian (đơn DELIVERED)
          </Space>
        }
        extra={
          <Radio.Group
            value={range}
            onChange={(e) => setRange(e.target.value)}
            size="small"
            optionType="button"
            options={[
              { label: 'Theo ngày (30 ngày)', value: 'day' },
              { label: 'Theo tháng', value: 'month' },
            ]}
          />
        }
        style={{ marginBottom: 24 }}
      >
        {revenueLoading ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                formatter={(v: any) => [fmtCurrency(Number(v || 0)), 'Doanh thu']}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#52c41a"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        {/* Top sellers */}
        <Col xs={24} lg={16}>
          <Card
            title={<Space><UserOutlined />Top seller theo doanh thu (đơn DELIVERED)</Space>}
            extra={
              <Space>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(30)}>
                  Xuất CSV 30 ngày
                </Button>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(90)}>
                  90 ngày
                </Button>
              </Space>
            }
          >
            <Table
              rowKey="sellerId"
              dataSource={sellerData}
              columns={sellerColumns}
              loading={sellerLoading}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              size="small"
            />
          </Card>
        </Col>

        {/* Commission rates summary */}
        <Col xs={24} lg={8}>
          <Card
            title={<Space><PercentageOutlined />Hoa hồng theo danh mục</Space>}
            extra={
              <Button size="small" type="link" href="/admin/products" style={{ padding: 0 }}>
                Chỉnh sửa
              </Button>
            }
          >
            <Table
              rowKey="categoryId"
              dataSource={categories}
              columns={commissionColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
