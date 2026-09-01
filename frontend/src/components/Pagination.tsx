import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

const PAGE_SIZE_OPTIONS = [10, 15, 30, 50];

interface Props {
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}

export function Pagination({ page, pageCount, pageSize, onPageChange, onPageSizeChange, totalItems }: Props) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="card flex flex-col items-center justify-between gap-3 p-3 sm:flex-row">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <span className="font-medium text-slate-700 dark:text-slate-200">{start}–{end}</span> of{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">{totalItems}</span>
        </span>
        <label className="flex items-center gap-1.5">
          <span className="hidden sm:inline">per page</span>
          <select
            className="input !h-8 !w-auto !py-0 text-xs"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-secondary !px-2 !py-1.5 text-xs"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            title="Previous page"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="btn btn-secondary !px-2 !py-1.5 text-xs"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            title="Next page"
          >
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
