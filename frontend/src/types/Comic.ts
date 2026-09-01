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
