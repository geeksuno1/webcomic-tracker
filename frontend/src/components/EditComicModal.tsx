import { useId, useState } from 'react';
import type { Comic } from '../types/Comic';
import { COMIC_STATUSES, STATUS_LABELS } from '../types/Comic';
import { HistoryIcon, LockIcon, PencilIcon, TrashIcon } from './Icons';
import { CoverImagePicker } from './CoverImagePicker';
import { CoverPositionAdjuster } from './CoverPositionAdjuster';

interface Props {
  comic: Comic;
  onSave: (updates: Partial<Comic>) => Promise<void>;
  onClose: () => void;
  onHistory: (comic: Comic) => void;
  onDelete: (comic: Comic) => void;
  busy: boolean;
  /** True only while the Vault is unlocked; shows the "Keep in the Vault" switch. */
  vaultAvailable?: boolean;
}

export function EditComicModal({ comic, onSave, onClose, onHistory, onDelete, busy, vaultAvailable = false }: Props) {
  const [title, setTitle] = useState(comic.title);
  const [altTitle, setAltTitle] = useState(comic.altTitle || '');
  const [useAlt, setUseAlt] = useState(!!comic.useAltTitle);
  const [chapter, setChapter] = useState(String(comic.chapter));
  const [url, setUrl] = useState(comic.url);
  const [website, setWebsite] = useState(comic.website);
  const [dateLastUpdated, setDateLastUpdated] = useState(comic.dateLastUpdated);
  const [notes, setNotes] = useState(comic.notes || '');
  const [coverImageUrl, setCoverImageUrl] = useState(comic.coverImageUrl || '');
  const [coverPosition, setCoverPosition] = useState(comic.coverPosition ?? 50);
  const [status, setStatus] = useState<Comic['status']>(comic.status || 'Reading');
  const [inVault, setInVault] = useState(!!comic.inVault);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chapterNum = parseFloat(chapter);
    if (!title.trim() || isNaN(chapterNum) || !url.trim()) return;
    await onSave({
      title: title.trim(), altTitle: altTitle.trim(), useAltTitle: useAlt && !!altTitle.trim(),
      chapter: chapterNum, url: url.trim(), website: website.trim(),
      dateLastUpdated, notes: notes.trim(), coverImageUrl: coverImageUrl.trim(), status, coverPosition,
      // Only sent when it actually changed, so ordinary edits never touch vault membership.
      ...(vaultAvailable && inVault !== !!comic.inVault ? { inVault } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        className="card animate-in flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ink/10 px-4 py-3 dark:border-white/10">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <PencilIcon className="h-4 w-4 text-accent" /> Edit comic
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="View history"
              className="btn btn-secondary !px-2 !py-1 text-xs"
              onClick={() => onHistory(comic)}
              disabled={busy}
            >
              <HistoryIcon className="h-3.5 w-3.5" /> History
            </button>
            <button
              type="button"
              title="Delete"
              className="btn btn-danger !px-2 !py-1 text-xs"
              onClick={() => onDelete(comic)}
              disabled={busy}
            >
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Cover Art</label>
            <CoverImagePicker value={coverImageUrl} onChange={setCoverImageUrl} filenameHint={title || 'cover'} size="sm" />
          </div>
          {coverImageUrl && (
            <CoverPositionAdjuster
              coverImageUrl={coverImageUrl}
              position={coverPosition}
              onChange={setCoverPosition}
            />
          )}
          <LabeledInput label="URL Title" value={title} onChange={setTitle} required />
          <p className="-mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            Taken from the chapter link. New chapters are matched to this series by it, so only change it if the link's title changed.
          </p>
          <div>
            <LabeledInput label="Alternate Title (optional)" value={altTitle} onChange={setAltTitle} />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Your own name for the series, used for display only.
            </p>
          </div>
          <fieldset className="rounded-lg border border-ink/10 p-2.5 dark:border-white/10">
            <legend className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">Show this title in the app</legend>
            <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-slate-800 dark:text-slate-100">
              <input type="radio" name="title-mode" className="h-4 w-4 accent-accent" checked={!useAlt || !altTitle.trim()} onChange={() => setUseAlt(false)} />
              <span className="min-w-0 truncate">URL title — {title.trim() || '…'}</span>
            </label>
            <label className={`flex items-center gap-2 py-0.5 text-sm ${altTitle.trim() ? 'cursor-pointer text-slate-800 dark:text-slate-100' : 'cursor-not-allowed text-slate-400 dark:text-slate-500'}`}>
              <input type="radio" name="title-mode" className="h-4 w-4 accent-accent" disabled={!altTitle.trim()} checked={useAlt && !!altTitle.trim()} onChange={() => setUseAlt(true)} />
              <span className="min-w-0 truncate">Alternate title{altTitle.trim() ? ` — ${altTitle.trim()}` : ' (type one above first)'}</span>
            </label>
          </fieldset>
          <LabeledInput label="Chapter" type="number" step="0.5" value={chapter} onChange={setChapter} required />
          <LabeledInput label="Latest Chapter Link" type="url" value={url} onChange={setUrl} required />
          <LabeledInput label="Source" value={website} onChange={setWebsite} />
          <LabeledInput label="Last Dropped On" type="date" value={dateLastUpdated} onChange={setDateLastUpdated} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Journey Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as Comic['status'])}
            >
              {COMIC_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Backup Portal (optional)
            </label>
            <input
              className="input"
              type="url"
              inputMode="url"
              placeholder="Backup link — a mirror site, raw scans, a Discord post…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Shown as an "Alt" link next to Open when filled in.
            </p>
          </div>
          {vaultAvailable && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/5 p-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-accent"
                checked={inVault}
                onChange={(e) => setInVault(e.target.checked)}
              />
              <span className="text-xs">
                <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-100">
                  <LockIcon className="h-3.5 w-3.5 text-accent" /> Keep in the Vault
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Hidden from the library, stats, search and exports until the Vault is unlocked.
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-ink/10 px-4 py-3 dark:border-white/10">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function LabeledInput({
  label, value, onChange, type = 'text', step, required,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; step?: string; required?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <input
        id={id}
        className="input"
        type={type}
        step={step}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
