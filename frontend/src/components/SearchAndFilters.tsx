import type { DateFilter, SortOption } from '../types/Comic';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  websites: string[];
  websiteFilter: string;
  onWebsiteFilterChange: (v: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (v: DateFilter) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
}

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Updated today' },
  { value: 'week', label: 'Updated this week' },
  { value: '14', label: 'Not updated in 14+ days' },
  { value: '30', label: 'Not updated in 30+ days' },
  { value: '60', label: 'Not updated in 60+ days' },
  { value: '90', label: 'Not updated in 90+ days' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recently-updated', label: 'Most recently updated' },
  { value: 'least-recently-updated', label: 'Least recently updated' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'highest-chapter', label: 'Highest chapter' },
  { value: 'lowest-chapter', label: 'Lowest chapter' },
  { value: 'website', label: 'Website' },
];

export function SearchAndFilters({
  search, onSearchChange, websites, websiteFilter, onWebsiteFilterChange,
  dateFilter, onDateFilterChange, sort, onSortChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          type="text"
          className="input pl-9"
          placeholder="Search by title, website, or domain…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search comics"
        />
      </div>

      <select
        className="input sm:w-44"
        value={websiteFilter}
        onChange={(e) => onWebsiteFilterChange(e.target.value)}
        aria-label="Filter by source website"
      >
        <option value="">All sources</option>
        {websites.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>

      <select
        className="input sm:w-56"
        value={dateFilter}
        onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
        aria-label="Filter by last updated"
      >
        {DATE_FILTERS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <select
        className="input sm:w-52"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        aria-label="Sort comics"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>Sort: {s.label}</option>
        ))}
      </select>
    </div>
  );
}
