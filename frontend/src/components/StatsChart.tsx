import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsSummary } from '../types/receipt';

interface Props {
  analytics: AnalyticsSummary;
}

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#ec4899', '#6b7280'];

function formatKRW(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StatsChart({ analytics }: Props) {
  const categoryData = Object.entries(analytics.by_category).map(
    ([name, value]) => ({ name, value }),
  );

  const monthlyData = analytics.monthly_series.map((m) => ({
    month: m.month.slice(5), // "2025-03" → "03"
    total: m.total,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          월별 지출
        </h3>
        {monthlyData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">데이터 없음</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(v)
                }
                tick={{ fontSize: 12 }}
                width={55}
              />
              <Tooltip formatter={(v) => formatKRW(Number(v))} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category pie chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          카테고리별 지출
        </h3>
        {categoryData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">데이터 없음</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatKRW(Number(v))} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
