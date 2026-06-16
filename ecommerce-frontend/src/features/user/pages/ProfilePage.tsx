import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, MapPin, Lock, Camera, Plus, Trash2, Edit2, Check, X, Eye, EyeOff, CreditCard, Store, QrCode } from 'lucide-react';
import { QRCode, Modal as AntdModal } from 'antd';
import PaymentMethodsPage from './PaymentMethodsPage';
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useAddresses,
  useAddAddress,
  useDeleteAddress,
  useUpdateAddress,
  useChangePassword,
} from '../hooks/useUser';
import { Address, AddressPayload } from '../services/userService';
import { useAuthStore } from '@/stores/authStore';
import LocationSelector from '../components/LocationSelector';
import { useFollowedShops, useUnfollowShopGeneral } from '@/features/shop/hooks/useShop';
import { toast } from 'sonner';

type Tab = 'profile' | 'payment' | 'addresses' | 'password';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'profile', label: 'Thông tin cá nhân', icon: User },
  { id: 'payment', label: 'Ngân hàng/Thẻ', icon: CreditCard },
  { id: 'addresses', label: 'Địa chỉ của tôi', icon: MapPin },
  { id: 'password', label: 'Đổi mật khẩu', icon: Lock },
];

function joinedYears(joinedAt: string): string {
  if (!joinedAt) return 'Mới tham gia';
  const joined = new Date(joinedAt);
  const now = new Date();
  const months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth());
  if (months < 1) return 'Mới tham gia';
  if (months < 12) return `${months} tháng trước`;
  const years = Math.floor(months / 12);
  return `${years} năm trước`;
}

const EMPTY_ADDRESS: AddressPayload = {
  receiverName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  street: '',
  default: false,
};

export default function ProfilePage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>((location.state as any)?.tab || 'profile');
  const [isFollowedShopsOpen, setIsFollowedShopsOpen] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if ((location.state as any)?.tab) {
      setActiveTab((location.state as any).tab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // ─── Profile ────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [profileDirty, setProfileDirty] = useState(false);

  // Seed form từ profile khi data về lần đầu (hoặc khi save xong dirty=false).
  // KHÔNG ghi đè nếu user đang edit (profileDirty=true) — tránh mất chữ đang gõ
  // nếu profile bị refetch ngẫu nhiên.
  useEffect(() => {
    if (!profile || profileDirty) return;
    setProfileForm({
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
    });
  }, [profile, profileDirty]);

  const handleProfileFormChange = (field: string, value: string) => {
    setProfileForm((f) => ({ ...f, [field]: value }));
    setProfileDirty(true);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(profileForm, { onSuccess: () => setProfileDirty(false) });
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    uploadAvatar.mutate(file, {
      onSuccess: () => setAvatarPreview(null),
      onError: () => setAvatarPreview(null),
    });
    e.target.value = '';
  };

  // ─── Addresses ──────────────────────────────────────────────────
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const addAddress = useAddAddress();
  const deleteAddress = useDeleteAddress();
  const updateAddress = useUpdateAddress();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressPayload>(EMPTY_ADDRESS);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    addAddress.mutate(newAddress, {
      onSuccess: () => {
        setNewAddress(EMPTY_ADDRESS);
        setShowAddForm(false);
      },
    });
  };

  const handleUpdateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddr) return;
    updateAddress.mutate(
      { id: editingAddr.id, payload: editingAddr },
      { onSuccess: () => setEditingAddr(null) }
    );
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/40';

  // ─── Password ───────────────────────────────────────────────────
  const changePassword = useChangePassword();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false });
  const [pwError, setPwError] = useState('');

  // ─── Followed Shops ──────────────────────────────────────────────
  const { data: followedShops, isLoading: followedShopsLoading } = useFollowedShops();
  const unfollowMutation = useUnfollowShopGeneral();

  const handleUnfollowShop = (sellerId: string, shopName: string) => {
    unfollowMutation.mutate(sellerId, {
      onSuccess: () => {
        toast.success(`Đã bỏ theo dõi shop ${shopName}`);
      },
      onError: () => {
        toast.error('Có lỗi xảy ra khi bỏ theo dõi shop');
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setPwError('');
    changePassword.mutate(
      { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
      { onSuccess: () => setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }) }
    );
  };

  const displayName = profile?.fullName || user?.fullName || user?.email?.split('@')[0] || 'User';
  const avatarUrl = avatarPreview || profile?.avatarUrl || user?.avatarUrl;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Hero Card ── */}
        <div className="relative mb-8 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white shadow-xl shadow-orange-200/50 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl border-4 border-white/40 shadow-lg overflow-hidden bg-white/20 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-white">{avatarInitial}</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                  className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Thay ảnh đại diện"
                >
                  {uploadAvatar.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div>
                <p className="text-xs font-medium text-white/60 uppercase tracking-widest mb-0.5">Tài khoản</p>
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <p className="text-white/80 text-sm mt-0.5">{profile?.email || user?.email}</p>
                <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wider backdrop-blur-sm">
                  {profile?.role || user?.role || 'USER'}
                </span>
              </div>
            </div>

            {/* Right side: Following shop count & QR */}
            <div className="shrink-0 flex items-center justify-start sm:justify-end gap-4">
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
              >
                <QrCode className="w-5 h-5 text-white" />
                <span className="text-white/80 text-sm font-medium hidden sm:inline">Mã QR</span>
              </button>
              <div className="w-px h-6 bg-white/20 hidden sm:block"></div>
              <button
                onClick={() => setIsFollowedShopsOpen(true)}
                className="flex items-center gap-2 text-white/90 hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
              >
                <span className="text-white/80 text-sm font-medium">Đang theo dõi:</span>
                <span className="font-bold text-white bg-white/10 hover:bg-white/25 px-2.5 py-0.5 rounded-md transition-colors text-sm">
                  {followedShopsLoading ? '...' : (followedShops?.length || 0)}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs + Content ── */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 w-full text-left ${
                    activeTab === id
                      ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${activeTab === id ? 'text-orange-500' : ''}`} />
                  <span className="hidden md:block">{label}</span>
                </button>
              ))}
            </nav>
            {user?.role === 'USER' && (
              <button
                onClick={() => navigate('/become-seller')}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                Đăng ký Seller
              </button>
            )}
          </div>

          {/* Panel */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">

            {/* ── Tab 1: Profile ── */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-6">Thông tin cá nhân</h2>
                {profileLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={profile?.email || user?.email || ''}
                        disabled
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Họ tên
                        </label>
                        <input
                          id="fullName"
                          type="text"
                          placeholder={profile?.fullName || 'Nhập họ tên...'}
                          value={profileForm.fullName}
                          onChange={(e) => handleProfileFormChange('fullName', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Số điện thoại
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          placeholder={profile?.phone || 'Nhập số điện thoại...'}
                          value={profileForm.phone}
                          onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={updateProfile.isPending || !profileDirty}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {updateProfile.isPending ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</>
                      ) : (
                        <><Check className="w-4 h-4" /> Lưu thay đổi</>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── Tab 2: Addresses ── */}
            {activeTab === 'addresses' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Địa chỉ của tôi</h2>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Thêm địa chỉ
                    </button>
                  )}
                </div>

                {/* Add Form */}
                {showAddForm && (
                  <form onSubmit={handleAddAddress} className="mb-6 rounded-xl border border-orange-100 bg-orange-50/50 p-5 space-y-3">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Địa chỉ mới</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Người nhận *</label>
                        <input
                          required
                          placeholder="Nguyễn Văn A"
                          value={newAddress.receiverName}
                          onChange={(e) => setNewAddress((p) => ({ ...p, receiverName: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Số điện thoại *</label>
                        <input
                          required
                          type="tel"
                          placeholder="0901234567"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress((p) => ({ ...p, phone: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                      <LocationSelector
                        required
                        province={newAddress.province}
                        district={newAddress.district}
                        ward={newAddress.ward}
                        ghnProvinceId={newAddress.ghnProvinceId}
                        ghnDistrictId={newAddress.ghnDistrictId}
                        ghnWardCode={newAddress.ghnWardCode}
                        onChange={(loc) => setNewAddress((p) => ({ ...p, ...loc }))}
                      />
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Số nhà, tên đường *</label>
                        <input
                          required
                          placeholder="VD: 123 Nguyễn Huệ"
                          value={newAddress.street}
                          onChange={(e) => setNewAddress((p) => ({ ...p, street: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="newAddrDefault"
                          checked={!!newAddress.default}
                          onChange={(e) => setNewAddress((p) => ({ ...p, default: e.target.checked }))}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                        />
                        <label htmlFor="newAddrDefault" className="text-xs font-medium text-gray-600">Đặt làm địa chỉ mặc định</label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={
                          addAddress.isPending
                          || !newAddress.receiverName?.trim()
                          || !newAddress.phone?.trim()
                          || !newAddress.province?.trim()
                          || !newAddress.district?.trim()
                          || !newAddress.ward?.trim()
                          || !newAddress.street?.trim()
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> {addAddress.isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}
                      </button>
                      <button type="button" onClick={() => { setShowAddForm(false); setNewAddress(EMPTY_ADDRESS); }} className="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <X className="w-3.5 h-3.5" /> Huỷ
                      </button>
                    </div>
                  </form>
                )}

                {addressesLoading ? (
                  <div className="space-y-3 animate-pulse">{[1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}</div>
                ) : !addresses || addresses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MapPin className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">Chưa có địa chỉ nào</p>
                    <p className="text-sm text-gray-400 mt-1">Thêm địa chỉ để giao hàng nhanh hơn</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div key={addr.id} className={`rounded-xl border p-4 group transition-all ${addr.default ? 'border-orange-200 bg-orange-50/40' : 'border-gray-100 bg-gray-50/50 hover:border-orange-100 hover:bg-orange-50/30'}`}>
                        {editingAddr?.id === addr.id ? (
                          <form onSubmit={handleUpdateAddress} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Người nhận</label>
                                <input
                                  value={editingAddr.receiverName}
                                  onChange={(e) => setEditingAddr((p) => p ? { ...p, receiverName: e.target.value } : p)}
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Số điện thoại</label>
                                <input
                                  type="tel"
                                  value={editingAddr.phone}
                                  onChange={(e) => setEditingAddr((p) => p ? { ...p, phone: e.target.value } : p)}
                                  className={inputCls}
                                />
                              </div>
                              <LocationSelector
                                province={editingAddr.province}
                                district={editingAddr.district}
                                ward={editingAddr.ward}
                                ghnProvinceId={editingAddr.ghnProvinceId}
                                ghnDistrictId={editingAddr.ghnDistrictId}
                                ghnWardCode={editingAddr.ghnWardCode}
                                onChange={(loc) => setEditingAddr((p) => p ? { ...p, ...loc } : p)}
                              />
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Số nhà, tên đường</label>
                                <input
                                  value={editingAddr.street}
                                  onChange={(e) => setEditingAddr((p) => p ? { ...p, street: e.target.value } : p)}
                                  className={inputCls}
                                />
                              </div>
                              <div className="sm:col-span-2 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="editAddrDefault"
                                  checked={!!editingAddr.default}
                                  onChange={(e) => setEditingAddr((p) => p ? { ...p, default: e.target.checked } : p)}
                                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                                />
                                <label htmlFor="editAddrDefault" className="text-xs font-medium text-gray-600">Địa chỉ mặc định</label>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" disabled={updateAddress.isPending} className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors">
                                <Check className="w-3 h-3" /> Lưu
                              </button>
                              <button type="button" onClick={() => setEditingAddr(null)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                                <X className="w-3 h-3" /> Huỷ
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold text-sm text-gray-800">{addr.receiverName}</p>
                                <span className="text-gray-400 text-xs">|</span>
                                <p className="text-sm text-gray-500">{addr.phone}</p>
                                {addr.default && (
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">Mặc định</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{addr.street}, {addr.ward}, {addr.district}, {addr.province}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingAddr(addr)} aria-label="Sửa địa chỉ" className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteAddress.mutate(addr.id)} disabled={deleteAddress.isPending} aria-label="Xoá địa chỉ" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab 3: Password ── */}
            {activeTab === 'password' && (
              <div className="max-w-md">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Đổi mật khẩu</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {[
                    { id: 'currentPassword', label: 'Mật khẩu hiện tại', key: 'old' as const },
                    { id: 'newPassword', label: 'Mật khẩu mới', key: 'new' as const },
                    { id: 'confirmNewPassword', label: 'Xác nhận mật khẩu mới', key: 'confirm' as const },
                  ].map(({ id, label, key }) => (
                    <div key={id}>
                      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <div className="relative">
                        <input
                          id={id}
                          type={showPw[key] ? 'text' : 'password'}
                          required
                          value={pwForm[id as keyof typeof pwForm]}
                          onChange={(e) => setPwForm((p) => ({ ...p, [id]: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={showPw[key] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}

                  {pwError && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                      {pwError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={changePassword.isPending}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 hover:bg-orange-600 disabled:opacity-60 transition-all mt-2"
                  >
                    {changePassword.isPending ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
                    ) : (
                      <><Lock className="w-4 h-4" /> Đổi mật khẩu</>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── Tab 4: Payment ── */}
            {activeTab === 'payment' && (
              <div className="w-full">
                <PaymentMethodsPage />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Followed Shops Modal ── */}
      {isFollowedShopsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">Shop đã theo dõi</h2>
              </div>
              <button
                onClick={() => setIsFollowedShopsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {followedShopsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : !followedShops || followedShops.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                    <Store className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-gray-600 font-semibold">Chưa theo dõi shop nào</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Khám phá sản phẩm và theo dõi các shop yêu thích để nhận thông tin ưu đãi nhanh nhất!
                  </p>
                  <button
                    onClick={() => {
                      setIsFollowedShopsOpen(false);
                      navigate('/products');
                    }}
                    className="mt-5 rounded-lg bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-600 transition-all focus:outline-none"
                  >
                    Khám phá ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {followedShops.map((shop) => (
                    <div
                      key={shop.sellerId}
                      className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-orange-50/10 hover:border-orange-100 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 bg-white flex items-center justify-center shrink-0">
                          {shop.avatarUrl ? (
                            <img src={shop.avatarUrl} alt={shop.shopName} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                            {shop.shopName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-2xs text-gray-400">
                            <span>{shop.followerCount} người theo dõi</span>
                            <span>•</span>
                            <span>Tham gia {joinedYears(shop.joinedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setIsFollowedShopsOpen(false);
                            navigate(`/shop/${shop.sellerId}`);
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-2xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none"
                        >
                          Xem Shop
                        </button>
                        <button
                          onClick={() => handleUnfollowShop(shop.sellerId, shop.shopName)}
                          disabled={unfollowMutation.isPending}
                          className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-2xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors focus:outline-none"
                        >
                          Bỏ theo dõi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <AntdModal
        title={null}
        open={isQrModalOpen}
        onCancel={() => setIsQrModalOpen(false)}
        footer={null}
        width={320}
        centered
        className="rounded-2xl"
      >
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full border-2 border-orange-100 bg-orange-50 mb-3 flex items-center justify-center overflow-hidden">
             {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
             ) : (
                <User className="w-8 h-8 text-orange-400" />
             )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{displayName}</h3>
          <p className="text-sm text-gray-500 mb-6">Quét mã để kết bạn trên ZORA</p>
          
          <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
             <QRCode
                value={`${import.meta.env.VITE_APP_URL || 'https://ecommerce-frontend-three-rosy.vercel.app'}/qr/user/${user?.id}`}
                size={200}
                color="#000000"
                bordered={false}
             />
          </div>
          
          <button 
             className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-white font-semibold hover:bg-orange-600 transition-colors"
             onClick={() => {
                navigator.clipboard.writeText(`${import.meta.env.VITE_APP_URL || 'https://ecommerce-frontend-three-rosy.vercel.app'}/qr/user/${user?.id}`);
                toast.success('Đã sao chép liên kết');
             }}
          >
             Sao chép liên kết
          </button>
        </div>
      </AntdModal>
    </div>
  );
}