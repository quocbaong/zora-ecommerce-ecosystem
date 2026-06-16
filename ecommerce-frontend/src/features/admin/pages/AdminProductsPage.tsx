import { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Select,
  Space,
  Avatar,
  Typography,
  message,
  Drawer,
  Descriptions,
  Popconfirm,
  Tabs,
  InputNumber,
  Image,
  Form,
} from 'antd';
import {
  SearchOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PercentageOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminProductResponse, type CommissionRateItem } from '../services/adminService';
import { useDebounce } from '@/hooks/useDebounce';

const { Option } = Select;
const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = { ACTIVE: 'green', DISABLED: 'red' };
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Đang bán', DISABLED: 'Đã chặn' };

function fmtPrice(v?: number) {
  if (v == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
}

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('vi-VN');
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  // Product tab state
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const debouncedSeller = useDebounce(filterSeller, 400);
  const [detailProduct, setDetailProduct] = useState<AdminProductResponse | null>(null);

  // Commission tab state
  const [editRate, setEditRate] = useState<CommissionRateItem | null>(null);
  const [rateForm] = Form.useForm();

  // Fetch products
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['admin-products', page, debouncedKeyword, filterCategory, filterStatus, debouncedSeller],
    queryFn: () =>
      adminService.getAdminProducts({
        page: page - 1,
        size: 20,
        keyword: debouncedKeyword || undefined,
        categoryId: filterCategory || undefined,
        status: filterStatus || undefined,
        sellerId: debouncedSeller || undefined,
      }),
  });

  // Fetch categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: ['admin-commission-categories'],
    queryFn: () => adminService.getCategoriesWithRates(),
  });

  // Block/unblock mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminService.updateProductStatus(id, status),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => message.error('Lỗi khi cập nhật trạng thái'),
  });

  // Hard delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.hardDeleteProduct(id),
    onSuccess: () => {
      message.success('Đã xóa vĩnh viễn sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDetailProduct(null);
    },
    onError: () => message.error('Lỗi khi xóa sản phẩm'),
  });

  // Commission rate mutation
  const rateMutation = useMutation({
    mutationFn: ({ categoryId, rate }: { categoryId: string; rate: number }) =>
      adminService.setCommissionRate(categoryId, rate),
    onSuccess: () => {
      message.success('Đã cập nhật tỉ lệ hoa hồng');
      queryClient.invalidateQueries({ queryKey: ['admin-commission-categories'] });
      setEditRate(null);
    },
    onError: () => message.error('Lỗi khi cập nhật hoa hồng'),
  });

  const productColumns = [
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 280,
      render: (_: unknown, r: AdminProductResponse) => (
        <Space>
          <Avatar
            shape="square"
            size={48}
            src={r.images?.[0]}
            style={{ borderRadius: 4, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>ID: {r.id.slice(0, 8)}...</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Seller',
      key: 'seller',
      render: (_: unknown, r: AdminProductResponse) => (
        <Text code style={{ fontSize: 11 }}>{r.sellerId?.slice(0, 12)}...</Text>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'categoryName',
      key: 'category',
      render: (v: string) => <Tag>{v || '—'}</Tag>,
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      render: (v: number) => fmtPrice(v),
    },
    {
      title: 'Kho',
      dataIndex: 'stock',
      key: 'stock',
      render: (v: number) => (
        <Tag color={v === 0 ? 'red' : v < 10 ? 'orange' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] ?? 'default'}
             icon={v === 'ACTIVE' ? <CheckCircleOutlined /> : <StopOutlined />}>
          {STATUS_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{fmtDate(v)}</Text>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: unknown, r: AdminProductResponse) => (
        <Space size="small">
          <Button size="small" icon={<InfoCircleOutlined />} onClick={() => setDetailProduct(r)}>
            Chi tiết
          </Button>
          {r.status === 'ACTIVE' ? (
            <Popconfirm
              title="Chặn sản phẩm này? Người dùng sẽ không tìm thấy nó nữa."
              onConfirm={() => statusMutation.mutate({ id: r.id, status: 'DISABLED' })}
              okText="Chặn"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
            >
              <Button size="small" danger icon={<StopOutlined />}>Chặn</Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Bỏ chặn sản phẩm này?"
              onConfirm={() => statusMutation.mutate({ id: r.id, status: 'ACTIVE' })}
              okText="Bỏ chặn"
              cancelText="Hủy"
            >
              <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />}>
                Bỏ chặn
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="Xóa vĩnh viễn? Hành động này không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const commissionColumns = [
    {
      title: 'Danh mục',
      dataIndex: 'categoryName',
      key: 'categoryName',
    },
    {
      title: 'Tỉ lệ hoa hồng',
      dataIndex: 'rate',
      key: 'rate',
      render: (v: number) => (
        <Tag color={v === 0 ? 'default' : 'blue'} icon={<PercentageOutlined />}>
          {v}%
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: unknown, r: CommissionRateItem) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEditRate(r);
            rateForm.setFieldsValue({ rate: r.rate });
          }}
        >
          Chỉnh sửa
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Quản lý sản phẩm</Typography.Title>

      <Tabs defaultActiveKey="products" items={[
        {
          key: 'products',
          label: 'Danh sách sản phẩm',
          children: (
            <>
              <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <Input
                  placeholder="Tìm theo tên sản phẩm..."
                  prefix={<SearchOutlined />}
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                  style={{ width: 240 }}
                  allowClear
                />
                <Input
                  placeholder="Seller ID..."
                  value={filterSeller}
                  onChange={(e) => { setFilterSeller(e.target.value); setPage(1); }}
                  style={{ width: 180 }}
                  allowClear
                />
                <Select
                  placeholder="Danh mục"
                  allowClear
                  style={{ width: 160 }}
                  value={filterCategory || undefined}
                  onChange={(v) => { setFilterCategory(v ?? ''); setPage(1); }}
                >
                  {categories?.map((c) => (
                    <Option key={c.categoryId} value={c.categoryId}>{c.categoryName}</Option>
                  ))}
                </Select>
                <Select
                  placeholder="Trạng thái"
                  allowClear
                  style={{ width: 140 }}
                  value={filterStatus || undefined}
                  onChange={(v) => { setFilterStatus(v ?? ''); setPage(1); }}
                >
                  <Option value="ACTIVE">Đang bán</Option>
                  <Option value="DISABLED">Đã chặn</Option>
                </Select>
              </Space>

              <Table
                rowKey="id"
                dataSource={productData?.content}
                columns={productColumns}
                loading={productLoading}
                pagination={{
                  current: page,
                  pageSize: 20,
                  total: productData?.totalElements,
                  onChange: setPage,
                  showSizeChanger: false,
                  showTotal: (total) => `Tổng ${total} sản phẩm`,
                }}
                size="small"
                scroll={{ x: 900 }}
              />
            </>
          ),
        },
        {
          key: 'commission',
          label: 'Hoa hồng theo danh mục',
          children: (
            <>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Tỉ lệ hoa hồng áp dụng cho đơn hàng trạng thái DELIVERED. Đặt 0% để không thu hoa hồng danh mục đó.
              </Typography.Paragraph>
              <Table
                rowKey="categoryId"
                dataSource={categories}
                columns={commissionColumns}
                pagination={false}
                size="small"
                style={{ maxWidth: 500 }}
              />
            </>
          ),
        },
      ]} />

      {/* Product detail drawer */}
      <Drawer
        open={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        title={detailProduct?.name ?? 'Chi tiết sản phẩm'}
        width={480}
      >
        {detailProduct && (
          <>
            {detailProduct.images?.length > 0 && (
              <Image.PreviewGroup>
                <Space wrap style={{ marginBottom: 16 }}>
                  {detailProduct.images.map((url, i) => (
                    <Image key={i} src={url} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
                  ))}
                </Space>
              </Image.PreviewGroup>
            )}
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">
                <Text code copyable style={{ fontSize: 11 }}>{detailProduct.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tên">{detailProduct.name}</Descriptions.Item>
              <Descriptions.Item label="Seller">
                <Text code style={{ fontSize: 11 }}>{detailProduct.sellerId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Danh mục">{detailProduct.categoryName}</Descriptions.Item>
              <Descriptions.Item label="Giá">{fmtPrice(detailProduct.price)}</Descriptions.Item>
              <Descriptions.Item label="Tồn kho">{detailProduct.stock}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={STATUS_COLORS[detailProduct.status]}>{STATUS_LABELS[detailProduct.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{fmtDate(detailProduct.createdAt)}</Descriptions.Item>
              {detailProduct.description && (
                <Descriptions.Item label="Mô tả">
                  <Text style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{detailProduct.description}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Space style={{ marginTop: 16, width: '100%', justifyContent: 'flex-end' }}>
              {detailProduct.status === 'ACTIVE' ? (
                <Popconfirm
                  title="Chặn sản phẩm này?"
                  onConfirm={() => {
                    statusMutation.mutate({ id: detailProduct.id, status: 'DISABLED' });
                    setDetailProduct({ ...detailProduct, status: 'DISABLED' });
                  }}
                  okText="Chặn"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<StopOutlined />}>Chặn sản phẩm</Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="Bỏ chặn sản phẩm này?"
                  onConfirm={() => {
                    statusMutation.mutate({ id: detailProduct.id, status: 'ACTIVE' });
                    setDetailProduct({ ...detailProduct, status: 'ACTIVE' });
                  }}
                  okText="Bỏ chặn"
                >
                  <Button type="primary" ghost>Bỏ chặn</Button>
                </Popconfirm>
              )}
              <Popconfirm
                title="Xóa vĩnh viễn sản phẩm? Không thể hoàn tác."
                onConfirm={() => deleteMutation.mutate(detailProduct.id)}
                okText="Xóa"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>Xóa vĩnh viễn</Button>
              </Popconfirm>
            </Space>
          </>
        )}
      </Drawer>

      {/* Edit commission rate modal */}
      <Modal
        open={!!editRate}
        title={`Hoa hồng: ${editRate?.categoryName}`}
        onCancel={() => setEditRate(null)}
        onOk={() =>
          rateForm.validateFields().then(({ rate }) => {
            if (editRate) rateMutation.mutate({ categoryId: editRate.categoryId, rate });
          })
        }
        okButtonProps={{ loading: rateMutation.isPending }}
        okText="Lưu"
      >
        <Form form={rateForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="rate"
            label="Tỉ lệ hoa hồng (%)"
            rules={[
              { required: true, message: 'Nhập tỉ lệ hoa hồng' },
              { type: 'number', min: 0, max: 100, message: 'Tỉ lệ từ 0 đến 100' },
            ]}
          >
            <InputNumber min={0} max={100} step={0.5} precision={1} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
