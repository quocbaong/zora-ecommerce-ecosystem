import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useLogin } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { mutate: login, isPending } = useLogin();
  const [error, setError] = useState('');

  const onFinish = (values: { email: string; password: string }) => {
    setError('');
    login(values, {
      onSuccess: (res) => {
        if (res?.user?.role !== 'ADMIN') {
          setError('Tài khoản này không có quyền Admin.');
          return;
        }
        navigate('/admin', { replace: true });
      },
      onError: () => {
        setError('Email hoặc mật khẩu không đúng.');
      },
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>ZORA Admin</Title>
          <Text type="secondary">Đăng nhập quản trị viên</Text>
        </div>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={isPending}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
