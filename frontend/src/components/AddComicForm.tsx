import { useState } from 'react';
import { parseChapterUrl, isLikelyUrl } from '../services/parser';
import type { ParsedChapterInfo } from '../types/Comic';

interface Props {
  onSubmit: (info: {
    title: string;
    chapter: number;
    url: string;
    website: string;
    domain: string;
  }) => Promise<void>;
  busy: boolean;
}

export function AddComicForm({ onSubmit, busy }: Props) {
  const [url, setUrl] = useState('');
  const [parsed, setParsed] = useState<ParsedChapterInfo | null>(null);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [website, setWebsite] = useState('');

  function handleUrlChange(value: string) {
    setUrl(value);
    if (!isLikelyUrl(value)) {
      setParsed(null);
      return;
    }
    const info = parseChapterUrl(value);
    setParsed(info);
    setTitle(info.title);
    setChapter(info.chapter !== null ? String(info.chapter) : '');
    setWebsite(info.website);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLikelyUrl(url)) return;
    const chapterNum = parseFloat(chapter);
    if (!title.trim() || isNaN(chapterNum)) return;
    const domain = parsed?.domain || '';
    await onSubmit({ title: title.trim(), chapter: chapterNum, url: url.trim(), website: website.trim(), domain });
    setUrl('');
    setParsed(null);
    setTitle('');
    setChapter('');
    setWebsite('');
  }

  const canSubmit = isLikelyUrl(url) && title.trim().length > 0 && chapter !== '' && !isNaN(parseFloat(chapter));

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5">
      <label htmlFor="chapter-url" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Paste latest chapter URL
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="chapter-url"
          type="url"
          inputMode="url"
          className="input flex-1 text-base"
          placeholder="https://example.com/manga/title/chapter-42/"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-primary sm:w-40" disabled={!canSubmit || busy}>
          {busy ? 'Saving…' : 'Add / Update'}
        </button>
      </div>

      {url && !isLikelyUrl(url) && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          That doesn't look like a valid URL yet — it should start with http:// or https://.
        </p>
      )}

      {parsed && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 sm:grid-cols-3">
          <div className="sm:col-span-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            Detected — correct anything that's wrong before saving
          </div>
          <Field label="Webcomic">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            {!parsed.titleDetected && (
              <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                Couldn't detect a title — please enter it manually.
              </span>
            )}
          </Field>
          <Field label="Chapter">
            <input
              className="input"
              type="number"
              step="0.5"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            />
            {!parsed.chapterDetected && (
              <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                Chapter number could not be detected. Enter it manually.
              </span>
            )}
          </Field>
          <Field label="Website">
            <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </Field>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      {children}
    </div>
  );
}
