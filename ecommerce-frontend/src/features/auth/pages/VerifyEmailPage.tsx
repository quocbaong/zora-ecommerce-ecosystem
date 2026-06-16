import { useState, useRef, useEffect } from 'react';
import { authService } from '../services/authService';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import bannerBg from '@/assets/banner-log.jpg';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown để resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const code = digits.join('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    try {
      setIsPending(true);
      await authService.verifyEmail(email, code);
      toast.success('Xác thực email thành công! Hãy đăng nhập.');
      navigate('/login');
    } catch {
      toast.error('Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.');
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsPending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email) return;
    try {
      setIsResending(true);
      await authService.resendVerification(email);
      toast.success('Đã gửi lại mã xác thực!');
      setCountdown(60);
      setDigits(Array(6).fill(''));
    } catch {
      toast.error('Không thể gửi lại mã. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-end overflow-hidden bg-cover bg-center px-6 md:px-16 lg:px-24"
      style={{ backgroundImage: `url(${bannerBg})`, backgroundSize: '85%' }}
    >
      <div className="absolute inset-0 bg-white/10" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/30 bg-white/75 p-8 shadow-2xl backdrop-blur-md">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 shadow-sm">
            <Mail className="h-7 w-7 text-orange-500" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">Xác thực email</h2>
        <p className="mb-1 text-center text-sm text-gray-500">
          Mã xác thực đã được gửi đến
        </p>
        <p className="mb-6 text-center text-sm font-semibold text-orange-500 break-all">
          {email || 'email của bạn'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* OTP inputs */}
          <div>
            <label className="mb-3 block text-center text-sm font-medium text-gray-700">
              Nhập mã 6 chữ số
            </label>
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
            disabled={isPending || code.length < 6}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang xác thực...
              </span>
            ) : 'Xác thực'}
          </button>
        </form>

        {/* Resend */}
        <div className="mt-4 text-center">
          {countdown > 0 ? (
            <p className="text-sm text-gray-400">
              Gửi lại mã sau{' '}
              <span className="font-semibold text-orange-500">{countdown}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
              Gửi lại mã xác thực
            </button>
          )}
        </div>

        {/* Back to login */}
        <div className="mt-5 flex justify-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
