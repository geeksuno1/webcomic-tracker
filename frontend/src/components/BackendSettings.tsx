import { useState } from 'react';
import {
  clearSavedApiUrl, getApiUrl, getSavedApiUrl, hasBuildTimeUrl,
  normalizeApiUrl, saveApiUrl, testApiUrl,
} from '../services/api';
import { CheckCircleIcon, AlertIcon, LinkIcon } from './Icons';

interface Props {
  /** Called after a URL is saved or reset, so the app can reload its data. */
  onChanged: () => void;
  /** Start expanded (used on the error / not-configured screens). */
  defaultOpen?: boolean;
}

/**
 * Lets the user paste and save their Apps Script Web app URL from inside the app,
 * overriding the build-time value. Saved in this browser only.
 */
export function BackendSettings({ onChanged, defaultOpen = false }: Props) {
  const [value, setValue] = useState(getSavedApiUrl() || getApiUrl());
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const usingSaved = !!getSavedApiUrl();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { url, error } = normalizeApiUrl(value);
    if (error) {
      setStatus({ ok: false, message: error });
      return;
    }
    setBusy(true);
    const result = await testApiUrl(url);
    setBusy(false);
    // Save even if the test fails (the user may be offline or fixing the deployment),
    // but say so plainly.
    saveApiUrl(url);
    setValue(url);
    setStatus(
      result.ok
        ? { ok: true, message: `Saved. ${result.message}` }
        : { ok: false, message: `Saved, but the test failed: ${result.message}` }
    );
    onChanged();
  }

  function handleReset() {
    clearSavedApiUrl();
    setValue(getApiUrl());
    setStatus({
      ok: true,
      message: hasBuildTimeUrl()
        ? 'Saved URL removed. Using the URL built into this site.'
        : 'Saved URL removed. No URL is set now.',
    });
    onChanged();
  }

  return (
    <details className="card group p-4 sm:p-5" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
        <LinkIcon className="h-4 w-4 text-accent" />
        Backend connection
        <span className="ml-auto text-xs font-normal text-slate-400 group-open:hidden dark:text-slate-500">
          {usingSaved ? 'Using saved URL' : 'Using built-in URL'}
        </span>
      </summary>

      <form onSubmit={handleSave} className="mt-3 space-y-2">
        <label
          htmlFor="apps-script-url"
          className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Apps Script web app URL
        </label>
        <input
          id="apps-script-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="input"
          placeholder="https://script.google.com/macros/s/…/exec"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn w-full bg-ink text-white hover:bg-black dark:bg-white dark:text-ink" disabled={busy}>
          {busy ? 'Testing…' : 'Save URL'}
        </button>
        {usingSaved && (
          <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={handleReset}>
            Remove saved URL{hasBuildTimeUrl() ? ' and use the built-in one' : ''}
          </button>
        )}
        {status && (
          <p
            role="status"
            className={`flex items-start gap-1.5 text-xs ${
              status.ok ? 'text-leaf' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {status.ok ? (
              <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            {status.message}
          </p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Copy it from Apps Script → Deploy → Manage deployments. It&apos;s stored in this browser only and
          overrides the URL built into the site.
        </p>
      </form>
    </details>
  );
}
