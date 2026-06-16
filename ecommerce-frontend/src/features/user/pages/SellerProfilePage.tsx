import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { User, Lock, Camera, Check, Eye, EyeOff, ArrowLeft, Store, Phone, Warehouse as WarehouseIcon, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useChangePassword,
  useMyWarehouse,
  useUpdateMyWarehouse,
} from '../hooks/useUser';
import { useAuthStore } from '@/stores/authStore';
import LocationSelector from '../components/LocationSelector';

type Tab = 'profile' | 'warehouse' | 'password';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Thông tin cá nhân', icon: User },
  { id: 'warehouse', label: 'Kho hàng', icon: WarehouseIcon },
  { id: 'password', label: 'Đổi mật khẩu', icon: Lock },
];

export default function SellerProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { user } = useAuthStore();

  // ─── Profile ────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    if (profile && !profileDirty) {
      setProfileForm({ fullName: profile.fullName ?? '', phone: profile.phone ?? '' });
    }
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

  // ─── Warehouse ──────────────────────────────────────────────────
  const { data: warehouse } = useMyWarehouse();
  const updateWarehouse = useUpdateMyWarehouse();
  const [whForm, setWhForm] = useState({
    warehouseProvince: '',
    warehouseDistrict: '',
    warehouseWard: '',
    warehouseStreet: '',
    warehousePhone: '',
    warehouseGhnProvinceId: undefined as number | undefined,
    warehouseGhnDistrictId: undefined as number | undefined,
    warehouseGhnWardCode: undefined as string | undefined,
  });
  const [whDirty, setWhDirty] = useState(false);

  useEffect(() => {
    if (warehouse && !whDirty) {
      setWhForm({
        warehouseProvince: warehouse.warehouseProvince ?? '',
        warehouseDistrict: warehouse.warehouseDistrict ?? '',
        warehouseWard: warehouse.warehouseWard ?? '',
        warehouseStreet: warehouse.warehouseStreet ?? '',
        warehousePhone: warehouse.warehousePhone ?? '',
        warehouseGhnProvinceId: warehouse.warehouseGhnProvinceId ?? undefined,
        warehouseGhnDistrictId: warehouse.warehouseGhnDistrictId ?? undefined,
        warehouseGhnWardCode: warehouse.warehouseGhnWardCode ?? undefined,
      });
    }
  }, [warehouse, whDirty]);

  const handleWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whForm.warehouseGhnDistrictId || !whForm.warehouseGhnWardCode) {
      return;
    }
    updateWarehouse.mutate(whForm as any, {
      onSuccess: () => setWhDirty(false),
    });
  };

  // ─── Password ───────────────────────────────────────────────────
  const changePassword = useChangePassword();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false });
  const [pwError, setPwError] = useState('');

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

  const displayName = profile?.fullName || user?.fullName || user?.email?.split('@')[0] || 'Seller';
  const avatarUrl = avatarPreview || profile?.avatarUrl || user?.avatarUrl;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back */}
        <Link
          to="/seller"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Quay lại Dashboard
        </Link>

        {/* ── Hero Card ── */}
        <div className="relative mb-8 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white shadow-xl shadow-orange-200/50 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative flex items-center gap-6">
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
              <p className="text-xs font-medium text-white/60 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> Tài khoản người bán
              </p>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-white/80 text-sm mt-0.5">{profile?.email || user?.email}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wider backdrop-blur-sm">
                  SELLER
                </span>
                {(profile?.phone || user?.phone) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-0.5 text-xs backdrop-blur-sm">
                    <Phone className="w-3 h-3" />
                    {profile?.phone || user?.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs + Content ── */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="md:w-52 shrink-0">
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
          </div>

          {/* Panel */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[350px]">

            {/* ── Tab 1: Profile ── */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-6">Thông tin cá nhân</h2>
                {profileLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
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
                        <label htmlFor="seller-fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Tên hiển thị / Tên cửa hàng
                        </label>
                        <input
                          id="seller-fullName"
                          type="text"
                          placeholder={profile?.fullName || 'Nhập tên...'}
                          value={profileForm.fullName}
                          onChange={(e) => handleProfileFormChange('fullName', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="seller-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Số điện thoại
                        </label>
                        <input
                          id="seller-phone"
                          type="tel"
                          placeholder={profile?.phone || 'Nhập số điện thoại...'}
                          value={profileForm.phone}
                          onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
                        />
                      </div>
                    </div>

                    {updateProfile.isSuccess && !profileDirty && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2.5">
                        <Check className="w-4 h-4 shrink-0" />
                        Đã lưu thành công
                      </div>
                    )}

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

            {/* ── Tab 2: Warehouse ── */}
            {activeTab === 'warehouse' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Kho hàng / Địa chỉ lấy hàng</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Địa chỉ kho sẽ được dùng để tính phí vận chuyển từ shop đến người mua. Bắt buộc khai báo để có thể bán hàng.
                </p>

                {warehouse && !warehouse.configured && (
                  <div className="mb-5 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-700">
                      Bạn chưa cấu hình kho hàng. Đơn hàng có sản phẩm của shop sẽ không tính được phí ship.
                    </p>
                  </div>
                )}

                <form onSubmit={handleWarehouseSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại kho</label>
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={whForm.warehousePhone}
                      onChange={(e) => { setWhForm((f) => ({ ...f, warehousePhone: e.target.value })); setWhDirty(true); }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <LocationSelector
                      required
                      province={whForm.warehouseProvince}
                      district={whForm.warehouseDistrict}
                      ward={whForm.warehouseWard}
                      ghnProvinceId={whForm.warehouseGhnProvinceId}
                      ghnDistrictId={whForm.warehouseGhnDistrictId}
                      ghnWardCode={whForm.warehouseGhnWardCode}
                      onChange={(loc) => {
                        setWhForm((f) => ({
                          ...f,
                          warehouseProvince: loc.province,
                          warehouseDistrict: loc.district,
                          warehouseWard: loc.ward,
                          warehouseGhnProvinceId: loc.ghnProvinceId,
                          warehouseGhnDistrictId: loc.ghnDistrictId,
                          warehouseGhnWardCode: loc.ghnWardCode,
                        }));
                        setWhDirty(true);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Số nhà, tên đường</label>
                    <input
                      type="text"
                      placeholder="VD: 100 Lê Lợi"
                      value={whForm.warehouseStreet}
                      onChange={(e) => { setWhForm((f) => ({ ...f, warehouseStreet: e.target.value })); setWhDirty(true); }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updateWarehouse.isPending || !whDirty || !whForm.warehouseGhnDistrictId || !whForm.warehouseGhnWardCode}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {updateWarehouse.isPending ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</>
                    ) : (
                      <><Check className="w-4 h-4" /> Lưu kho hàng</>
                    )}
                  </button>
                </form>
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
                      <label htmlFor={`seller-${id}`} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <div className="relative">
                        <input
                          id={`seller-${id}`}
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
                        >
                          {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}

                  {pwError && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{pwError}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
