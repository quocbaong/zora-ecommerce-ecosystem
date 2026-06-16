import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router v6 không tự reset scroll khi đổi route — component này lắng nghe
 * pathname và cuộn lên đầu trang mỗi khi chuyển trang.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
