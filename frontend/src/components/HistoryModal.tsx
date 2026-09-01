import { useEffect, useState } from 'react';
import type { Comic } from '../types/Comic';
import type { HistoryEntry } from '../types/HistoryEntry';
import { formatDateReadable } from '../services/normalization';
import { api } from '../services/api';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{comic.title}</h3>
          <button type="button" className="btn btn-secondary !px-2 !py-1" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {!error && entries === null && <p className="text-sm text-slate-500 dark:text-slate-400">Loading history…</p>}
          {entries && entries.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No history recorded yet for this comic.</p>
          )}
          {entries && entries.map((h) => (
            <a
              key={h.id}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
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
