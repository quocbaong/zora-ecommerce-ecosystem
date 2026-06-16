import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import bannerBg from '@/assets/banner-log.jpg';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Mật khẩu xác nhận ít nhất 6 ký tự'),
  fullName: z.string().min(1, 'Họ tên không được để trống'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { mutate: registerUser, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterForm) => {
    registerUser(
      { email: data.email, password: data.password, fullName: data.fullName, role: 'USER' },
      {
        onSuccess: () => {
          navigate('/verify-email', { state: { email: data.email } });
        },
        onError: (err: any) => {
          const errorData = err.response?.data;
          let errorMessage =
            errorData?.message ||
            errorData?.error ||
            (typeof errorData === 'string' ? errorData : 'Lỗi đăng ký. Vui lòng thử lại.');
          if (errorMessage === 'EMAIL_ALREADY_EXISTS') {
            errorMessage = 'Email này đã được đăng ký. Vui lòng sử dụng email khác.';
          }
          toast.error(errorMessage);
        },
      }
    );
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-end overflow-hidden bg-cover bg-center px-6 md:px-16 lg:px-24"
      style={{ backgroundImage: `url(${bannerBg})`, backgroundSize: '85%' }}
    >
      {/* Overlay nhẹ */}
      <div className="absolute inset-0 bg-white/10" />

      {/* Form card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/30 bg-white/70 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">Đăng Ký</h2>
        <p className="mb-6 text-center text-sm text-gray-500">Tạo tài khoản ZORA của bạn</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Full name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Họ và tên</label>
            <input
              {...register('fullName')}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
            />
            {errors.fullName && <span className="mt-1 block text-xs text-red-500">{errors.fullName.message}</span>}
          </div>

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

          {/* Confirm password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 pr-11 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <span className="mt-1 block text-xs text-red-500">{errors.confirmPassword.message}</span>}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            {isPending ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-orange-500 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
