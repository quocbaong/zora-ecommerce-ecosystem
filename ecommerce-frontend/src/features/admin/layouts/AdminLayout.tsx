import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DollarOutlined,
  AppstoreOutlined,
  NotificationOutlined,
  WalletOutlined,
  HistoryOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/admin/seller-applications', icon: <FileTextOutlined />, label: 'Duyệt Seller' },
  { key: '/admin/users', icon: <UserOutlined />, label: 'Quản lý User' },
  { key: '/admin/disputes', icon: <AlertOutlined />, label: 'Khiếu nại Đơn Hàng' },
  { key: '/admin/appeals', icon: <AlertOutlined />, label: 'Đơn Kháng Nghị' },
  { key: '/admin/products', icon: <ShoppingOutlined />, label: 'Sản phẩm' },
  { key: '/admin/categories', icon: <AppstoreOutlined />, label: 'Danh mục' },
  { key: '/admin/revenue', icon: <DollarOutlined />, label: 'Doanh thu sàn' },
  { key: '/admin/wallet', icon: <WalletOutlined />, label: 'Quản lý Ví' },
  { key: '/admin/wallet/transactions', icon: <HistoryOutlined />, label: 'Sao kê Ví' },
  { key: '/admin/ads', icon: <NotificationOutlined />, label: 'Duyệt quảng cáo' },
  { key: '/admin/reports', icon: <AlertOutlined />, label: 'Báo cáo Chat' },
  { key: '/admin/audit-log', icon: <AuditOutlined />, label: 'Audit Log' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const dropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={220}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 18 : 20,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {collapsed ? 'Z' : 'ZORA Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.fullName || user?.email}</Text>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, background: '#f5f5f5', minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
