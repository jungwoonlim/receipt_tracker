import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ReceiptCard from '../components/ReceiptCard';
import StatsChart from '../components/StatsChart';
import type { AnalyticsSummary, Receipt } from '../types/receipt';

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.listReceipts({ category: selectedCategory || undefined }),
      api.getAnalytics(currentYear),
      api.getCategories(),
    ])
      .then(([r, a, c]) => {
        setReceipts(r);
        setAnalytics(a);
        setCategories(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '데이터 로드 실패'))
      .finally(() => setLoading(false));
  }, [selectedCategory, currentYear]);

  const totalSpend = analytics?.total_spend ?? 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 text-sm mt-0.5">{currentYear}년 전체 지출 현황</p>
        </div>
        <Link to="/upload" className="btn-primary">
          + 영수증 추가
        </Link>
      </div>

      {/* Summary card */}
      <div className="bg-blue-600 text-white rounded-xl p-6 mb-6">
        <p className="text-sm opacity-80">총 지출 ({currentYear})</p>
        <p className="text-4xl font-bold mt-1">
          {new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0,
          }).format(totalSpend)}
        </p>
        <p className="text-sm opacity-70 mt-1">{receipts.length}건의 영수증</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Charts */}
      {analytics && !loading && (
        <div className="mb-8">
          <StatsChart analytics={analytics} />
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedCategory('')}
          className={`filter-chip ${selectedCategory === '' ? 'filter-chip-active' : ''}`}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`filter-chip ${selectedCategory === cat ? 'filter-chip-active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Receipt grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">영수증이 없습니다</p>
          <Link to="/upload" className="text-blue-500 hover:underline text-sm mt-2 inline-block">
            첫 영수증을 업로드하세요 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {receipts.map((r) => (
            <ReceiptCard key={r.id} receipt={r} />
          ))}
        </div>
      )}
    </div>
  );
}
