import { 
  Truck, 
  Wallet, 
  Flame, 
  ShieldCheck, 
  Ticket, 
  Gift, 
  Clock, 
  CreditCard 
} from 'lucide-react-native';

export const COLORS = {
  primary: '#FF6B35',
  secondary: '#0A2540',
  accent: '#f97316',
  background: '#FAFAFA',
  white: '#FFFFFF',
  textSecondary: '#9ca3af',
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
};

export const UTILITIES = [
  { id: '1', icon: Ticket, label: 'Voucher 50%', color: '#f97316', bg: '#fff7ed' },
  { id: '2', icon: Wallet, label: 'Thanh Toán', color: '#3b82f6', bg: '#eff6ff' },
  { id: '3', icon: Truck, label: 'Miễn Phí Ship', color: '#22c55e', bg: '#f0fdf4' },
  { id: '4', icon: Flame, label: 'Bắt Trend', color: '#ef4444', bg: '#fef2f2' },
  { id: '5', icon: ShieldCheck, label: 'Chính Hãng', color: '#6366f1', bg: '#eef2ff' },
  { id: '6', icon: Gift, label: 'Quà Tặng', color: '#ec4899', bg: '#fdf2f8' },
  { id: '7', icon: Clock, label: 'Giao Siêu Tốc', color: '#eab308', bg: '#fefce8' },
  { id: '8', icon: CreditCard, label: 'Mua Trước', color: '#a855f7', bg: '#f3e8ff' },
];

export const CATEGORIES = [
  { id: 'cat-1', name: 'Điện thoại', slug: 'dien-thoai', image: require('../../assets/categories/cat-dien-thoai.jpg') },
  { id: 'cat-2', name: 'Laptop', slug: 'laptop', image: require('../../assets/categories/cat-laptop.jpg') },
  { id: 'cat-3', name: 'Thời trang Nam', slug: 'thoi-trang-nam', image: require('../../assets/categories/cat-thoi-trang-nam.jpg') },
  { id: 'cat-4', name: 'Thời trang Nữ', slug: 'thoi-trang-nu', image: require('../../assets/categories/cat-thoi-trang-nu.jpg') },
  { id: 'cat-5', name: 'Đồng hồ', slug: 'dong-ho', image: require('../../assets/categories/cat-dong-ho.jpg') },
  { id: 'cat-6', name: 'Giày dép', slug: 'giay-dep', image: require('../../assets/categories/cat-giay-dep.jpg') },
  { id: 'cat-7', name: 'Gia dụng', slug: 'home-appliances', image: require('../../assets/categories/cat-home-appliances.jpg') },
  { id: 'cat-8', name: 'Máy ảnh', slug: 'may-anh', image: require('../../assets/categories/cat-may-anh.jpg') },
  { id: 'cat-9', name: 'Sức khỏe', slug: 'suc-khoe', image: require('../../assets/categories/cat-suc-khoe.jpg') },
  { id: 'cat-10', name: 'Thể thao', slug: 'the-thao', image: require('../../assets/categories/cat-the-thao.jpg') },
  { id: 'cat-11', name: 'Đồ chơi', slug: 'do-choi', image: require('../../assets/categories/cat-do-choi.jpg') },
  { id: 'cat-12', name: 'Xe cộ', slug: 'xe-co', image: require('../../assets/categories/cat-xe-co.jpg') },
];
