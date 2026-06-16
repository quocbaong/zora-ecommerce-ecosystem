import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowLeft, Download, TrendingUp, ShoppingBag, BarChart2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useSellerStats,
  useSellerRevenue,
  useTopProducts,
} from '@/features/order/hooks/useSellerDashboard';
import { formatPrice } from '@/utils/format';

function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function exportRevenueXlsx(
  filename: string,
  products: { productId: string; productName: string; totalSold: number; totalRevenue: number }[],
  totalOrders: number,
  totalRevenue: number,
) {
  const rows = products.map((p, idx) => ({
    'STT': idx + 1,
    'Mã sản phẩm': p.productId,
    'Tên sản phẩm': p.productName,
    'Số lượng đã bán': p.totalSold,
    'Doanh thu (VND)': p.totalRevenue,
  }));
  rows.push({
    'STT': '' as unknown as number,
    'Mã sản phẩm': '',
    'Tên sản phẩm': 'Tổng cộng',
    'Số lượng đã bán': totalOrders,
    'Doanh thu (VND)': totalRevenue,
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu');

  // Auto column widths
  const headers = Object.keys(rows[0] || {});
  ws['!cols'] = headers.map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, unknown>)[key] ?? '').length)) + 2,
  }));

  XLSX.writeFile(wb, filename);
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
  loading,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          {loading ? (
            <div className="h-7 w-32 bg-gray-100 rounded mt-2 animate-pulse" />
          ) : (
            <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          )}
          {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function SellerRevenuePage() {
  const [range, setRange] = useState<'day' | 'month'>('day');
  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: chart, isLoading: chartLoading } = useSellerRevenue(range);
  const { data: topProducts = [], isLoading: topLoading } = useTopProducts(20);

  const revenueToday = useMemo(() => {
    if (!chart?.length) return 0;
    const t = todayLabel();
    const point = chart.find((p) => p.label === t);
    return point?.revenue ?? 0;
  }, [chart]);

  const aov = useMemo(() => {
    const total = stats?.totalRevenue ?? 0;
    const count = stats?.totalOrders ?? 0;
    return count > 0 ? total / count : 0;
  }, [stats]);

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    exportRevenueXlsx(
      `doanh-thu-${date}.xlsx`,
      topProducts,
      stats?.totalOrders ?? 0,
      stats?.totalRevenue ?? 0,
    );
  };

  return (
    <div className="min-h-full bg-gray-100 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/seller"
            className="w-9 h-9 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate">Doanh thu</h1>
            <p className="text-xs text-gray-400 mt-0.5">Theo dõi doanh thu và đơn hàng của shop</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={topLoading || !topProducts.length}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-orange-200"
        >
          <Download className="w-4 h-4" /> Xuất Excel
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={BarChart2}
          label="Tổng doanh thu"
          value={formatPrice(stats?.totalRevenue ?? 0)}
          color="bg-green-50 text-green-600"
          loading={statsLoading}
        />
        <KpiCard
          icon={ShoppingBag}
          label="Tổng đơn hàng"
          value={String(stats?.totalOrders ?? 0)}
          color="bg-blue-50 text-blue-600"
          loading={statsLoading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Giá trị TB / đơn"
          value={formatPrice(aov)}
          hint="Doanh thu / số đơn"
          color="bg-purple-50 text-purple-600"
          loading={statsLoading}
        />
        <KpiCard
          icon={Calendar}
          label="Doanh thu hôm nay"
          value={formatPrice(revenueToday)}
          hint={`${stats?.newOrdersToday ?? 0} đơn mới`}
          color="bg-orange-50 text-orange-600"
          loading={statsLoading || chartLoading}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Biểu đồ doanh thu</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {range === 'day' ? '30 ngày gần nhất' : 'Tất cả các tháng'}
            </p>
          </div>
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
            {(['day', 'month'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  range === r ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {r === 'day' ? 'Ngày' : 'Tháng'}
              </button>
            ))}
          </div>
        </div>

        {chartLoading ? (
          <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
        ) : !chart?.length ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-300 text-sm">
            <BarChart2 className="w-10 h-10 mb-2 text-gray-200" />
            Chưa có dữ liệu doanh thu
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revPageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FA7E1E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FA7E1E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)
                }
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                formatter={(value) => [formatPrice(value as number), 'Doanh thu']}
                labelStyle={{ fontSize: 12, color: '#334155' }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#FA7E1E"
                strokeWidth={2}
                fill="url(#revPageGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#FA7E1E' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Top sản phẩm theo doanh thu</h2>
          <span className="text-xs text-gray-400">{topProducts.length} sản phẩm</span>
        </div>
        {topLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !topProducts.length ? (
          <div className="py-12 text-center text-sm text-gray-400">Chưa có sản phẩm nào được bán</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium w-12">#</th>
                  <th className="px-5 py-3 font-medium">Sản phẩm</th>
                  <th className="px-5 py-3 font-medium text-right">Đã bán</th>
                  <th className="px-5 py-3 font-medium text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.productImage ? (
                          <img
                            src={p.productImage}
                            alt={p.productName}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <span className="font-medium text-gray-800 truncate">{p.productName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{p.totalSold}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatPrice(p.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
