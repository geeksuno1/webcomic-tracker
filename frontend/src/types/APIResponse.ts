export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface AddOrUpdateResult {
  comic: import('./Comic').Comic;
  status: 'created' | 'updated' | 'refreshed' | 'needs_confirmation';
  warning: string | null;
}
