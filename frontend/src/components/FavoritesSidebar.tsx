import { useEffect, useState } from 'react';
import type { Comic } from '../types/Comic';
import { ExternalLinkIcon, ImageOffIcon, ListIcon, PencilIcon, SmallGridIcon, StarIcon, GridIcon } from './Icons';
import { StatusBadge } from './ComicTable';

type FavoritesSize = 'list' | 'small' | 'medium';
const STORAGE_KEY = 'webcomic-tracker:favoritesSize';

function usePersistedSize(): [FavoritesSize, (v: FavoritesSize) => void] {
  const [size, setSize] = useState<FavoritesSize>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'list' || stored === 'small' || stored === 'medium') return stored;
    } catch {
      /* ignore */
    }
    return 'medium';
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch {
      /* ignore */
    }
  }, [size]);
  return [size, setSize];
}

interface Props {
  favorites: Comic[];
  onToggleFavorite: (comic: Comic) => void;
  onEdit: (comic: Comic) => void;
}

/** Right-rail quick access to starred comics — bookmarked quests, independent of filters/pagination. */
export function FavoritesSidebar({ favorites, onToggleFavorite, onEdit }: Props) {
  const [size, setSize] = usePersistedSize();

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <StarIcon className="h-4 w-4 text-gold" filled />
          Bookmarked Quests
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          <SizeButton title="List" active={size === 'list'} onClick={() => setSize('list')}>
            <ListIcon className="h-3.5 w-3.5" />
          </SizeButton>
          <SizeButton title="Small tiles" active={size === 'small'} onClick={() => setSize('small')}>
            <SmallGridIcon className="h-3.5 w-3.5" />
          </SizeButton>
          <SizeButton title="Medium tiles" active={size === 'medium'} onClick={() => setSize('medium')}>
            <GridIcon className="h-3.5 w-3.5" />
          </SizeButton>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Quick access to the tales you're following closest.</p>

      {favorites.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
          Tap the star on any comic to bookmark it here.
        </p>
      ) : size === 'list' ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {favorites.map((c) => (
            <FavoriteListRow key={c.id} comic={c} onToggleFavorite={onToggleFavorite} onEdit={onEdit} />
          ))}
        </div>
      ) : size === 'small' ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {favorites.map((c) => (
            <FavoriteSmallTile key={c.id} comic={c} onToggleFavorite={onToggleFavorite} onEdit={onEdit} />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {favorites.map((c) => (
            <FavoriteMediumTile key={c.id} comic={c} onToggleFavorite={onToggleFavorite} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function SizeButton({
  title, active, onClick, children,
}: { title: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

function CoverImg({ comic, className }: { comic: Comic; className: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = comic.coverImageUrl && !failed;
  if (!showImage) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 ${className}`}>
        <ImageOffIcon className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img
      src={comic.coverImageUrl}
      alt=""
      className={`object-cover ${className}`}
      style={{ objectPosition: `center ${comic.coverPosition ?? 50}%` }}
      onError={() => setFailed(true)}
    />
  );
}

function FavoriteStarButton({
  comic, onToggleFavorite, className = '',
}: { comic: Comic; onToggleFavorite: (comic: Comic) => void; className?: string }) {
  return (
    <button
      type="button"
      title="Remove from favorites"
      onClick={(e) => { e.stopPropagation(); onToggleFavorite(comic); }}
      className={`text-gold hover:text-gold/70 ${className}`}
    >
      <StarIcon className="h-3.5 w-3.5" filled />
    </button>
  );
}

/** Compact single-line row — the densest option, for a long favorites shelf. */
function FavoriteListRow({
  comic, onToggleFavorite, onEdit,
}: { comic: Comic; onToggleFavorite: (comic: Comic) => void; onEdit: (comic: Comic) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(comic)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(comic); } }}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-accent/5 dark:hover:bg-accent/10"
    >
      <CoverImg comic={comic} className="h-8 w-8 shrink-0 overflow-hidden rounded-md" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100" title={comic.title}>
        {comic.title}
      </span>
      <span className="chip shrink-0 bg-accent/10 font-semibold text-accent">Ch. {comic.chapter}</span>
      <FavoriteStarButton comic={comic} onToggleFavorite={onToggleFavorite} className="shrink-0" />
    </div>
  );
}

/** Small tile — a compact poster grid, two per row. */
function FavoriteSmallTile({
  comic, onToggleFavorite, onEdit,
}: { comic: Comic; onToggleFavorite: (comic: Comic) => void; onEdit: (comic: Comic) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(comic)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(comic); } }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 text-left transition-colors hover:border-accent/40 dark:border-slate-800 dark:hover:border-accent/50"
    >
      <div className="relative">
        <CoverImg comic={comic} className="h-20 w-full" />
        <span className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 shadow-sm backdrop-blur dark:bg-slate-900/80">
          <FavoriteStarButton comic={comic} onToggleFavorite={onToggleFavorite} />
        </span>
        <span className="chip absolute bottom-1 left-1 bg-accent/90 font-semibold text-white">Ch. {comic.chapter}</span>
      </div>
      <div className="truncate px-1.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100" title={comic.title}>
        {comic.title}
      </div>
    </div>
  );
}

/** Medium tile — the original richer card with status and quick actions. */
function FavoriteMediumTile({
  comic, onToggleFavorite, onEdit,
}: { comic: Comic; onToggleFavorite: (comic: Comic) => void; onEdit: (comic: Comic) => void }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 transition-colors hover:border-accent/40 dark:border-slate-800 dark:hover:border-accent/50">
      <CoverImg comic={comic} className="h-28 w-full" />

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
