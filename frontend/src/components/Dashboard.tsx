import type { ReactNode } from 'react';

interface Props {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lastSynced: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImportJson: (file: File) => void;
  children: ReactNode;
}

export function DashboardShell({
  darkMode, onToggleDarkMode, lastSynced, onRefresh, refreshing,
  onExportJson, onExportCsv, onImportJson, children,
}: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Webcomic Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Never forget where you stopped reading.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastSynced && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Last synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onToggleDarkMode} aria-label="Toggle dark mode">
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <div className="relative">
            <details className="group">
              <summary className="btn btn-secondary cursor-pointer list-none">Import / Export ▾</summary>
              <div className="card absolute right-0 z-20 mt-1 w-44 p-1 text-sm">
                <button type="button" className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onExportJson}>
                  Export JSON
                </button>
                <button type="button" className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onExportCsv}>
                  Export CSV
                </button>
                <label className="block w-full cursor-pointer rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onImportJson(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}
