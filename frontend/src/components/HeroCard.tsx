import { useState } from 'react';
import type { Comic } from '../types/Comic';
import { daysSince } from '../services/normalization';
import { ExternalLinkIcon, ImageOffIcon, PencilIcon, SparkleIcon } from './Icons';

interface Props {
  comic: Comic;
  onEdit: (comic: Comic) => void;
}

/** "Continue Your Journey" — spotlights the most recently updated in-progress comic. */
export function HeroCard({ comic, onEdit }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = comic.coverImageUrl && !failed;
  const days = daysSince(comic.dateLastUpdated);
  const freshness =
    days === 0 ? 'Updated today' : days === 1 ? 'Updated yesterday' : `Updated ${days} days ago`;

  return (
    <section className="card relative overflow-hidden border-ink/10 p-0 dark:border-white/10">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 sm:h-auto sm:w-40">
          {showImage ? (
            <img
              src={comic.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
              <ImageOffIcon className="h-8 w-8" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent sm:bg-gradient-to-r" />
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2 p-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <SparkleIcon className="h-3.5 w-3.5" />
            Continue Your Journey
          </div>
          <h2 className="font-hero text-2xl leading-tight tracking-wide text-ink dark:text-[#F4F0E6] sm:text-3xl">
            {comic.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="chip bg-accent/10 font-semibold text-accent">Ch. {comic.chapter}</span>
            <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {comic.website || comic.domain}
            </span>
            <span>{freshness}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={comic.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" /> Continue reading
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => onEdit(comic)}>
              <PencilIcon className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
