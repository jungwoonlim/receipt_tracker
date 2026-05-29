import type {
  AnalyticsSummary,
  ListParams,
  Receipt,
  ReceiptCreate,
  ReceiptUpdate,
} from '../types/receipt';

// Empty string = same origin (Vercel routes /api/* to serverless fn)
// In dev, Vite proxy forwards /api/* to localhost:8000
const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ------- OCR -------
  async ocrReceipt(
    file: File,
    mode: 'receipt-extraction' | 'information-extract' = 'receipt-extraction',
  ): Promise<Receipt> {
    const form = new FormData();
    form.append('file', file);
    return request<Receipt>(`/api/receipts/ocr?mode=${mode}`, {
      method: 'POST',
      body: form,
    });
  },

  // ------- CRUD -------
  async createReceipt(data: ReceiptCreate): Promise<Receipt> {
    return request<Receipt>('/api/receipts/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async listReceipts(params?: ListParams): Promise<Receipt[]> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs}` : '';
    return request<Receipt[]>(`/api/receipts/${query}`);
  },

  async getReceipt(id: number): Promise<Receipt> {
    return request<Receipt>(`/api/receipts/${id}`);
  },

  async updateReceipt(id: number, data: ReceiptUpdate): Promise<Receipt> {
    return request<Receipt>(`/api/receipts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteReceipt(id: number): Promise<void> {
    return request<void>(`/api/receipts/${id}`, { method: 'DELETE' });
  },

  // ------- Analytics -------
  async getAnalytics(year: number, month?: number): Promise<AnalyticsSummary> {
    const qs = new URLSearchParams({ year: String(year) });
    if (month != null) qs.set('month', String(month));
    return request<AnalyticsSummary>(`/api/analytics/summary?${qs}`);
  },

  async getCategories(): Promise<string[]> {
    return request<string[]>('/api/analytics/categories');
  },
};
