import { useState } from 'react';
import type { Comic } from '../types/Comic';
import { HistoryIcon, PencilIcon, TrashIcon } from './Icons';
import { CoverImagePicker } from './CoverImagePicker';

interface Props {
  comic: Comic;
  onSave: (updates: Partial<Comic>) => Promise<void>;
  onClose: () => void;
  onHistory: (comic: Comic) => void;
  onDelete: (comic: Comic) => void;
  busy: boolean;
}

export function EditComicModal({ comic, onSave, onClose, onHistory, onDelete, busy }: Props) {
  const [title, setTitle] = useState(comic.title);
  const [chapter, setChapter] = useState(String(comic.chapter));
  const [url, setUrl] = useState(comic.url);
  const [website, setWebsite] = useState(comic.website);
  const [dateLastUpdated, setDateLastUpdated] = useState(comic.dateLastUpdated);
  const [notes, setNotes] = useState(comic.notes || '');
  const [coverImageUrl, setCoverImageUrl] = useState(comic.coverImageUrl || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chapterNum = parseFloat(chapter);
    if (!title.trim() || isNaN(chapterNum) || !url.trim()) return;
    await onSave({
      title: title.trim(), chapter: chapterNum, url: url.trim(), website: website.trim(),
      dateLastUpdated, notes: notes.trim(), coverImageUrl: coverImageUrl.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        className="card animate-in w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white">
            <PencilIcon className="h-4 w-4 text-rose-500" /> Edit comic
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="View history"
              className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
              onClick={() => onHistory(comic)}
              disabled={busy}
            >
              <HistoryIcon className="h-3.5 w-3.5" /> History
            </button>
            <button
              type="button"
              title="Delete"
              className="btn btn-danger !px-2.5 !py-1.5 text-xs"
              onClick={() => onDelete(comic)}
              disabled={busy}
            >
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Cover image</label>
            <CoverImagePicker value={coverImageUrl} onChange={setCoverImageUrl} filenameHint={title || 'cover'} size="sm" />
          </div>
          <LabeledInput label="Webcomic title" value={title} onChange={setTitle} required />
          <LabeledInput label="Chapter" type="number" step="0.5" value={chapter} onChange={setChapter} required />
          <LabeledInput label="Chapter URL" type="url" value={url} onChange={setUrl} required />
          <LabeledInput label="Website" value={website} onChange={setWebsite} />
          <LabeledInput label="Date last updated" type="date" value={dateLastUpdated} onChange={setDateLastUpdated} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Alternate source (optional)
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
        </div>
        <div className="mt-5 flex justify-end gap-2">
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
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <input
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
