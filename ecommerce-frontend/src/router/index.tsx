import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import ScrollToTop from '@/components/common/ScrollToTop';
import { useAuthStore } from '@/stores/authStore';

const SellerLayout = lazy(() => import('@/features/seller/layouts/SellerLayout'));

// Lazy loading all pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));

const ProductListPage = lazy(() => import('@/features/product/pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('@/features/product/pages/ProductDetailPage'));
const SellerProductsPage = lazy(() => import('@/features/product/pages/SellerProductsPage'));
const ShopPage = lazy(() => import('@/features/shop/pages/ShopPage'));
const SellerShopCategoriesPage = lazy(() => import('@/features/shop/pages/SellerShopCategoriesPage'));
const SellerVouchersPage = lazy(() => import('@/features/shop/pages/SellerVouchersPage'));
const SellerWalletPage = lazy(() => import('@/features/shop/pages/SellerWalletPage'));
const CampaignPage = lazy(() => import('@/pages/VoucherPage'));
const PaymentCampaignPage = lazy(() => import('@/pages/PaymentCampaignPage'));
const TrendingCampaignPage = lazy(() => import('@/pages/TrendingCampaignPage'));
const AuthenticCampaignPage = lazy(() => import('@/pages/AuthenticCampaignPage'));
const ExpressCampaignPage = lazy(() => import('@/pages/ExpressCampaignPage'));

const CartPage = lazy(() => import('@/features/cart/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/features/order/pages/CheckoutPage'));
const OrderListPage = lazy(() => import('@/features/order/pages/OrderListPage'));
const OrderDetailPage = lazy(() => import('@/features/order/pages/OrderDetailPage'));
const SellerOrdersPage = lazy(() => import('@/features/order/pages/SellerOrdersPage'));
const PaymentResultPage = lazy(() => import('@/features/order/pages/PaymentResultPage'));

const ProfilePage = lazy(() => import('@/features/user/pages/ProfilePage'));
const PaymentMethodsPage = lazy(() => import('@/features/user/pages/PaymentMethodsPage'));
const SellerProfilePage = lazy(() => import('@/features/user/pages/SellerProfilePage'));
const SellerAdsPage = lazy(() => import('@/features/ads/pages/SellerAdsPage'));
const SellerRevenuePage = lazy(() => import('@/features/order/pages/SellerRevenuePage'));
const SellerTrendsPage = lazy(() => import('@/features/order/pages/SellerTrendsPage'));
const AdminAdsPage = lazy(() => import('@/features/ads/pages/AdminAdsPage'));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));
const QRJoinPage = lazy(() => import('@/features/chat/pages/QRJoinPage'));
const SellerDashboardPage = lazy(() => import('@/pages/SellerDashboardPage'));
const NotFoundPage = lazy(() => import('@/components/common/NotFoundPage'));

const AddCreditCardPage = lazy(() => import('@/features/user/pages/AddCreditCardPage'));
const AddBankAccountPage = lazy(() => import('@/features/user/pages/AddBankAccountPage'));
const UserWalletPage = lazy(() => import('@/features/user/pages/UserWalletPage'));

const AdminLayout = lazy(() => import('@/features/admin/layouts/AdminLayout'));
const AdminOverviewPage = lazy(() => import('@/features/admin/pages/AdminOverviewPage'));
const AdminSellerApplicationsPage = lazy(() => import('@/features/admin/pages/AdminSellerApplicationsPage'));
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage'));
const AdminAuditLogPage = lazy(() => import('@/features/admin/pages/AdminAuditLogPage'));
const AdminLoginPage = lazy(() => import('@/features/admin/pages/AdminLoginPage'));
const AdminProductsPage = lazy(() => import('@/features/admin/pages/AdminProductsPage'));
const AdminRevenuePage = lazy(() => import('@/features/admin/pages/AdminRevenuePage'));
const AdminCategoriesPage = lazy(() => import('@/features/admin/pages/AdminCategoriesPage'));
const AdminWalletPage = lazy(() => import('@/features/admin/pages/AdminWalletPage'));
const AdminWalletHistoryPage = lazy(() => import('@/features/admin/pages/AdminWalletHistoryPage'));
const AdminReportsPage = lazy(() => import('@/features/admin/pages/AdminReportsPage'));
const AdminAppealsPage = lazy(() => import('@/features/admin/pages/AdminAppealsPage'));
const AdminDisputesPage = lazy(() => import('@/features/admin/pages/AdminDisputesPage'));
const SellerApplicationPage = lazy(() => import('@/features/user/pages/SellerApplicationPage'));

// Redirect SELLER/ADMIN away from home
function HomeRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'SELLER') return <Navigate to="/seller" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <HomePage />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ScrollToTop />
      <Routes>
        <Route element={<MainLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/shop/:sellerId" element={<ShopPage />} />
          <Route path="/campaigns/thanh-toan" element={<PaymentCampaignPage />} />
          <Route path="/campaigns/gia-soc" element={<TrendingCampaignPage />} />
          <Route path="/campaigns/chinh-hang" element={<AuthenticCampaignPage />} />
          <Route path="/campaigns/sieu-toc" element={<ExpressCampaignPage />} />
          <Route path="/campaigns/main" element={<CampaignPage />} />
          <Route path="/campaigns/:slug" element={<CampaignPage />} />

          {/* Protected Routes — USER ONLY (SELLER/ADMIN redirected away) */}
          <Route element={<ProtectedRoute userOnly />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrderListPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/payment-methods" element={<PaymentMethodsPage />} />
            <Route path="/payment/add-card" element={<AddCreditCardPage />} />
            <Route path="/payment/add-bank" element={<AddBankAccountPage />} />
            <Route path="/wallet" element={<UserWalletPage />} />
            <Route path="/become-seller" element={<SellerApplicationPage />} />
            <Route path="/payment-result" element={<PaymentResultPage />} />
          </Route>

          {/* Chat — accessible by all authenticated users (USER & SELLER) */}
          <Route element={<ProtectedRoute allowedRoles={['USER', 'SELLER', 'ADMIN']} />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/qr/:type/:id" element={<QRJoinPage />} />
          </Route>

          {/* Admin — own layout, no MainLayout header/footer */}
        </Route>

        {/* Seller — own layout, no MainLayout header/footer */}
        <Route element={<ProtectedRoute allowedRoles={['SELLER', 'ADMIN']} />}>
          <Route element={<SellerLayout />}>
            <Route path="/seller" element={<SellerDashboardPage />} />
            <Route path="/seller/products" element={<SellerProductsPage />} />
            <Route path="/seller/orders" element={<SellerOrdersPage />} />
            <Route path="/seller/shop-categories" element={<SellerShopCategoriesPage />} />
            <Route path="/seller/vouchers" element={<SellerVouchersPage />} />
            <Route path="/seller/wallet" element={<SellerWalletPage />} />
            <Route path="/seller/ads" element={<SellerAdsPage />} />
            <Route path="/seller/revenue" element={<SellerRevenuePage />} />
            <Route path="/seller/trends" element={<SellerTrendsPage />} />
            <Route path="/seller/profile" element={<SellerProfilePage />} />
          </Route>
        </Route>

        {/* Admin Login — public, no auth required */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/seller-applications" element={<AdminSellerApplicationsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/revenue" element={<AdminRevenuePage />} />
            <Route path="/admin/wallet" element={<AdminWalletPage />} />
            <Route path="/admin/wallet/transactions" element={<AdminWalletHistoryPage />} />
            <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
            <Route path="/admin/ads" element={<AdminAdsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/appeals" element={<AdminAppealsPage />} />
            <Route path="/admin/disputes" element={<AdminDisputesPage />} />
          </Route>
        </Route>

        <Route element={<MainLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
