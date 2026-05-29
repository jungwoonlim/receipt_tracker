import { Link } from 'react-router-dom';
import type { Receipt } from '../types/receipt';

interface Props {
  receipt: Receipt;
}

const CATEGORY_COLORS: Record<string, string> = {
  식비: 'bg-orange-100 text-orange-700',
  교통: 'bg-blue-100 text-blue-700',
  쇼핑: 'bg-pink-100 text-pink-700',
  의료: 'bg-green-100 text-green-700',
  문화: 'bg-purple-100 text-purple-700',
  미분류: 'bg-gray-100 text-gray-600',
};

function categoryColor(cat?: string | null) {
  return CATEGORY_COLORS[cat ?? ''] ?? 'bg-gray-100 text-gray-600';
}

function formatAmount(amount?: number | null, currency = 'KRW') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ReceiptCard({ receipt }: Props) {
  return (
    <Link
      to={`/receipts/${receipt.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-800 truncate pr-2">
          {receipt.vendor ?? '상호명 없음'}
        </h3>
        {receipt.category && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${categoryColor(receipt.category)}`}
          >
            {receipt.category}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {formatAmount(receipt.total, receipt.currency)}
      </p>
      <p className="text-sm text-gray-400 mt-2">
        {receipt.date ?? '날짜 없음'}
      </p>
    </Link>
  );
}
