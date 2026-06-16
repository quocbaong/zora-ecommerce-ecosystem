import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  // If true, SELLER and ADMIN are blocked (user-only routes like cart, checkout)
  userOnly?: boolean;
}

export const ProtectedRoute = ({ allowedRoles, userOnly }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  // Block SELLER and ADMIN from user-only routes (shopping features)
  if (userOnly && user && (user.role === 'SELLER' || user.role === 'ADMIN')) {
    const redirectPath = user.role === 'SELLER' ? '/seller' : '/admin';
    return <Navigate to={redirectPath} replace />;
  }

  // Role whitelist check
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
