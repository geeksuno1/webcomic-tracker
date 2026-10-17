import type { Comic } from '../types/Comic';
import type { HistoryEntry } from '../types/HistoryEntry';
import type { APIResponse, AddOrUpdateResult } from '../types/APIResponse';

// The backend URL can come from two places, in this order:
//  1. A URL saved from inside the app (stored in this browser's localStorage), so a
//     wrong/replaced deployment can be fixed without rebuilding the site.
//  2. The VITE_APPS_SCRIPT_URL build-time value (e.g. a GitHub Actions secret).
// e.g. https://script.google.com/macros/s/AKfycb.../exec
const URL_STORAGE_KEY = 'webcomic-tracker:apiUrl';
const BUILD_TIME_URL: string =
  (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) || '';

function readSavedUrl(): string {
  try {
    return localStorage.getItem(URL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/** The URL requests are currently sent to. */
export function getApiUrl(): string {
  return readSavedUrl() || BUILD_TIME_URL;
}

export function getSavedApiUrl(): string {
  return readSavedUrl();
}

export function hasBuildTimeUrl(): boolean {
  return !!BUILD_TIME_URL;
}

export function saveApiUrl(url: string) {
  localStorage.setItem(URL_STORAGE_KEY, url);
}

export function clearSavedApiUrl() {
  try {
    localStorage.removeItem(URL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Cleans up a pasted deployment URL (trims whitespace, drops the browser's
 * "/u/1/" account segment) and checks it looks like an Apps Script web app URL.
 */
export function normalizeApiUrl(raw: string): { url: string; error: string | null } {
  let url = raw.trim().replace(/^["']|["']$/g, '');
  if (!url) return { url: '', error: 'Paste your Apps Script Web app URL first.' };
  url = url.replace(/\/macros\/u\/\d+\//, '/macros/').replace(/[?#].*$/, '');
  if (!/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[^/]+\/exec$/.test(url)) {
    return {
      url,
      error:
        'That doesn\u2019t look like a Web app URL. It should look like https://script.google.com/macros/s/\u2026/exec (copy it from Deploy \u2192 Manage deployments).',
    };
  }
  return { url, error: null };
}

/** Calls the backend at `url` and reports whether it answers like this app's Apps Script. */
export async function testApiUrl(url: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${url}?action=getComics`, { method: 'GET' });
    if (!res.ok) {
      return { ok: false, message: `Google responded with HTTP ${res.status}. This deployment may be deleted, or its access isn\u2019t set to \u201cAnyone\u201d.` };
    }
    const json = await res.json();
    if (json && json.success) {
      const n = Array.isArray(json.data) ? json.data.length : 0;
      return { ok: true, message: `Connected \u2014 found ${n} comic${n === 1 ? '' : 's'}.` };
    }
    return { ok: false, message: json?.error || 'The backend answered but reported an error.' };
  } catch {
    return { ok: false, message: 'Could not reach that URL. Check the address, your connection, and that access is set to \u201cAnyone\u201d.' };
  }
}

export class ApiError extends Error {}

// ---- Vault session -------------------------------------------------------
// The vault token lives in memory only (never localStorage), so closing or
// reloading the tab always re-locks the vault. When set, it rides along on every
// POST; the backend only honours it for vault titles.
let vaultToken = '';
let onVaultExpired: (() => void) | null = null;

export function setVaultToken(token: string) {
  vaultToken = token;
}
export function setVaultExpiredHandler(fn: (() => void) | null) {
  onVaultExpired = fn;
}

function assertConfigured() {
  if (!getApiUrl()) {
    throw new ApiError(
      'The Apps Script backend URL is not set. Add it under \u201cBackend connection\u201d.'
    );
  }
}

async function get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  assertConfigured();
  const qs = new URLSearchParams({ action, ...params }).toString();
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}?${qs}`, { method: 'GET' });
  } catch {
    throw new ApiError('Could not reach the Google Sheets backend. Check your network connection.');
  }
  return handleResponse<T>(res);
}

async function post<T>(action: string, data: unknown): Promise<T> {
  assertConfigured();
  let res: Response;
  try {
    res = await fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
      body: JSON.stringify({ action, data: vaultToken && data && typeof data === 'object' ? { ...(data as object), vaultToken } : data }),
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
    if (vaultToken && /^The vault is locked/i.test(json.error || '')) onVaultExpired?.();
    throw new ApiError(json.error || 'The backend reported an unknown error.');
  }
  return json.data as T;
}

export const api = {
  isConfigured(): boolean {
    return !!getApiUrl();
  },

  async getComics(): Promise<Comic[]> {
    return get<Comic[]>('getComics');
  },

  async getComic(id: string): Promise<Comic | null> {
    return get<Comic | null>('getComic', { id });
  },

  async getHistory(comicId: string): Promise<HistoryEntry[]> {
    // POST so the vault token (if any) never appears in a URL. Falls back to GET
    // if the backend hasn't been redeployed with the POST action yet.
    try {
      return await post<HistoryEntry[]>('getHistory', { comicId });
    } catch (err) {
      if (err instanceof ApiError && /unknown or missing action/i.test(err.message)) {
        return get<HistoryEntry[]>('getHistory', { comicId });
      }
      throw err;
    }
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
    inVault?: boolean;
    altTitle?: string;
    useAltTitle?: boolean;
  }): Promise<AddOrUpdateResult> {
    return post<AddOrUpdateResult>('addOrUpdateComic', data);
  },

  async updateComic(id: string, data: Partial<Comic>): Promise<Comic> {
    return post<Comic>('updateComic', { id, ...data });
  },

  /** Toggles favorite on its own — never touches title/chapter/status/etc. */
  async setFavorite(id: string, isFavorite: boolean): Promise<Comic> {
    return post<Comic>('updateComic', { id, isFavorite });
  },

  async deleteComic(id: string, deleteHistory = false): Promise<{ id: string; deleted: boolean }> {
    return post<{ id: string; deleted: boolean }>('deleteComic', { id, deleteHistory });
  },

  // ---- Vault -------------------------------------------------------------

  async vaultStatus(): Promise<{ configured: boolean }> {
    return post<{ configured: boolean }>('vaultStatus', {});
  },

  async vaultSetup(password: string): Promise<{ token: string; idleSeconds: number }> {
    return post('vaultSetup', { password });
  },

  async vaultUnlock(password: string): Promise<{ token: string; idleSeconds: number }> {
    return post('vaultUnlock', { password });
  },

  async vaultLock(): Promise<void> {
    try {
      await post('vaultLock', {});
    } catch {
      /* the session expires on its own anyway */
    }
  },

  async vaultList(): Promise<Comic[]> {
    return post<Comic[]>('vaultList', {});
  },

  async vaultChangePassword(oldPassword: string, newPassword: string): Promise<{ token: string; idleSeconds: number }> {
    return post('vaultChangePassword', { oldPassword, newPassword });
  },
};
