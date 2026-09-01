import { useEffect, useMemo, useState } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { DashboardShell } from './components/Dashboard';
import { StatsCards } from './components/StatsCards';
import { SearchAndFilters } from './components/SearchAndFilters';
import { AddComicForm } from './components/AddComicForm';
import { ComicTable } from './components/ComicTable';
import { EditComicModal } from './components/EditComicModal';
import { HistoryModal } from './components/HistoryModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ViewToggle, type ViewMode } from './components/ViewToggle';
import { AlphaIndex, firstLetterOf } from './components/AlphaIndex';
import { Pagination } from './components/Pagination';
import { api, ApiError } from './services/api';
import type { Comic, DateFilter, SortOption } from './types/Comic';
import { daysSince } from './services/normalization';
import { exportComicsAsCsv, exportComicsAsJson, parseImportedJson } from './services/export';
import { AlertIcon, RefreshIcon } from './components/Icons';

function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      /* ignore */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue];
}

function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('webcomic-tracker:dark');
      if (stored !== null) return stored === '1';
    } catch {
      /* ignore */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('webcomic-tracker:dark', dark ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

function AppInner() {
  const toast = useToast();
  const { dark, toggle } = useDarkMode();

  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sort, setSort] = useState<SortOption>('recently-updated');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);

  const [viewMode, setViewMode] = usePersistedState<ViewMode>('webcomic-tracker:view', 'list');
  const [pageSize, setPageSize] = usePersistedState<number>('webcomic-tracker:pageSize', 15);
  const [page, setPage] = useState(1);

  const [savingAdd, setSavingAdd] = useState(false);
  const [pendingLowerChapter, setPendingLowerChapter] = useState<null | {
    title: string; chapter: number; url: string; website: string; domain: string; coverImageUrl?: string; notes?: string; warning: string;
  }>(null);

  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyComic, setHistoryComic] = useState<Comic | null>(null);
  const [deletingComic, setDeletingComic] = useState<Comic | null>(null);

  async function loadComics(showToast = false) {
    setRefreshing(true);
    setLoadError(null);
    try {
      const data = await api.getComics();
      setComics(data);
      setLastSynced(new Date());
      if (showToast) toast.show('Refreshed from Google Sheets.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to load comics from Google Sheets.';
      setLoadError(message);
      toast.show(message, 'error');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const websites = useMemo(
    () => Array.from(new Set(comics.map((c) => c.website || c.domain).filter(Boolean))).sort(),
    [comics]
  );

  const visibleComics = useMemo(() => {
    let list = [...comics];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.website || '').toLowerCase().includes(q) ||
          (c.domain || '').toLowerCase().includes(q)
      );
    }

    if (websiteFilter) {
      list = list.filter((c) => (c.website || c.domain) === websiteFilter);
    }

    if (dateFilter === 'today') {
      list = list.filter((c) => daysSince(c.dateLastUpdated) === 0);
    } else if (dateFilter === 'week') {
      list = list.filter((c) => daysSince(c.dateLastUpdated) <= 7);
    } else if (['14', '30', '60', '90'].includes(dateFilter)) {
      const threshold = parseInt(dateFilter, 10);
      list = list.filter((c) => daysSince(c.dateLastUpdated) >= threshold);
    }

    list.sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'recently-updated':
          return daysSince(a.dateLastUpdated) - daysSince(b.dateLastUpdated);
        case 'least-recently-updated':
          return daysSince(b.dateLastUpdated) - daysSince(a.dateLastUpdated);
        case 'highest-chapter':
          return b.chapter - a.chapter;
        case 'lowest-chapter':
          return a.chapter - b.chapter;
        case 'website':
          return (a.website || a.domain).localeCompare(b.website || b.domain);
        default:
          return 0;
      }
    });

    return list;
  }, [comics, search, websiteFilter, dateFilter, sort]);

  const availableLetters = useMemo(
    () => new Set(visibleComics.map((c) => firstLetterOf(c.title))),
    [visibleComics]
  );

  const letteredComics = useMemo(
    () => (letterFilter ? visibleComics.filter((c) => firstLetterOf(c.title) === letterFilter) : visibleComics),
    [visibleComics, letterFilter]
  );

  const pageCount = Math.max(1, Math.ceil(letteredComics.length / pageSize));
  const pagedComics = useMemo(
    () => letteredComics.slice((page - 1) * pageSize, page * pageSize),
    [letteredComics, page, pageSize]
  );

  // Reset to page 1 whenever the underlying result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [search, websiteFilter, dateFilter, sort, letterFilter, pageSize]);

  // Clamp the current page if the result set shrinks below it (e.g. after a delete).
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  async function submitAddOrUpdate(
    info: { title: string; chapter: number; url: string; website: string; domain: string; coverImageUrl?: string; notes?: string },
    forceOverwrite = false
  ) {
    setSavingAdd(true);
    try {
      const result = await api.addOrUpdateComic({ ...info, forceOverwrite });
      if (result.status === 'needs_confirmation') {
        setPendingLowerChapter({ ...info, warning: result.warning || 'Replace the saved chapter?' });
        return;
      }
      setPendingLowerChapter(null);
      await loadComics();
      const verb = result.status === 'created' ? 'added' : result.status === 'refreshed' ? 'refreshed' : 'updated';
      toast.show(`"${result.comic.title}" ${verb} — Chapter ${result.comic.chapter}.`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to save your update. Please try again.';
      toast.show(message, 'error');
    } finally {
      setSavingAdd(false);
    }
  }

  async function handleEditSave(updates: Partial<Comic>) {
    if (!editingComic) return;
    setSavingEdit(true);
    try {
      await api.updateComic(editingComic.id, updates);
      await loadComics();
      toast.show('Comic updated successfully.', 'success');
      setEditingComic(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to save your update. Please try again.';
      toast.show(message, 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingComic) return;
    try {
      await api.deleteComic(deletingComic.id, false);
      setComics((prev) => prev.filter((c) => c.id !== deletingComic.id));
      toast.show(`"${deletingComic.title}" removed from your tracker.`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to delete this comic. Please try again.';
      toast.show(message, 'error');
    } finally {
      setDeletingComic(null);
    }
  }

  async function handleImportJson(file: File) {
    try {
      const text = await file.text();
      const items = parseImportedJson(text);
      if (items.length === 0) {
        toast.show('No valid comics found in that file.', 'error');
        return;
      }
      let created = 0;
      let updated = 0;
      for (const item of items) {
        const result = await api.addOrUpdateComic({
          title: item.title,
          chapter: item.chapter,
          url: item.url,
          website: item.website || '',
          domain: '',
          notes: item.notes,
          forceOverwrite: true,
        });
        if (result.status === 'created') created++;
        else updated++;
      }
      await loadComics();
      toast.show(`Import complete — ${created} added, ${updated} updated.`, 'success');
    } catch {
      toast.show('Unable to import that file. Make sure it is valid JSON exported from this tracker.', 'error');
    }
  }

  return (
    <DashboardShell
      darkMode={dark}
      onToggleDarkMode={toggle}
      lastSynced={lastSynced}
      onRefresh={() => loadComics(true)}
      refreshing={refreshing}
      onExportJson={() => exportComicsAsJson(comics)}
      onExportCsv={() => exportComicsAsCsv(comics)}
      onImportJson={handleImportJson}
    >
      {!api.isConfigured() && (
        <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong className="font-semibold">Backend not configured.</strong> Set <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">VITE_APPS_SCRIPT_URL</code> in your <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">.env</code> file
            to your deployed Google Apps Script Web App URL, then rebuild. See the README for setup steps.
          </p>
        </div>
      )}

      <AddComicForm comics={comics} onSubmit={(info) => submitAddOrUpdate(info)} busy={savingAdd} />

      <StatsCards comics={comics} />

      <SearchAndFilters
        search={search}
        onSearchChange={setSearch}
        websites={websites}
        websiteFilter={websiteFilter}
        onWebsiteFilterChange={setWebsiteFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        sort={sort}
        onSortChange={setSort}
      />

      {loading ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          Loading comics from Google Sheets…
        </div>
      ) : loadError ? (
        <div className="card flex flex-col items-center gap-3 border-rose-200 p-8 text-center text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
            <AlertIcon className="h-5 w-5" />
          </div>
          {loadError}
          <button type="button" className="btn btn-secondary" onClick={() => loadComics()}>
            <RefreshIcon className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      ) : (
        <>
          <AlphaIndex availableLetters={availableLetters} active={letterFilter} onSelect={setLetterFilter} />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {letteredComics.length} comic{letteredComics.length === 1 ? '' : 's'}
              {letterFilter ? ` starting with "${letterFilter}"` : ''}
            </p>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {letteredComics.length > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              totalItems={letteredComics.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}

          <ComicTable
            comics={pagedComics}
            view={viewMode}
            onEdit={setEditingComic}
          />
        </>
      )}

      {editingComic && (
        <EditComicModal
          comic={editingComic}
          onSave={handleEditSave}
          onClose={() => setEditingComic(null)}
          onHistory={(c) => {
            setEditingComic(null);
            setHistoryComic(c);
          }}
          onDelete={(c) => {
            setEditingComic(null);
            setDeletingComic(c);
          }}
          busy={savingEdit}
        />
      )}

      {historyComic && <HistoryModal comic={historyComic} onClose={() => setHistoryComic(null)} />}

      {deletingComic && (
        <ConfirmDialog
          title="Delete comic"
          message={`Delete "${deletingComic.title}" from your tracker? This removes it from the Comics sheet; its history is kept.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingComic(null)}
        />
      )}

      {pendingLowerChapter && (
        <ConfirmDialog
          title="Lower chapter number"
          message={pendingLowerChapter.warning}
          confirmLabel="Replace it"
          danger
          onConfirm={() => {
            const { warning, ...info } = pendingLowerChapter;
            void warning;
            submitAddOrUpdate(info, true);
          }}
          onCancel={() => setPendingLowerChapter(null)}
        />
      )}
    </DashboardShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
