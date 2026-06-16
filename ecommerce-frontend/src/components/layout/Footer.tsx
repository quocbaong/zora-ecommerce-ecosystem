import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Send,
  ChevronRight,
} from 'lucide-react';

const BENEFITS = [
  { icon: Truck, title: 'Miễn phí vận chuyển', desc: 'Đơn từ 500.000đ' },
  { icon: RotateCcw, title: 'Đổi trả 7 ngày', desc: 'Miễn phí kiểm hàng' },
  { icon: ShieldCheck, title: 'Thanh toán bảo mật', desc: 'SSL & mã hoá đầu cuối' },
  { icon: Headphones, title: 'Hỗ trợ 24/7', desc: 'Hotline tận tâm' },
];

const SOCIALS = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'Youtube', href: '#' },
];

const PAYMENTS = ['VISA', 'MASTERCARD', 'JCB', 'VNPAY', 'MOMO', 'ZALOPAY', 'COD'];

export default function Footer() {
  return (
    <footer className="w-full bg-secondary text-white">
      <div className="container mx-auto px-6 md:px-12 border-b border-white/10 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-white/50 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-14">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="inline-block">
              <h4 className="text-3xl font-bold tracking-tight">ZORA</h4>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              Định nghĩa lại trải nghiệm mua sắm với sự tinh tế của sự tối giản — mang hàng nghìn sản phẩm chất lượng đến tay bạn trong 24h.
            </p>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Kết nối với chúng tôi</p>
              <div className="flex gap-2">
                {SOCIALS.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:bg-primary hover:border-primary hover:text-white transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white/90">Về Chúng Tôi</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li><Link to="#" className="hover:text-primary transition-colors">Giới thiệu ZORA</Link></li>
              <li><Link to="/products" className="hover:text-primary transition-colors">Cửa hàng</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Tuyển dụng</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Tin tức & Blog</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Đối tác bán hàng</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white/90">Hỗ Trợ</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li><Link to="#" className="hover:text-primary transition-colors">Trung tâm trợ giúp</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Giao hàng &amp; Đổi trả</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Câu hỏi thường gặp</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Hướng dẫn mua hàng</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white/90">Liên Hệ</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-medium">1800 ZORA <span className="text-white/40 text-xs">(miễn phí)</span></p>
                  <p className="text-xs text-white/40">Thứ Hai – Chủ Nhật, 08:00 – 22:00</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <a href="mailto:hi@zora.com" className="hover:text-primary transition-colors">hi@zora.com</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Tầng 12, Toà ZORA, 88 Láng Hạ, Đống Đa, Hà Nội</span>
              </li>
            </ul>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="pt-2"
            >
              <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Đăng ký nhận tin</p>
              <div className="flex">
                <input
                  type="email"
                  required
                  placeholder="Email của bạn"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-l-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white px-4 rounded-r-lg flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-white/40 mt-2">Nhận voucher 50.000đ cho đơn đầu tiên</p>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-6 border-t border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-white/40 mr-2">Thanh toán</span>
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded bg-white/10 text-white/80"
              >
                {p}
              </span>
            ))}
          </div>
          <a
            href="http://online.gov.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[11px] text-white/50 hover:text-white/80 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Đã thông báo với Bộ Công Thương
            <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="bg-black/30">
        <div className="container mx-auto px-6 md:px-12 py-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-[11px] text-white/40">
            <div className="space-y-1">
              <p>© {new Date().getFullYear()} CÔNG TY TNHH ZORA — All rights reserved.</p>
              <p>GPĐKKD số 0123456789 do Sở KH&amp;ĐT TP. Hà Nội cấp ngày 01/01/2024.</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link to="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</Link>
              <Link to="#" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
              <Link to="#" className="hover:text-white transition-colors">Cookie</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
