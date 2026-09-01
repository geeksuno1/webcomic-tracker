import { useEffect, useState } from 'react';
import type { Comic } from '../types/Comic';
import type { HistoryEntry } from '../types/HistoryEntry';
import { formatDateReadable } from '../services/normalization';
import { api } from '../services/api';
import { HistoryIcon, XIcon } from './Icons';

interface Props {
  comic: Comic;
  onClose: () => void;
}

export function HistoryModal({ comic, onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    api
      .getHistory(comic.id)
      .then((data) => { if (!cancelled) setEntries(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load history.'); });
    return () => { cancelled = true; };
  }, [comic.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card animate-in w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white">
            <HistoryIcon className="h-4 w-4 text-indigo-500" /> {comic.title}
          </h3>
          <button type="button" className="btn btn-secondary !p-2" onClick={onClose} aria-label="Close">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {!error && entries === null && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading history…
            </div>
          )}
          {entries && entries.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No history recorded yet for this comic.</p>
          )}
          {entries && entries.map((h) => (
            <a
              key={h.id}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:border-indigo-900 dark:hover:bg-indigo-500/10"
            >
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-100">Chapter {h.chapter}</span>
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{h.website}</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateReadable(h.dateCompleted)}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
