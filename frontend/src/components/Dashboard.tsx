import type { ReactNode } from 'react';
import { BookIcon, ChevronDownIcon, DownloadIcon, MoonIcon, RefreshIcon, SparkleIcon, SunIcon, UploadIcon } from './Icons';

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
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5 shrink-0">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm shadow-rose-600/30"
              style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #f59e0b)' }}
              aria-hidden="true"
            >
              <BookIcon className="h-6 w-6" />
            </div>
            <span
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm ring-2 ring-slate-50 dark:ring-slate-950"
              aria-hidden="true"
            >
              <SparkleIcon className="h-3 w-3" />
            </span>
          </div>
          <div>
            <h1 className="brand-title text-3xl sm:text-4xl">
              Webcomic Tracker
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Never forget where you stopped reading.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastSynced && (
            <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:inline">
              Last synced&nbsp;
              {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onToggleDarkMode} aria-label="Toggle dark mode">
            {darkMode ? <SunIcon /> : <MoonIcon />}
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <div className="relative">
            <details className="group">
              <summary className="btn btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <DownloadIcon />
                Import / Export
                <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="card animate-in absolute right-0 z-20 mt-1.5 w-48 p-1.5 text-sm">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={onExportJson}
                >
                  <DownloadIcon className="h-4 w-4 text-slate-400" /> Export JSON
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={onExportCsv}
                >
                  <DownloadIcon className="h-4 w-4 text-slate-400" /> Export CSV
                </button>
                <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <UploadIcon className="h-4 w-4 text-slate-400" /> Import JSON
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
