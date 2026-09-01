import { useState } from 'react';
import type { Comic } from '../types/Comic';
import { formatDateReadable, daysSince } from '../services/normalization';
import { ExternalLinkIcon, ImageOffIcon, LinkIcon, PencilIcon, SearchIcon } from './Icons';

interface Props {
  comics: Comic[];
  view?: 'list' | 'cards';
  onEdit: (comic: Comic) => void;
}

/** Notes are used as a backup-link href; add a scheme if the user typed a bare domain. */
function resolveAltHref(notes: string): string {
  const trimmed = notes.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
}

export function ComicTable({ comics, view = 'list', onEdit }: Props) {
  if (comics.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <SearchIcon className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No comics match your search or filters yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Try clearing a filter, or paste a chapter URL above to add one.</p>
      </div>
    );
  }

  if (view === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comics.map((c) => (
          <BigCard key={c.id} comic={c} onEdit={onEdit} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-3" />
              <th className="px-4 py-3">Webcomic</th>
              <th className="px-4 py-3">Chapter</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Last Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {comics.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-2">
                  <CoverThumb comic={c} className="h-14 w-10" />
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{c.title}</td>
                <td className="px-4 py-3">
                  <span className="chip bg-rose-50 font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    Ch. {c.chapter}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {c.website || c.domain}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  <StaleBadge dateStr={c.dateLastUpdated} />
                </td>
                <td className="px-4 py-3">
                  <RowActions comic={c} onEdit={onEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {comics.map((c) => (
          <div key={c.id} className="card flex gap-3 p-4">
            <CoverThumb comic={c} className="h-24 w-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-800 dark:text-slate-100">{c.title}</div>
                <span className="chip shrink-0 bg-rose-50 font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  Ch. {c.chapter}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {c.website || c.domain}
                </span>
                <StaleBadge dateStr={c.dateLastUpdated} />
              </div>
              <div className="mt-3">
                <RowActions comic={c} onEdit={onEdit} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CoverThumb({ comic, className = '', bare = false }: { comic: Comic; className?: string; bare?: boolean }) {
  const [failed, setFailed] = useState(false);
  const showImage = comic.coverImageUrl && !failed;
  const frame = bare
    ? 'overflow-hidden bg-slate-100 dark:bg-slate-800'
    : 'overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800';
  return (
    <div className={`${frame} ${className}`}>
      {showImage ? (
        <img
          src={comic.coverImageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
          <ImageOffIcon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

function StaleBadge({ dateStr }: { dateStr: string }) {
  const days = daysSince(dateStr);
  const label = formatDateReadable(dateStr);
  if (days >= 30) {
    return <span className="text-amber-600 dark:text-amber-400">{label}</span>;
  }
  return <span>{label}</span>;
}

function BigCard({ comic, onEdit }: { comic: Comic; onEdit: (c: Comic) => void }) {
  return (
    <div className="card flex flex-col overflow-hidden p-0">
      <CoverThumb comic={comic} bare className="h-48 w-full border-b border-slate-200 dark:border-slate-800" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-800 dark:text-slate-100">{comic.title}</h3>
          <span className="chip shrink-0 bg-rose-50 font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            Ch. {comic.chapter}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {comic.website || comic.domain}
          </span>
          <StaleBadge dateStr={comic.dateLastUpdated} />
        </div>
        <div className="mt-auto pt-2">
          <RowActions comic={comic} onEdit={onEdit} />
        </div>
      </div>
    </div>
  );
}

function RowActions({ comic, onEdit }: { comic: Comic; onEdit: (c: Comic) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <a
        href={comic.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open chapter"
        className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
      >
        <ExternalLinkIcon className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Open</span>
      </a>
      {comic.notes && (
        <a
          href={resolveAltHref(comic.notes)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Alternate source: ${comic.notes}`}
          className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Alt</span>
        </a>
      )}
      <button type="button" title="Edit" className="btn btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => onEdit(comic)}>
        <PencilIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
