export interface ImportProgress {
  importId: string;
  status: 'preparing' | 'processing' | 'validating' | 'importing' | 'completed' | 'error';
  progress: number;
  message: string;
  rows_processed?: number;
  total_rows?: number;
  errors?: string[];
}

// In-memory storage for import progress (in production, use Redis or database)
export const importProgress: Map<string, ImportProgress> = new Map();
