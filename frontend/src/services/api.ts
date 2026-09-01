import type { Comic } from '../types/Comic';
import type { HistoryEntry } from '../types/HistoryEntry';
import type { APIResponse, AddOrUpdateResult } from '../types/APIResponse';

// Set this to your deployed Google Apps Script Web App URL.
// e.g. https://script.google.com/macros/s/AKfycb.../exec
const APPS_SCRIPT_URL: string =
  (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) || '';

export class ApiError extends Error {}

function assertConfigured() {
  if (!APPS_SCRIPT_URL) {
    throw new ApiError(
      'The Apps Script backend URL is not configured. Set VITE_APPS_SCRIPT_URL in your .env file.'
    );
  }
}

async function get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  assertConfigured();
  const qs = new URLSearchParams({ action, ...params }).toString();
  let res: Response;
  try {
    res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { method: 'GET' });
  } catch {
    throw new ApiError('Could not reach the Google Sheets backend. Check your network connection.');
  }
  return handleResponse<T>(res);
}

async function post<T>(action: string, data: unknown): Promise<T> {
  assertConfigured();
  let res: Response;
  try {
    res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
      body: JSON.stringify({ action, data }),
    });
  } catch {
    throw new ApiError('Could not reach the Google Sheets backend. Check your network connection.');
  }
  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError(`Backend responded with HTTP ${res.status}. The Apps Script deployment may be misconfigured.`);
  }
  let json: APIResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('The backend returned an unexpected response. Check the Apps Script deployment.');
  }
  if (!json.success) {
    throw new ApiError(json.error || 'The backend reported an unknown error.');
  }
  return json.data as T;
}

export const api = {
  isConfigured(): boolean {
    return !!APPS_SCRIPT_URL;
  },

  async getComics(): Promise<Comic[]> {
    return get<Comic[]>('getComics');
  },

  async getComic(id: string): Promise<Comic | null> {
    return get<Comic | null>('getComic', { id });
  },

  async getHistory(comicId: string): Promise<HistoryEntry[]> {
    return get<HistoryEntry[]>('getHistory', { comicId });
  },

  /** Asks the backend to fetch the page and pull a cover image URL out of it. */
  async fetchCoverImage(url: string): Promise<string> {
    try {
      const result = await get<{ url: string }>('fetchCoverImage', { url });
      return result?.url || '';
    } catch {
      return '';
    }
  },

  /** Uploads a pasted/selected image to Drive and returns its direct-embed URL. */
  async uploadCoverImage(imageBase64: string, mimeType: string, filename?: string): Promise<{ url: string; fileId: string }> {
    return post<{ url: string; fileId: string }>('uploadCoverImage', { imageBase64, mimeType, filename });
  },

  async addOrUpdateComic(data: {
    title: string;
    chapter: number;
    url: string;
    website: string;
    domain: string;
    notes?: string;
    coverImageUrl?: string;
    status?: Comic['status'];
    forceOverwrite?: boolean;
  }): Promise<AddOrUpdateResult> {
    return post<AddOrUpdateResult>('addOrUpdateComic', data);
  },

  async updateComic(id: string, data: Partial<Comic>): Promise<Comic> {
    return post<Comic>('updateComic', { id, ...data });
  },

  async deleteComic(id: string, deleteHistory = false): Promise<{ id: string; deleted: boolean }> {
    return post<{ id: string; deleted: boolean }>('deleteComic', { id, deleteHistory });
  },
};
