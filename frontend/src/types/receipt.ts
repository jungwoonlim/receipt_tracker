export interface LineItem {
  name: string;
  qty?: number | null;
  price?: number | null;
}

export interface Receipt {
  id: number;
  vendor?: string | null;
  date?: string | null;       // ISO date string YYYY-MM-DD
  total?: number | null;
  tax?: number | null;
  currency: string;
  category?: string | null;
  items?: LineItem[] | null;
  notes?: string | null;
  image_url?: string | null;
  ocr_raw?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReceiptCreate = Omit<Receipt, 'id' | 'created_at' | 'updated_at'>;
export type ReceiptUpdate = Partial<ReceiptCreate>;

export interface ListParams {
  category?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export interface AnalyticsSummary {
  total_spend: number;
  by_category: Record<string, number>;
  monthly_series: { month: string; total: number }[];
}
