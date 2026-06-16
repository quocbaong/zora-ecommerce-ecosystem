import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '../hooks/useAuth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import bannerBg from '@/assets/banner-log.jpg';
import api from '@/lib/axios';
import { getStompClient } from '@/lib/stompClient';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname;
  const { mutate: login, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const [bannedError, setBannedError] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('banned') === '1') {
      setBannedError(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  const onSubmit = (data: LoginForm) => {
    setBannedError(false);
    login(data, {
      onSuccess: (res) => {
        toast.success('Đăng nhập thành công');
        const role = res?.user?.role;
        if (role === 'SELLER') navigate(from || '/seller', { replace: true });
        else if (role === 'ADMIN') navigate(from || '/admin', { replace: true });
        else navigate(from || '/', { replace: true });
      },
      onError: (error) => {
        const errCode = (error as any)?.response?.data?.error;
        if (errCode === 'ACCOUNT_BANNED') {
          setBannedError(true);
        } else if (errCode === 'EMAIL_NOT_VERIFIED') {
          toast.warning('Email chưa được xác thực. Vui lòng kiểm tra hộp thư.');
          navigate('/verify-email', { state: { email: data.email } });
        } else {
          toast.error('Email hoặc mật khẩu không hợp lệ');
        }
      },
    });
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-end overflow-hidden bg-cover bg-center px-6 md:px-16 lg:px-24"
      style={{ backgroundImage: `url(${bannerBg})`, backgroundSize: '85%' }}
    >
      {/* Overlay nhẹ để chữ banner dễ đọc */}
      <div className="absolute inset-0 bg-white/10" />

      {/* Form card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/30 bg-white/70 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">Đăng Nhập</h2>
        <p className="mb-6 text-center text-sm text-gray-500">Chào mừng bạn quay lại ZORA!</p>

        {bannedError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800 font-medium mb-1">
              Tài khoản của bạn đã bị khóa.
            </p>
            <p className="text-sm text-red-700">
              Vui lòng liên hệ với bộ phận hỗ trợ để kháng nghị hoặc biết thêm chi tiết.{' '}
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="font-semibold underline hover:text-red-900"
              >
                Liên hệ hỗ trợ
              </button>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="example@domain.com"
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
            />
            {errors.email && <span className="mt-1 block text-xs text-red-500">{errors.email.message}</span>}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Mật khẩu</label>
            <div className="relative">
               <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 pr-11 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <span className="mt-1 block text-xs text-red-500">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            {isPending ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-gray-500 hover:text-orange-500 transition-colors">
            Quên mật khẩu?
          </Link>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-orange-500 hover:underline">
              Đăng ký ngay
            </Link>
          </span>
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Trung tâm Hỗ trợ Kháng nghị</h3>
            
             <AppealModalContent 
              email={getValues('email')} 
              onClose={() => setShowSupportModal(false)} 
              onUnbanned={() => {
                setBannedError(false);
                setShowSupportModal(false);
              }}
            />

          </div>
        </div>
      )}
    </div>
  );
}

import { appealService } from '@/features/admin/services/appealService';
import { X, Upload } from 'lucide-react';

function AppealModalContent({ 
  email: initialEmail, 
  onClose, 
  onUnbanned 
}: { 
  email?: string; 
  onClose: () => void; 
  onUnbanned: () => void;
}) {
  const [view, setView] = useState<'info' | 'submit' | 'status'>('info');
  const [email, setEmail] = useState(initialEmail || '');
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) return;

    let client: any = null;
    let subscription: any = null;

    const subscribeToTopic = () => {
      try {
        subscription = client.subscribe(`/topic/notifications/email/${email.trim()}`, (frame: any) => {
          try {
            const notification = JSON.parse(frame.body);
            if (notification.type === 'SYSTEM_ALERT' && 
                (notification.title?.includes('mở khóa') || 
                 notification.message?.includes('mở khóa') ||
                 notification.title?.toLowerCase().includes('unban') || 
                 notification.message?.toLowerCase().includes('unban'))) {
              toast.success('Tài khoản của bạn đã được mở khóa thành công!');
              onUnbanned();
            }
          } catch (err) {
            console.error('Error parsing notification:', err);
          }
        });
        console.log(`[STOMP] Subscribed to email topic: /topic/notifications/email/${email.trim()}`);
      } catch (err) {
        console.error('Error subscribing to STOMP topic:', err);
      }
    };

    try {
      client = getStompClient();
      if (client.active) {
        subscribeToTopic();
      } else {
        client.onConnect = () => {
          subscribeToTopic();
        };
        client.activate();
      }
    } catch (e) {
      console.warn('[AppealModalContent Socket] Failed to connect WebSocket:', e);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
          console.log('[STOMP] Unsubscribed from email topic');
        } catch (err) {
          // ignore
        }
      }
    };
  }, [email, onUnbanned]);

  const handleSubmit = async () => {
    if (!email || !reason) return toast.error('Vui lòng nhập đủ thông tin');
    try {
      setLoading(true);
      const evidenceImages: string[] = [];
      for (const file of images) {
        const res = await appealService.uploadEvidence(file);
        if (res.url) evidenceImages.push(res.url);
      }
      await appealService.submitAppeal({ email, reason, evidenceImages });
      toast.success('Gửi đơn kháng nghị thành công! Chúng tôi sẽ xem xét sớm nhất.');
      setView('info');
      setReason('');
      setImages([]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!email) return toast.error('Vui lòng nhập email');
    try {
      setLoading(true);
      const res = await appealService.getAppealStatus(email);
      setStatusResult(res);
    } catch (e: any) {
      toast.error('Không tìm thấy đơn kháng nghị nào cho email này.');
      setStatusResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'submit') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Điền lý do và hình ảnh (nếu có) để Ban quản trị xem xét mở khóa tài khoản.</p>
        <input 
          className="w-full border rounded-lg p-2 text-sm" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Email tài khoản" 
        />
        <textarea 
          className="w-full border rounded-lg p-2 text-sm" 
          rows={3}
          value={reason} 
          onChange={e => setReason(e.target.value)} 
          placeholder="Lý do kháng nghị..." 
        />
        
        {/* Image Upload */}
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Tải lên hình ảnh bằng chứng
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files) {
                  setImages(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
          </label>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="preview" 
                    className="w-16 h-16 object-cover rounded-md border"
                  />
                  <button 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => setView('info')} className="flex-1 py-2 text-sm border rounded-lg font-medium text-gray-700">Quay lại</button>
          <button disabled={loading} onClick={handleSubmit} className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium">
            {loading ? 'Đang gửi...' : 'Gửi đơn'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'status') {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <input 
            className="flex-1 border rounded-lg p-2 text-sm" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Nhập email cần tra cứu..." 
          />
          <button disabled={loading} onClick={handleCheckStatus} className="px-4 bg-orange-500 text-white text-sm rounded-lg font-medium">Tra cứu</button>
        </div>

        {statusResult && (
          <div className="p-4 bg-gray-50 rounded-lg border text-sm space-y-2 mt-2">
            <p><strong>Trạng thái:</strong> {statusResult.status}</p>
            {statusResult.adminNote && <p><strong>Ghi chú:</strong> {statusResult.adminNote}</p>}
            
            {statusResult.status === 'PENDING' && (
              <p className="text-orange-600 font-medium">Đơn đang chờ quản trị viên xem xét.</p>
            )}
            {statusResult.status === 'APPROVED' && (
              <p className="text-green-600 font-medium">Kháng nghị thành công. Cảnh cáo đã được hủy.</p>
            )}
            {statusResult.status === 'REJECTED' && (
              <p className="text-red-600 font-medium">Kháng nghị thất bại. Hình phạt đã được áp dụng.</p>
            )}
          </div>
        )}

        <button onClick={() => setView('info')} className="w-full py-2 mt-2 text-sm border rounded-lg font-medium text-gray-700">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-gray-600 text-sm space-y-3">
        <p>Tài khoản của bạn đã bị khóa do vi phạm. Bạn có thể nộp đơn kháng nghị để được xem xét mở lại.</p>
      </div>
      
      <div className="flex flex-col gap-2 mt-4">
        <button onClick={() => setView('submit')} className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-orange-600 transition-colors">
          Gửi đơn kháng nghị mới
        </button>
        <button onClick={() => setView('status')} className="w-full py-2.5 bg-white border-2 border-orange-500 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-50 transition-colors">
          Tra cứu đơn kháng cáo
        </button>
        <button onClick={onClose} className="w-full py-2 mt-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
          Đóng
        </button>
      </div>
    </div>
  );
}
