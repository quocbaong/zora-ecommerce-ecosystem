import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, User as UserIcon, Menu, Search, LogOut, Package, MessageCircle, X, Store, Wallet } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useCart } from '@/features/cart/hooks/useCart';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { useChatStore } from '@/stores/chatStore';
import { useGroupStore } from '@/stores/groupStore';
import { useNotifications } from '@/features/notification/hooks/useNotifications';
import NotificationDropdown from '@/features/notification/components/NotificationDropdown';
import { useDebounce } from '@/hooks/useDebounce';
import { useProducts } from '@/features/product/hooks/useProducts';

export default function Header() {
  const { isAuthenticated, user } = useAuthStore();
  const items = useCartStore((state) => state.items);
  const { data: serverCart } = useCart();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const totalUnreadChat = useChatStore((s) => s.totalUnreadChat);
  const totalGroupUnread = useGroupStore((s) => s.totalGroupUnread);
  const totalUnread = totalUnreadChat + totalGroupUnread;

  useNotifications(isAuthenticated ? user?.id : undefined);

  const [searchValue, setSearchValue] = useState(searchParams.get('keyword') || '');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const menuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchValue, 300);

  const { data: suggestionsData, isFetching: isFetchingSuggestions } = useProducts(
    { keyword: debouncedSearch, size: 5, page: 0 },
    { enabled: debouncedSearch.trim().length > 0 }
  );

  // Sync search input when URL keyword changes
  useEffect(() => {
    setSearchValue(searchParams.get('keyword') || '');
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuEnter = () => {
    if (menuTimeout.current) clearTimeout(menuTimeout.current);
    setIsMenuOpen(true);
  };

  const handleMenuLeave = () => {
    menuTimeout.current = setTimeout(() => setIsMenuOpen(false), 150);
  };

  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 100], ['72px', '60px']);
  const headerBg = useTransform(scrollY, [0, 100], ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.95)']);
  const headerShadow = useTransform(scrollY, [0, 100], ['none', '0 4px 20px -2px rgba(0, 0, 0, 0.05)']);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e?: React.FormEvent, keywordOverride?: string) => {
    e?.preventDefault();
    const keyword = keywordOverride || searchValue.trim();
    if (keyword) {
      setShowSuggestions(false);
      navigate(`/products?keyword=${encodeURIComponent(keyword)}`);
    }
  };

  const cartItemCount =
    isAuthenticated && serverCart?.data?.items
      ? serverCart.data.items.reduce((sum, item) => sum + item.quantity, 0)
      : items.reduce((sum, item) => sum + item.quantity, 0);

  const isUserRole = !user || user.role === 'USER';

  return (
    <motion.header
      style={{ height: headerHeight, backgroundColor: headerBg, boxShadow: headerShadow }}
      className="sticky top-0 z-50 w-full border-b border-gray-100/50 backdrop-blur-md transition-shadow"
    >
      <div className="container mx-auto h-full px-6 flex items-center gap-4">

        {/* Left: Logo */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button className="md:hidden p-2 text-secondary hover:text-primary transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-secondary">ZORA</span>
          </Link>
        </div>

        {/* Center: Search bar (always visible on md+) */}
        <div ref={searchContainerRef} className="hidden md:flex flex-1 relative items-center max-w-2xl mx-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 items-center rounded border border-gray-300 bg-white overflow-hidden focus-within:border-primary transition-colors h-10"
          >
            <input
              type="text"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              className="flex-1 px-4 py-2 text-sm text-secondary placeholder:text-gray-400 focus:outline-none bg-transparent"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  setShowSuggestions(false);
                }}
                className="px-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="flex items-center justify-center px-5 h-full bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Auto-suggest Dropdown */}
          {showSuggestions && debouncedSearch.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden z-[60]">
              {isFetchingSuggestions ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">Đang tìm kiếm...</div>
              ) : suggestionsData?.content?.length ? (
                <div>
                  <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm gợi ý</span>
                  </div>
                  <ul>
                    {suggestionsData.content.map((product) => (
                      <li key={product.id}>
                        <button
                          onClick={() => handleSearchSubmit(undefined, product.name)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-50">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{product.name}</p>
                            <p className="text-xs text-orange-500 font-medium">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => handleSearchSubmit(undefined, debouncedSearch)}
                      className="w-full px-4 py-2.5 text-sm text-center text-primary hover:bg-orange-50 font-medium transition-colors"
                    >
                      Xem tất cả kết quả cho "{debouncedSearch}"
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-4 flex flex-col items-center justify-center text-center gap-2">
                  <Package className="w-8 h-8 text-gray-200" />
                  <p className="text-sm text-gray-500">Không tìm thấy sản phẩm nào khớp với "{debouncedSearch}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 flex-shrink-0">

          {/* Mobile search icon */}
          <button
            className="md:hidden p-2 text-secondary/60 hover:text-secondary transition-colors"
            onClick={() => navigate(`/products${searchValue ? `?keyword=${encodeURIComponent(searchValue)}` : ''}`)}
          >
            <Search className="h-5 w-5 stroke-[1.5]" />
          </button>

          {isUserRole && (
            <Link to="/cart" className="relative p-2 text-secondary/80 hover:text-primary transition-colors group">
              <ShoppingCart className="h-5 w-5 stroke-[1.5]" />
              {cartItemCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm transition-transform group-hover:scale-110">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>
          )}

          {isAuthenticated ? (
            <>
              {(isUserRole || user?.role === 'SELLER') && (
                <Link to="/chat" className="relative p-2 text-secondary/80 hover:text-primary transition-colors">
                  <MessageCircle className="h-5 w-5 stroke-[1.5]" />
                  {totalUnread > 0 && (
                    <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </Link>
              )}

              <NotificationDropdown />

              <div className="relative flex items-center" onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave}>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/5 text-secondary transition-colors hover:bg-secondary/10 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 stroke-[1.5]" />
                  )}
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full w-52 flex flex-col rounded-xl border border-gray-100 bg-white p-2 shadow-minimal animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-xs font-medium text-secondary/60 uppercase tracking-widest border-b border-gray-100 mb-2">
                      {user?.fullName || user?.email?.split('@')[0]}
                    </div>

                    {user?.role === 'USER' && (
                      <>
                        <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary/5 transition-colors" onClick={() => setIsMenuOpen(false)}>
                          <UserIcon className="h-4 w-4 stroke-[2]" /> Tài khoản
                        </Link>
                        <Link to="/orders" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary/5 transition-colors" onClick={() => setIsMenuOpen(false)}>
                          <Package className="h-4 w-4 stroke-[2]" /> Đơn hàng
                        </Link>
                        <Link to="/wallet" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary/5 transition-colors" onClick={() => setIsMenuOpen(false)}>
                          <Wallet className="h-4 w-4 stroke-[2]" /> Ví của tôi
                        </Link>
                      </>
                    )}

                    {user?.role === 'SELLER' && (
                      <Link to="/seller" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary/5 transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Package className="h-4 w-4 stroke-[2]" /> Kênh bán hàng
                      </Link>
                    )}

                    {user?.role === 'ADMIN' && (
                      <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary/5 transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Package className="h-4 w-4 stroke-[2]" /> Quản trị
                      </Link>
                    )}

                    <button onClick={handleLogout} className="flex mt-1 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut className="h-4 w-4 stroke-[2]" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-4 sm:flex">
              <Link to="/login" className="text-sm font-semibold tracking-wide text-secondary/80 hover:text-secondary transition-colors">
                Đăng nhập
              </Link>
              <Link to="/register" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold tracking-wide text-white shadow-sm hover:bg-primary/90 transition-all">
                Đăng ký
              </Link>
            </div>
          )}
        </div>

      </div>
    </motion.header>
  );
}
