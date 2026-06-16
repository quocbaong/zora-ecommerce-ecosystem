import { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  Popconfirm,
  Tag,
  Upload,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  UploadOutlined,
  PictureOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type CategoryItem } from '../services/adminService';
import CategoryAttributesDrawer from '../components/CategoryAttributesDrawer';

const { Option } = Select;
const { Title } = Typography;

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  const [attrCategory, setAttrCategory] = useState<CategoryItem | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminService.getCategories,
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string; parentId?: string | null; imageUrl?: string }) =>
      adminService.createCategory(values),
    onSuccess: () => {
      message.success('Tạo danh mục thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-commission-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Tên danh mục đã tồn tại hoặc lỗi server'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { name: string; parentId?: string | null; imageUrl?: string } }) =>
      adminService.updateCategory(id, values),
    onSuccess: () => {
      message.success('Cập nhật danh mục thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-commission-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Lỗi khi cập nhật danh mục'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteCategory(id),
    onSuccess: () => {
      message.success('Đã xóa danh mục');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-commission-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => message.error('Không thể xóa — danh mục còn sản phẩm hoặc lỗi server'),
  });

  const openCreate = () => {
    setEditing(null);
    setImageUrl('');
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryItem) => {
    setEditing(cat);
    setImageUrl(cat.imageUrl || '');
    form.setFieldsValue({ name: cat.name, parentId: cat.parentId || undefined });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setImageUrl('');
    form.resetFields();
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const res = await adminService.uploadCategoryImage(file);
      setImageUrl(res.url);
      message.success('Upload ảnh thành công');
    } catch {
      message.error('Upload ảnh thất bại');
    } finally {
      setImageUploading(false);
    }
    return false; // ngăn AntD tự upload
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      const payload = {
        name: values.name,
        parentId: values.parentId || null,
        imageUrl: imageUrl || undefined,
      };
      if (editing) {
        updateMutation.mutate({ id: editing.id, values: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const parentMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c.name]));
  const rootCategories = (categories ?? []).filter((c) => !c.parentId);

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 64,
      render: (url: string) =>
        url ? (
          <Avatar src={url} size={40} shape="square" style={{ borderRadius: 6 }} />
        ) : (
          <Avatar size={40} shape="square" icon={<PictureOutlined />} style={{ borderRadius: 6, background: '#f0f0f0', color: '#bbb' }} />
        ),
    },
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, r: CategoryItem) => (
        <Space>
          <AppstoreOutlined style={{ color: r.parentId ? '#888' : '#1677ff' }} />
          <span style={{ fontWeight: r.parentId ? 400 : 600 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Danh mục cha',
      dataIndex: 'parentId',
      key: 'parentId',
      render: (parentId: string) =>
        parentId ? <Tag>{parentMap[parentId] ?? parentId}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Typography.Text code style={{ fontSize: 11 }}>{id.slice(0, 8)}...</Typography.Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: unknown, r: CategoryItem) => (
        <Space size="small">
          <Button size="small" icon={<SettingOutlined />} onClick={() => setAttrCategory(r)}>
            Trường thông tin
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa danh mục này? Sẽ lỗi nếu còn sản phẩm thuộc danh mục này."
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý danh mục</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm danh mục
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={categories}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="small"
        style={{ maxWidth: 1000 }}
      />

      <CategoryAttributesDrawer
        open={!!attrCategory}
        categoryId={attrCategory?.id ?? null}
        categoryName={attrCategory?.name ?? ''}
        onClose={() => setAttrCategory(null)}
      />

      <Modal
        open={modalOpen}
        title={editing ? `Sửa danh mục: ${editing.name}` : 'Thêm danh mục mới'}
        onCancel={closeModal}
        onOk={handleOk}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
        okText={editing ? 'Lưu' : 'Tạo'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[{ required: true, message: 'Nhập tên danh mục' }]}
          >
            <Input placeholder="Điện tử, Thời trang, Mỹ phẩm..." />
          </Form.Item>

          <Form.Item name="parentId" label="Danh mục cha (nếu là danh mục con)">
            <Select allowClear placeholder="Không có (danh mục gốc)">
              {rootCategories
                .filter((c) => !editing || c.id !== editing.id)
                .map((c) => (
                  <Option key={c.id} value={c.id}>{c.name}</Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item label="Ảnh đại diện">
            <Space align="start">
              {imageUrl && (
                <Avatar src={imageUrl} size={64} shape="square" style={{ borderRadius: 8, flexShrink: 0 }} />
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleImageUpload}
              >
                <Button icon={<UploadOutlined />} loading={imageUploading}>
                  {imageUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
                </Button>
              </Upload>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
