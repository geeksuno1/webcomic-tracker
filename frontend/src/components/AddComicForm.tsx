import { useEffect, useRef, useState } from 'react';
import { parseChapterUrl, isLikelyUrl } from '../services/parser';
import { api } from '../services/api';
import type { ParsedChapterInfo } from '../types/Comic';
import { ImageOffIcon, SparkleIcon } from './Icons';

interface Props {
  onSubmit: (info: {
    title: string;
    chapter: number;
    url: string;
    website: string;
    domain: string;
    coverImageUrl: string;
  }) => Promise<void>;
  busy: boolean;
}

export function AddComicForm({ onSubmit, busy }: Props) {
  const [url, setUrl] = useState('');
  const [parsed, setParsed] = useState<ParsedChapterInfo | null>(null);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [website, setWebsite] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const coverRequestId = useRef(0);

  function handleUrlChange(value: string) {
    setUrl(value);
    setCoverImageUrl('');
    setCoverFailed(false);
    if (!isLikelyUrl(value)) {
      setParsed(null);
      setCoverLoading(false);
      return;
    }
    const info = parseChapterUrl(value);
    setParsed(info);
    setTitle(info.title);
    setChapter(info.chapter !== null ? String(info.chapter) : '');
    setWebsite(info.website);
  }

  // Debounced server-side cover image lookup whenever the URL settles.
  useEffect(() => {
    if (!isLikelyUrl(url)) return;
    const requestId = ++coverRequestId.current;
    setCoverLoading(true);
    setCoverFailed(false);
    const timer = setTimeout(async () => {
      const found = await api.fetchCoverImage(url.trim());
      if (coverRequestId.current !== requestId) return; // a newer URL was typed meanwhile
      setCoverLoading(false);
      if (found) {
        setCoverImageUrl(found);
      } else {
        setCoverFailed(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [url]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLikelyUrl(url)) return;
    const chapterNum = parseFloat(chapter);
    if (!title.trim() || isNaN(chapterNum)) return;
    const domain = parsed?.domain || '';
    await onSubmit({
      title: title.trim(),
      chapter: chapterNum,
      url: url.trim(),
      website: website.trim(),
      domain,
      coverImageUrl: coverImageUrl.trim(),
    });
    setUrl('');
    setParsed(null);
    setTitle('');
    setChapter('');
    setWebsite('');
    setCoverImageUrl('');
    setCoverFailed(false);
  }

  const canSubmit = isLikelyUrl(url) && title.trim().length > 0 && chapter !== '' && !isNaN(parseFloat(chapter));

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5">
      <label htmlFor="chapter-url" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <SparkleIcon className="h-4 w-4 text-indigo-500" />
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
        <div className="animate-in mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row">
          <div className="flex sm:w-28 sm:shrink-0 sm:flex-col sm:items-start">
            <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:hidden">Cover</div>
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => { setCoverImageUrl(''); setCoverFailed(true); }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                  {coverLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ImageOffIcon className="h-6 w-6" />
                  )}
                </div>
              )}
            </div>
            <input
              className="input mt-2 !py-1 text-xs"
              placeholder="Cover image URL"
              value={coverImageUrl}
              onChange={(e) => { setCoverImageUrl(e.target.value); setCoverFailed(false); }}
            />
            {coverFailed && !coverImageUrl && (
              <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
                No cover found — paste one manually if you like.
              </span>
            )}
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
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
