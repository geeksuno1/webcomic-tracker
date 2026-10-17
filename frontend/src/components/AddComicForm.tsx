import { useEffect, useMemo, useRef, useState } from 'react';
import { displayTitle } from '../types/Comic';
import { parseChapterUrl, isLikelyUrl } from '../services/parser';
import { api } from '../services/api';
import { normalizeTitle } from '../services/normalization';
import type { Comic, ParsedChapterInfo } from '../types/Comic';
import { SparkleIcon } from './Icons';
import { CoverImagePicker } from './CoverImagePicker';

const NEW_SERIES = '__new__';

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
    altTitle?: string;
    useAltTitle?: boolean;
  }) => Promise<void>;
  busy: boolean;
  /** When true the entry is saved straight into the Vault (shown only while it is unlocked). */
  vaultMode?: boolean;
}

export function AddComicForm({ comics, onSubmit, busy, vaultMode = false }: Props) {
  const [url, setUrl] = useState('');
  const [parsed, setParsed] = useState<ParsedChapterInfo | null>(null);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [website, setWebsite] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverAutoLoading, setCoverAutoLoading] = useState(false);
  const [altSource, setAltSource] = useState('');
  const [altTitle, setAltTitle] = useState('');
  // Sites with opaque links (WeebCentral): which saved series this chapter belongs to.
  // '' = not chosen yet, NEW_SERIES = create one, otherwise the id of an existing comic.
  const [seriesChoice, setSeriesChoice] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  const coverRequestId = useRef(0);

  const existingByNormalizedTitle = useMemo(() => {
    const map = new Map<string, Comic>();
    for (const c of comics) map.set(c.normalizedTitle || normalizeTitle(c.title), c);
    return map;
  }, [comics]);

  const opaque = !!parsed?.titleIsOpaque;
  const siteSeries = useMemo(
    () =>
      parsed?.titleIsOpaque
        ? comics.filter((c) => c.domain === parsed.domain).sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)))
        : [],
    [comics, parsed?.titleIsOpaque, parsed?.domain]
  );
  const chosenSeries = siteSeries.find((c) => c.id === seriesChoice);
  // The name new chapters are matched on: read from the link normally; for opaque sites it
  // comes from the series the user picked (its saved URL title) or the name they typed.
  const effectiveTitle = opaque
    ? chosenSeries ? chosenSeries.title : seriesChoice === NEW_SERIES ? newSeriesName.trim() : ''
    : title.trim();

  const matchedExisting = effectiveTitle ? existingByNormalizedTitle.get(normalizeTitle(effectiveTitle)) : undefined;
  const isNewEntry = !matchedExisting;

  // Pre-fill the alternate-source field from the matched comic's existing Notes so an
  // update doesn't accidentally wipe it out; clears back out for a genuinely new entry.
  useEffect(() => {
    setAltSource(matchedExisting?.notes || '');
    setAltTitle(matchedExisting?.altTitle || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedExisting?.id]);

  function handleUrlChange(value: string) {
    setUrl(value);
    setCoverImageUrl('');
    if (!isLikelyUrl(value)) {
      setParsed(null);
      setCoverAutoLoading(false);
      setAltSource('');
      setAltTitle('');
      setSeriesChoice('');
      setNewSeriesName('');
      return;
    }
    const info = parseChapterUrl(value);
    setParsed(info);
    setSeriesChoice('');
    setNewSeriesName('');
    setTitle(info.titleIsOpaque ? '' : info.title);
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
    if (!effectiveTitle || isNaN(chapterNum)) return;
    const domain = parsed?.domain || '';
    // Only send the alternate title when it was changed here, so a plain chapter update never touches it.
    const altChanged = altTitle.trim() !== (matchedExisting?.altTitle || '');
    await onSubmit({
      title: effectiveTitle,
      chapter: chapterNum,
      url: url.trim(),
      website: website.trim(),
      domain,
      coverImageUrl: coverImageUrl.trim(),
      notes: altSource.trim(),
      ...(altChanged ? { altTitle: altTitle.trim(), useAltTitle: !!altTitle.trim() } : {}),
    });
    setUrl('');
    setParsed(null);
    setTitle('');
    setChapter('');
    setWebsite('');
    setCoverImageUrl('');
    setAltSource('');
    setAltTitle('');
    setSeriesChoice('');
    setNewSeriesName('');
  }

  const canSubmit = isLikelyUrl(url) && effectiveTitle.length > 0 && chapter !== '' && !isNaN(parseFloat(chapter));

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5">
      <label htmlFor="chapter-url" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <SparkleIcon className="h-4 w-4 text-accent" />
        {vaultMode ? 'Log to the Vault' : 'Log Your Latest Read'}
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
          {busy ? 'Saving…' : 'Log It'}
        </button>
      </div>

      {url && !isLikelyUrl(url) && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          That doesn't look like a valid URL yet — it should start with http:// or https://.
        </p>
      )}

      {parsed && (
        <div className="animate-in mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          {isNewEntry ? (
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Cover Art — auto-fetched, or add your own
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
              This will update <span className="font-medium text-slate-700 dark:text-slate-200">{matchedExisting ? displayTitle(matchedExisting) : ''}</span> to the new chapter. Its existing cover is kept — edit it later from the comic's row if you want to change it.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              Scanned Details — fix anything before saving
            </div>
            {opaque ? (
              <div className="sm:col-span-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                <Field label={`Which series is this? — ${parsed.website || parsed.domain} links don't contain the title`}>
                  <select className="input" aria-label="Series" value={seriesChoice} onChange={(e) => setSeriesChoice(e.target.value)}>
                    <option value="">Choose a saved series…</option>
                    {siteSeries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {displayTitle(c)}{c.useAltTitle ? ` (${c.title})` : ''}
                      </option>
                    ))}
                    <option value={NEW_SERIES}>+ New series…</option>
                  </select>
                </Field>
                {seriesChoice === NEW_SERIES && (
                  <div className="mt-2">
                    <Field label="Series name">
                      <input
                        className="input"
                        placeholder="e.g. One Punch-Man"
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        autoFocus
                      />
                    </Field>
                    <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
                      This name is saved as the series' title, so you can pick it from the list next time.
                    </span>
                  </div>
                )}
                {chosenSeries && (
                  <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">
                    Saved title: {chosenSeries.title}
                  </span>
                )}
              </div>
            ) : (
              <Field label="Title">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                {!parsed.titleDetected && (
                  <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                    Couldn't detect a title — please enter it manually.
                  </span>
                )}
              </Field>
            )}
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
            <Field label="Source">
              <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
            <div className="sm:col-span-3">
              <Field label="Alternate Title (optional)">
                <input
                  className="input"
                  placeholder="Your own name for it — shown instead of the URL title"
                  value={altTitle}
                  onChange={(e) => setAltTitle(e.target.value)}
                />
                <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
                  New chapters still match by the URL title above; this only changes what you see.
                </span>
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="Backup Portal (optional)">
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
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
