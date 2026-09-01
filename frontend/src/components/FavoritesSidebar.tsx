import { useState } from 'react';
import type { Comic } from '../types/Comic';
import { ExternalLinkIcon, ImageOffIcon, PencilIcon, StarIcon } from './Icons';
import { StatusBadge } from './ComicTable';

interface Props {
  favorites: Comic[];
  onToggleFavorite: (comic: Comic) => void;
  onEdit: (comic: Comic) => void;
}

/** Right-rail quick access to starred comics — mid-sized cards, independent of filters/pagination. */
export function FavoritesSidebar({ favorites, onToggleFavorite, onEdit }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <StarIcon className="h-4 w-4 text-gold" filled />
        Favorites
      </div>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Quick access to your starred comics.</p>

      {favorites.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
          Tap the star on any comic to pin it here.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-1">
          {favorites.map((c) => (
            <FavoriteCard key={c.id} comic={c} onToggleFavorite={onToggleFavorite} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  comic, onToggleFavorite, onEdit,
}: { comic: Comic; onToggleFavorite: (comic: Comic) => void; onEdit: (comic: Comic) => void }) {
  const [failed, setFailed] = useState(false);
  const showImage = comic.coverImageUrl && !failed;

  return (
    <div className="group relative flex overflow-hidden rounded-xl border border-slate-200 transition-colors hover:border-accent/40 dark:border-slate-800 dark:hover:border-accent/50 lg:flex-col">
      <div className="h-full w-20 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 lg:h-28 lg:w-full">
        {showImage ? (
          <img src={comic.coverImageUrl} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <ImageOffIcon className="h-5 w-5" />
          </div>
        )}
      </div>

      <button
        type="button"
        title="Remove from favorites"
        onClick={() => onToggleFavorite(comic)}
        className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-gold shadow-sm backdrop-blur hover:text-gold/70 dark:bg-slate-900/80"
      >
        <StarIcon className="h-3.5 w-3.5" filled />
      </button>

      <div className="min-w-0 flex-1 p-2.5">
        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={comic.title}>
          {comic.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="chip bg-accent/10 font-semibold text-accent">Ch. {comic.chapter}</span>
          <StatusBadge status={comic.status} />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <a
            href={comic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !px-2 !py-1 text-xs"
          >
            <ExternalLinkIcon className="h-3 w-3" /> Open
          </a>
          <button type="button" className="btn btn-secondary !px-2 !py-1 text-xs" onClick={() => onEdit(comic)}>
            <PencilIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
