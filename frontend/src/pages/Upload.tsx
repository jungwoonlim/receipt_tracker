import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import UploadZone from '../components/UploadZone';
import type { LineItem, Receipt, ReceiptCreate } from '../types/receipt';

type Phase = 'idle' | 'processing' | 'preview';

const CATEGORIES = ['식비', '교통', '쇼핑', '의료', '문화', '기타'];

export default function Upload() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<Receipt>>({});
  const [ocr_raw, setOcrRaw] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setPhase('processing');
    try {
      const result = await api.ocrReceipt(file);
      setOcrRaw(result.ocr_raw ?? null);
      setPreview(result);
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR 처리 중 오류가 발생했습니다.');
      setPhase('idle');
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: ReceiptCreate = {
        vendor: preview.vendor ?? null,
        date: preview.date ?? null,
        total: preview.total ?? null,
        tax: preview.tax ?? null,
        currency: preview.currency ?? 'KRW',
        category: preview.category ?? null,
        items: preview.items ?? null,
        notes: preview.notes ?? null,
        image_url: preview.image_url ?? null,
        ocr_raw,
      };
      const saved = await api.createReceipt(payload);
      navigate(`/receipts/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof Receipt>(key: K, value: Receipt[K]) {
    setPreview((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">영수증 업로드</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {phase === 'idle' && (
        <UploadZone onFile={handleFile} />
      )}

      {phase === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg
            className="animate-spin w-10 h-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-gray-500">Upstage OCR 처리 중...</p>
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            OCR 결과를 확인하고 수정한 후 저장하세요.
          </p>

          {preview.image_url && (
            <img
              src={preview.image_url}
              alt="영수증 이미지"
              className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="상호명">
              <input
                className="input"
                value={preview.vendor ?? ''}
                onChange={(e) => updateField('vendor', e.target.value || null)}
                placeholder="상호명"
              />
            </Field>

            <Field label="날짜">
              <input
                type="date"
                className="input"
                value={preview.date ?? ''}
                onChange={(e) => updateField('date', e.target.value || null)}
              />
            </Field>

            <Field label="합계 금액">
              <input
                type="number"
                className="input"
                value={preview.total ?? ''}
                onChange={(e) =>
                  updateField('total', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="0"
              />
            </Field>

            <Field label="세금">
              <input
                type="number"
                className="input"
                value={preview.tax ?? ''}
                onChange={(e) =>
                  updateField('tax', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="0"
              />
            </Field>

            <Field label="통화">
              <select
                className="input"
                value={preview.currency ?? 'KRW'}
                onChange={(e) => updateField('currency', e.target.value)}
              >
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
            </Field>

            <Field label="카테고리">
              <select
                className="input"
                value={preview.category ?? ''}
                onChange={(e) => updateField('category', e.target.value || null)}
              >
                <option value="">선택 안 함</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="메모">
            <textarea
              className="input resize-none h-20"
              value={preview.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value || null)}
              placeholder="메모 (선택)"
            />
          </Field>

          {/* Line items */}
          {preview.items && preview.items.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">품목</p>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {preview.items.map((item: LineItem, i: number) => (
                  <div key={i} className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-gray-700">{item.name}</span>
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

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setPhase('idle')}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              다시 업로드
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving ? '저장 중...' : '영수증 저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
