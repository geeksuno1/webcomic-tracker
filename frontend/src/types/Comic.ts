export type ComicStatus = 'Reading' | 'Completed' | 'On Hold' | 'Dropped';

export const COMIC_STATUSES: ComicStatus[] = ['Reading', 'Completed', 'On Hold', 'Dropped'];

/** Manga-themed captions shown in place of the plain tracker status names. */
export const STATUS_LABELS: Record<ComicStatus, string> = {
  Reading: 'On the Journey',
  'On Hold': 'To Be Continued…',
  Completed: 'Adventure Complete',
  Dropped: 'Journey Abandoned',
};

export interface Comic {
  id: string;
  title: string;
  chapter: number;
  url: string;
  website: string;
  domain: string;
  dateFirstAdded: string; // YYYY-MM-DD
  dateLastUpdated: string; // YYYY-MM-DD
  notes: string;
  normalizedTitle: string;
  coverImageUrl: string;
  status: ComicStatus;
  isFavorite: boolean;
  /** Vertical focal point for the cropped cover thumbnail, 0 (top) – 100 (bottom); 50 = centered. */
  coverPosition: number;
}

export interface ParsedChapterInfo {
  title: string;
  chapter: number | null;
  website: string;
  domain: string;
  url: string;
  chapterDetected: boolean;
  titleDetected: boolean;
}

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'recently-updated'
  | 'least-recently-updated'
  | 'highest-chapter'
  | 'lowest-chapter'
  | 'website';

export type StaleFilter = 'all' | '14' | '30' | '60' | '90';
export type DateFilter = 'all' | 'today' | 'week' | StaleFilter;
