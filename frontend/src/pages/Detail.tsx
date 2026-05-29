import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Receipt, ReceiptUpdate } from '../types/receipt';

const CATEGORIES = ['식비', '교통', '쇼핑', '의료', '문화', '기타'];

function formatAmount(amount?: number | null, currency = 'KRW') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ReceiptUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getReceipt(Number(id))
      .then(setReceipt)
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  }, [id]);

  function startEdit() {
    if (!receipt) return;
    setDraft({
      vendor: receipt.vendor,
      date: receipt.date,
      total: receipt.total,
      tax: receipt.tax,
      currency: receipt.currency,
      category: receipt.category,
      notes: receipt.notes,
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!receipt) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateReceipt(receipt.id, draft);
      setReceipt(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!receipt) return;
    try {
      await api.deleteReceipt(receipt.id);
      navigate('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse mb-4 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 text-center text-gray-400">
        <p>{error ?? '영수증을 찾을 수 없습니다.'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary mt-4">
          대시보드로
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="text-sm text-blue-500 hover:underline mb-4 flex items-center gap-1"
      >
        ← 대시보드
      </button>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {editing ? (
            <input
              className="input text-2xl font-bold"
              value={draft.vendor ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value || null }))}
              placeholder="상호명"
            />
          ) : (
            receipt.vendor ?? '상호명 없음'
          )}
        </h1>
        {!editing && (
          <button onClick={startEdit} className="btn-secondary text-sm">
            수정
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 영수증 이미지 */}
      {receipt.image_url && (
        <img
          src={receipt.image_url}
          alt="영수증 이미지"
          className="w-full max-h-80 object-contain rounded-xl border border-gray-200 mb-6"
        />
      )}

      {/* Fields */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <Row label="날짜">
          {editing ? (
            <input
              type="date"
              className="input"
              value={draft.date ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value || null }))}
            />
          ) : (
            receipt.date ?? '—'
          )}
        </Row>

        <Row label="합계">
          {editing ? (
            <input
              type="number"
              className="input"
              value={draft.total ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, total: e.target.value ? Number(e.target.value) : null }))
              }
            />
          ) : (
            <span className="text-xl font-bold text-gray-900">
              {formatAmount(receipt.total, receipt.currency)}
            </span>
          )}
        </Row>

        <Row label="세금">
          {editing ? (
            <input
              type="number"
              className="input"
              value={draft.tax ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, tax: e.target.value ? Number(e.target.value) : null }))
              }
            />
          ) : (
            formatAmount(receipt.tax, receipt.currency)
          )}
        </Row>

        <Row label="통화">
          {editing ? (
            <select
              className="input"
              value={draft.currency ?? 'KRW'}
              onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
            >
              <option value="KRW">KRW</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
            </select>
          ) : (
            receipt.currency
          )}
        </Row>

        <Row label="카테고리">
          {editing ? (
            <select
              className="input"
              value={draft.category ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value || null }))}
            >
              <option value="">선택 안 함</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            receipt.category ?? '미분류'
          )}
        </Row>

        <Row label="메모">
          {editing ? (
            <textarea
              className="input resize-none h-20"
              value={draft.notes ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || null }))}
              placeholder="메모 (선택)"
            />
          ) : (
            receipt.notes ?? '—'
          )}
        </Row>
      </div>

      {/* Line items */}
      {receipt.items && receipt.items.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            품목
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-800">{item.name}</span>
                <span className="text-gray-500">
                  {item.qty != null ? `x${item.qty} ` : ''}
                  {item.price != null
                    ? new Intl.NumberFormat('ko-KR').format(item.price)
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <p className="text-xs text-gray-400 mt-4">
        등록: {new Date(receipt.created_at).toLocaleString('ko-KR')}
      </p>

      {/* Actions */}
      {editing ? (
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setEditing(false)}
            className="btn-secondary flex-1"
            disabled={saving}
          >
            취소
          </button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {confirmDelete ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm font-medium mb-3">
                이 영수증을 삭제하시겠습니까? 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn-secondary flex-1"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 flex-1"
                >
                  삭제 확인
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-red-500 text-sm hover:underline"
            >
              영수증 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="text-sm text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 text-gray-800 text-sm">{children}</div>
    </div>
  );
}
