import { useState } from 'react';
import type { Comic } from '../types/Comic';

interface Props {
  comic: Comic;
  onSave: (updates: Partial<Comic>) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}

export function EditComicModal({ comic, onSave, onClose, busy }: Props) {
  const [title, setTitle] = useState(comic.title);
  const [chapter, setChapter] = useState(String(comic.chapter));
  const [url, setUrl] = useState(comic.url);
  const [website, setWebsite] = useState(comic.website);
  const [dateLastUpdated, setDateLastUpdated] = useState(comic.dateLastUpdated);
  const [notes, setNotes] = useState(comic.notes || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chapterNum = parseFloat(chapter);
    if (!title.trim() || isNaN(chapterNum) || !url.trim()) return;
    await onSave({ title: title.trim(), chapter: chapterNum, url: url.trim(), website: website.trim(), dateLastUpdated, notes });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="text-base font-semibold">Edit comic</h3>
        <div className="mt-4 space-y-3">
          <LabeledInput label="Webcomic title" value={title} onChange={setTitle} required />
          <LabeledInput label="Chapter" type="number" step="0.5" value={chapter} onChange={setChapter} required />
          <LabeledInput label="Chapter URL" type="url" value={url} onChange={setUrl} required />
          <LabeledInput label="Website" value={website} onChange={setWebsite} />
          <LabeledInput label="Date last updated" type="date" value={dateLastUpdated} onChange={setDateLastUpdated} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Notes</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
