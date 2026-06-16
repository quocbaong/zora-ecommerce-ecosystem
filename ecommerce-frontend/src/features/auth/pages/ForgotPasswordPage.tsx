import { useState, useRef, useEffect } from 'react';
import { authService } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, KeyRound, Lock, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react';
import bannerBg from '@/assets/banner-log.jpg';

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const otp = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    text.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  // Step 1: gửi OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      setIsPending(true);
      await authService.forgotPassword(email);
      toast.success('Mã OTP đã được gửi đến email của bạn!');
      setStep('otp');
      setCountdown(60);
    } catch {
      toast.error('Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setIsPending(false);
    }
  };

  // Step 2: xác nhận OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setStep('reset');
  };

  // Gửi lại OTP
  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await authService.forgotPassword(email);
      toast.success('Đã gửi lại OTP!');
      setCountdown(60);
      setDigits(Array(6).fill(''));
    } catch {
      toast.error('Không thể gửi lại OTP.');
    }
  };

  // Step 3: đặt lại mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    try {
      setIsPending(true);
      await authService.resetPassword(email, otp, newPassword);
      toast.success('Đặt lại mật khẩu thành công! Hãy đăng nhập.');
      navigate('/login');
    } catch (error) {
      const errCode = (error as any)?.response?.data?.error;
      if (errCode === 'OTP_EXPIRED') {
        toast.error('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
        setStep('otp');
        setDigits(Array(6).fill(''));
      } else if (errCode === 'INVALID_OTP') {
        toast.error('Mã OTP không đúng.');
        setStep('otp');
        setDigits(Array(6).fill(''));
      } else {
        toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsPending(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all';

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-end overflow-hidden bg-cover bg-center px-6 md:px-16 lg:px-24"
      style={{ backgroundImage: `url(${bannerBg})`, backgroundSize: '85%' }}
    >
      <div className="absolute inset-0 bg-white/10" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/30 bg-white/75 p-8 shadow-2xl backdrop-blur-md">

        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {(['email', 'otp', 'reset'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === s ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : (['email', 'otp', 'reset'].indexOf(step) > i) ? 'bg-orange-200 text-orange-700' : 'bg-gray-200 text-gray-400'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`h-px w-8 ${(['email', 'otp', 'reset'].indexOf(step) > i) ? 'bg-orange-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Email ── */}
        {step === 'email' && (
          <>
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 shadow-sm">
                <Mail className="h-7 w-7 text-orange-500" />
              </div>
            </div>
            <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">Quên mật khẩu</h2>
            <p className="mb-6 text-center text-sm text-gray-500">Nhập email để nhận mã OTP đặt lại mật khẩu</p>

            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="mt-1 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition-all"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang gửi...
                  </span>
                ) : 'Gửi mã OTP'}
              </button>
            </form>
          </>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 'otp' && (
          <>
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 shadow-sm">
                <KeyRound className="h-7 w-7 text-orange-500" />
              </div>
            </div>
            <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">Nhập mã OTP</h2>
            <p className="mb-1 text-center text-sm text-gray-500">Mã đã gửi đến</p>
            <p className="mb-5 text-center text-sm font-semibold text-orange-500 break-all">{email}</p>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div>
                <label className="mb-3 block text-center text-sm font-medium text-gray-700">Nhập mã 6 chữ số</label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`h-12 w-10 rounded-xl border-2 bg-white text-center text-lg font-bold transition-all focus:outline-none
                        ${d ? 'border-orange-400 text-orange-600' : 'border-gray-200 text-gray-900'}
                        focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={otp.length < 6}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition-all"
              >
                Xác nhận OTP
              </button>
            </form>

            <div className="mt-4 text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-400">
                  Gửi lại sau <span className="font-semibold text-orange-500">{countdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Gửi lại OTP
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Step 3: New Password ── */}
        {step === 'reset' && (
          <>
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 shadow-sm">
                <Lock className="h-7 w-7 text-orange-500" />
              </div>
            </div>
            <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">Đặt mật khẩu mới</h2>
            <p className="mb-6 text-center text-sm text-gray-500">Nhập mật khẩu mới cho tài khoản của bạn</p>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputCls} pr-11`}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputCls} pr-11`}
                  />
                  <button type="button" onClick={() => setShowConfirmPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="mt-1 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition-all"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang xử lý...
                  </span>
                ) : 'Đặt lại mật khẩu'}
              </button>
            </form>
          </>
        )}

        {/* Back to login */}
        <div className="mt-5 flex justify-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
