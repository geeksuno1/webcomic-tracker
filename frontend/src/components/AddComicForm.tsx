import { useEffect, useMemo, useRef, useState } from 'react';
import { parseChapterUrl, isLikelyUrl } from '../services/parser';
import { api } from '../services/api';
import { normalizeTitle } from '../services/normalization';
import type { Comic, ParsedChapterInfo } from '../types/Comic';
import { SparkleIcon } from './Icons';
import { CoverImagePicker } from './CoverImagePicker';

interface Props {
  comics: Comic[];
  onSubmit: (info: {
    title: string;
    chapter: number;
    url: string;
    website: string;
    domain: string;
    coverImageUrl: string;
    notes: string;
  }) => Promise<void>;
  busy: boolean;
}

export function AddComicForm({ comics, onSubmit, busy }: Props) {
  const [url, setUrl] = useState('');
  const [parsed, setParsed] = useState<ParsedChapterInfo | null>(null);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [website, setWebsite] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverAutoLoading, setCoverAutoLoading] = useState(false);
  const [altSource, setAltSource] = useState('');
  const coverRequestId = useRef(0);

  const existingByNormalizedTitle = useMemo(() => {
    const map = new Map<string, Comic>();
    for (const c of comics) map.set(c.normalizedTitle || normalizeTitle(c.title), c);
    return map;
  }, [comics]);

  const matchedExisting = title.trim() ? existingByNormalizedTitle.get(normalizeTitle(title)) : undefined;
  const isNewEntry = !matchedExisting;

  // Pre-fill the alternate-source field from the matched comic's existing Notes so an
  // update doesn't accidentally wipe it out; clears back out for a genuinely new entry.
  useEffect(() => {
    setAltSource(matchedExisting?.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedExisting?.id]);

  function handleUrlChange(value: string) {
    setUrl(value);
    setCoverImageUrl('');
    if (!isLikelyUrl(value)) {
      setParsed(null);
      setCoverAutoLoading(false);
      setAltSource('');
      return;
    }
    const info = parseChapterUrl(value);
    setParsed(info);
    setTitle(info.title);
    setChapter(info.chapter !== null ? String(info.chapter) : '');
    setWebsite(info.website);
  }

  // Debounced server-side cover image lookup whenever the URL settles. If it
  // can't find one, the user can still upload or paste an image manually.
  useEffect(() => {
    if (!isLikelyUrl(url) || !isNewEntry) return;
    const requestId = ++coverRequestId.current;
    setCoverAutoLoading(true);
    const timer = setTimeout(async () => {
      const found = await api.fetchCoverImage(url.trim());
      if (coverRequestId.current !== requestId) return; // a newer URL was typed meanwhile
      setCoverAutoLoading(false);
      if (found) setCoverImageUrl(found);
    }, 600);
    return () => clearTimeout(timer);
  }, [url, isNewEntry]);

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
      notes: altSource.trim(),
    });
    setUrl('');
    setParsed(null);
    setTitle('');
    setChapter('');
    setWebsite('');
    setCoverImageUrl('');
    setAltSource('');
  }

  const canSubmit = isLikelyUrl(url) && title.trim().length > 0 && chapter !== '' && !isNaN(parseFloat(chapter));

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5">
      <label htmlFor="chapter-url" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <SparkleIcon className="h-4 w-4 text-rose-500" />
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
        <div className="animate-in mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          {isNewEntry ? (
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Cover — auto-detected when possible, or upload / paste your own
              </div>
              <CoverImagePicker
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                autoLoading={coverAutoLoading}
                filenameHint={title || 'cover'}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              This will update <span className="font-medium text-slate-700 dark:text-slate-200">{matchedExisting?.title}</span> to the new chapter. Its existing cover is kept — edit it later from the comic's row if you want to change it.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            <div className="sm:col-span-3">
              <Field label="Alternate source (optional)">
                <input
                  className="input"
                  type="url"
                  inputMode="url"
                  placeholder="Backup link — a mirror site, raw scans, a Discord post…"
                  value={altSource}
                  onChange={(e) => setAltSource(e.target.value)}
                />
              </Field>
            </div>
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
