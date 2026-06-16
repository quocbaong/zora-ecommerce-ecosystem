import { useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ShoppingBag, XCircle, BarChart2, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSellerTrends } from '@/features/order/hooks/useSellerDashboard';
import { formatPrice } from '@/utils/format';

function growthPct(current: number, prev: number): number | null {
  if (prev === 0) return current === 0 ? 0 : null;
  return ((current - prev) / prev) * 100;
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
        <Minus className="w-3 h-3" /> Mới
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
        <TrendingUp className="w-3 h-3" /> +{pct.toFixed(1)}%
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
        <TrendingDown className="w-3 h-3" /> {pct.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
}

function CompareCard({
  icon: Icon,
  label,
  current,
  prev,
  formatValue,
  color,
  invertColors,
  loading,
}: {
  icon: typeof TrendingUp;
  label: string;
  current: number;
  prev: number;
  formatValue: (n: number) => string;
  color: string;
  invertColors?: boolean;
  loading?: boolean;
}) {
  const pct = growthPct(current, prev);
  // Đảo màu cho metric mà tăng = xấu (ví dụ: đơn hủy)
  const display = invertColors && pct !== null ? -pct : pct;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <GrowthBadge pct={display} />
      </div>
      {loading ? (
        <div className="h-7 w-32 bg-gray-100 rounded animate-pulse" />
      ) : (
        <>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatValue(current)}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            7 ngày trước: {formatValue(prev)}
          </p>
        </>
      )}
    </div>
  );
}

export default function SellerTrendsPage() {
  const { data, isLoading } = useSellerTrends();

  const aovLast = useMemo(() => {
    if (!data || data.ordersLast7d === 0) return 0;
    return data.revenueLast7d / data.ordersLast7d;
  }, [data]);

  const aovPrev = useMemo(() => {
    if (!data || data.ordersPrev7d === 0) return 0;
    return data.revenuePrev7d / data.ordersPrev7d;
  }, [data]);

  return (
    <div className="min-h-full bg-gray-100 p-5">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/seller"
          className="w-9 h-9 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Xu hướng</h1>
          <p className="text-xs text-gray-400 mt-0.5">So sánh 7 ngày gần nhất với 7 ngày trước đó</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <CompareCard
          icon={BarChart2}
          label="Doanh thu 7 ngày"
          current={data?.revenueLast7d ?? 0}
          prev={data?.revenuePrev7d ?? 0}
          formatValue={formatPrice}
          color="bg-green-50 text-green-600"
          loading={isLoading}
        />
        <CompareCard
          icon={ShoppingBag}
          label="Đơn hàng 7 ngày"
          current={data?.ordersLast7d ?? 0}
          prev={data?.ordersPrev7d ?? 0}
          formatValue={(n) => String(n)}
          color="bg-blue-50 text-blue-600"
          loading={isLoading}
        />
        <CompareCard
          icon={Calculator}
          label="Giá trị TB / đơn"
          current={aovLast}
          prev={aovPrev}
          formatValue={formatPrice}
          color="bg-purple-50 text-purple-600"
          loading={isLoading}
        />
        <CompareCard
          icon={XCircle}
          label="Đơn hủy 7 ngày"
          current={data?.cancelledLast7d ?? 0}
          prev={data?.cancelledPrev7d ?? 0}
          formatValue={(n) => String(n)}
          color="bg-rose-50 text-rose-600"
          invertColors
          loading={isLoading}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-800">Doanh thu 14 ngày gần nhất</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Theo dõi biến động theo ngày</p>
        </div>
        {isLoading ? (
          <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
        ) : !data?.dailyTrend?.length ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-300 text-sm">
            <BarChart2 className="w-10 h-10 mb-2 text-gray-200" />
            Chưa có dữ liệu
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.dailyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FA7E1E"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#FA7E1E', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#FA7E1E' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Sản phẩm xu hướng</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Sản phẩm có doanh thu cao trong 7 ngày — kèm so sánh với 7 ngày trước</p>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.topMovers?.length ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Chưa có sản phẩm nào bán được trong 7 ngày qua
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium w-12">#</th>
                  <th className="px-5 py-3 font-medium">Sản phẩm</th>
                  <th className="px-5 py-3 font-medium text-right">Đã bán (7d)</th>
                  <th className="px-5 py-3 font-medium text-right">Doanh thu (7d)</th>
                  <th className="px-5 py-3 font-medium text-right w-32">So với 7d trước</th>
                </tr>
              </thead>
              <tbody>
                {data.topMovers.map((p, idx) => {
                  const pct = growthPct(p.revenueLast7d, p.revenuePrev7d);
                  return (
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
                      <td className="px-5 py-3 text-right text-gray-700">{p.soldLast7d}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {formatPrice(p.revenueLast7d)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <GrowthBadge pct={pct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
