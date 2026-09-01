import type { DateFilter, SortOption } from '../types/Comic';
import { ChevronDownIcon, SearchIcon, XIcon } from './Icons';

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
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="input pl-9 pr-9"
          placeholder="Search by title, website, or domain…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search comics"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Select
        value={websiteFilter}
        onChange={onWebsiteFilterChange}
        ariaLabel="Filter by source website"
        className="sm:w-44"
      >
        <option value="">All sources</option>
        {websites.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </Select>

      <Select
        value={dateFilter}
        onChange={(v) => onDateFilterChange(v as DateFilter)}
        ariaLabel="Filter by last updated"
        className="sm:w-56"
      >
        {DATE_FILTERS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </Select>

      <Select
        value={sort}
        onChange={(v) => onSortChange(v as SortOption)}
        ariaLabel="Sort comics"
        className="sm:w-52"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>Sort: {s.label}</option>
        ))}
      </Select>
    </div>
  );
}

function Select({
  value, onChange, ariaLabel, className = '', children,
}: {
  value: string; onChange: (v: string) => void; ariaLabel: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="input appearance-none pr-8"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
