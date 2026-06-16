import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import AiChatWidget from '@/features/ai/components/AiChatWidget';
import { useUnreadTitle } from '@/hooks/useUnreadTitle';

export default function MainLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  useUnreadTitle();

  return (
    <div className={`flex flex-col bg-[#FAFAFA] text-secondary ${isChatPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Header />
      <main className={isChatPage ? 'flex-1 overflow-hidden' : 'flex-1 w-full max-w-[1400px] mx-auto overflow-hidden'}>
        <Outlet />
      </main>
      {!isChatPage && <Footer />}
      {isAuthenticated && <AiChatWidget />}
      <Toaster position="top-right" richColors duration={2000} style={{ top: '80px' }} />
    </div>
  );
}
