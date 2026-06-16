import { useEffect, useState } from 'react';
import {
  Drawer,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Space,
  Tag,
  Popconfirm,
  Typography,
  message,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminService,
  type CategoryAttributeItem,
  type CategoryAttributePayload,
  type AttributeType,
} from '../services/adminService';

const { Option } = Select;

const TYPE_LABEL: Record<AttributeType, string> = {
  TEXT: 'Text 1 dòng',
  TEXTAREA: 'Text nhiều dòng',
  NUMBER: 'Số',
};

interface Props {
  open: boolean;
  categoryId: string | null;
  categoryName: string;
  onClose: () => void;
}

export default function CategoryAttributesDrawer({ open, categoryId, categoryName, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CategoryAttributePayload>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAttributeItem | null>(null);

  const queryKey = ['admin-category-attributes', categoryId];
  const { data: attributes, isLoading } = useQuery({
    queryKey,
    queryFn: () => adminService.getCategoryAttributes(categoryId!),
    enabled: !!categoryId && open,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CategoryAttributePayload) =>
      adminService.createCategoryAttribute(categoryId!, payload),
    onSuccess: () => {
      message.success('Đã thêm trường thông tin');
      queryClient.invalidateQueries({ queryKey });
      closeModal();
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Không thể thêm trường'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryAttributePayload }) =>
      adminService.updateCategoryAttribute(categoryId!, id, payload),
    onSuccess: () => {
      message.success('Đã cập nhật trường');
      queryClient.invalidateQueries({ queryKey });
      closeModal();
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Không thể cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteCategoryAttribute(categoryId!, id),
    onSuccess: () => {
      message.success('Đã xóa trường');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => message.error('Không thể xóa trường'),
  });

  useEffect(() => {
    if (!open) {
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    }
  }, [open, form]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    // Compute next order as max existing + 1 so the auto-value never collides
    // even if the DB already has duplicate or out-of-sequence values.
    const existing = (attributes ?? []).map((a) => a.displayOrder ?? 0);
    const nextOrder = existing.length === 0 ? 1 : Math.max(...existing) + 1;
    form.setFieldsValue({
      type: 'TEXT',
      required: false,
      displayOrder: nextOrder,
    });
    setModalOpen(true);
  };

  const openEdit = (row: CategoryAttributeItem) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      label: row.label,
      type: row.type,
      required: row.required,
      displayOrder: row.displayOrder,
      placeholder: row.placeholder,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      const payload: CategoryAttributePayload = {
        name: values.name.trim(),
        label: values.label.trim(),
        type: values.type,
        required: !!values.required,
        displayOrder: values.displayOrder ?? 0,
        placeholder: values.placeholder?.trim() || undefined,
      };
      if (editing) {
        updateMutation.mutate({ id: editing.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const columns = [
    {
      title: 'Thứ tự',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 70,
    },
    {
      title: 'Nhãn',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, r: CategoryAttributeItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{label}</div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }} code>
            {r.name}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Kiểu',
      dataIndex: 'type',
      key: 'type',
      render: (t: AttributeType) => <Tag color="blue">{TYPE_LABEL[t]}</Tag>,
    },
    {
      title: 'Bắt buộc',
      dataIndex: 'required',
      key: 'required',
      render: (req: boolean) =>
        req ? <Tag color="red">Bắt buộc</Tag> : <Tag>Không</Tag>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      render: (_: unknown, r: CategoryAttributeItem) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa trường này?"
            description="Sản phẩm đã lưu giá trị cũ vẫn giữ nguyên trong DB."
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
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={
        <Space>
          <span>Trường thông tin của danh mục:</span>
          <Tag color="blue">{categoryName}</Tag>
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!categoryId}>
          Thêm trường
        </Button>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Định nghĩa các thông tin chi tiết mà seller phải nhập khi đăng sản phẩm thuộc danh mục này.
        Ví dụ: <i>chất liệu, kiểu dáng, chiều dài, phong cách</i>...
      </Typography.Paragraph>

      <Table
        rowKey="id"
        dataSource={attributes}
        columns={columns}
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{
          emptyText: (
            <Empty description="Chưa có trường nào. Bấm 'Thêm trường' để cấu hình." />
          ),
        }}
      />

      <Modal
        open={modalOpen}
        title={editing ? `Sửa trường: ${editing.label}` : 'Thêm trường thông tin'}
        onCancel={closeModal}
        onOk={handleOk}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
        okText={editing ? 'Lưu' : 'Tạo'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="label"
            label="Nhãn hiển thị cho seller"
            rules={[{ required: true, message: 'Nhập nhãn hiển thị' }]}
          >
            <Input placeholder="VD: Chất liệu, Kiểu dáng, Chiều dài (cm)..." />
          </Form.Item>

          <Form.Item
            name="name"
            label="Khóa (key trong dữ liệu)"
            tooltip="Chỉ gồm chữ thường, số và dấu _, bắt đầu bằng chữ. Không nên đổi sau khi đã có sản phẩm dùng."
            rules={[
              { required: true, message: 'Nhập khóa' },
              {
                pattern: /^[a-z][a-z0-9_]*$/,
                message: 'Chỉ chữ thường, số, dấu _ và bắt đầu bằng chữ',
              },
              { max: 60, message: 'Tối đa 60 ký tự' },
            ]}
          >
            <Input placeholder="material, style, length_cm..." />
          </Form.Item>

          <Form.Item
            name="type"
            label="Kiểu dữ liệu"
            rules={[{ required: true, message: 'Chọn kiểu' }]}
          >
            <Select>
              <Option value="TEXT">Text 1 dòng</Option>
              <Option value="TEXTAREA">Text nhiều dòng</Option>
              <Option value="NUMBER">Số</Option>
            </Select>
          </Form.Item>

          <Form.Item name="required" label="Bắt buộc seller phải nhập?" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="displayOrder"
            label="Thứ tự hiển thị"
            tooltip="Tự động gán dựa trên số trường đã có. Không cho phép chỉnh tay để tránh trùng."
          >
            <InputNumber min={0} style={{ width: '100%' }} disabled />
          </Form.Item>

          <Form.Item name="placeholder" label="Placeholder gợi ý (tùy chọn)">
            <Input placeholder="VD: Cotton, Denim, Linen..." />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
