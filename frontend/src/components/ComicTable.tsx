import type { Comic } from '../types/Comic';
import { formatDateReadable, daysSince } from '../services/normalization';

interface Props {
  comics: Comic[];
  onEdit: (comic: Comic) => void;
  onDelete: (comic: Comic) => void;
  onHistory: (comic: Comic) => void;
}

export function ComicTable({ comics, onEdit, onDelete, onHistory }: Props) {
  if (comics.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        No comics match your search or filters yet.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Webcomic</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">Last Updated</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {comics.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{c.title}</td>
                <td className="px-4 py-3">
                  <span className="chip bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
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
                  <RowActions comic={c} onEdit={onEdit} onDelete={onDelete} onHistory={onHistory} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {comics.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{c.title}</div>
              <span className="chip shrink-0 bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
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
              <RowActions comic={c} onEdit={onEdit} onDelete={onDelete} onHistory={onHistory} />
            </div>
          </div>
        ))}
      </div>
    </>
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

function RowActions({
  comic, onEdit, onDelete, onHistory,
}: { comic: Comic; onEdit: (c: Comic) => void; onDelete: (c: Comic) => void; onHistory: (c: Comic) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a
        href={comic.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
      >
        Open Chapter
      </a>
      <button type="button" className="btn btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => onHistory(comic)}>
        History
      </button>
      <button type="button" className="btn btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => onEdit(comic)}>
        Edit
      </button>
      <button type="button" className="btn btn-danger !px-2.5 !py-1.5 text-xs" onClick={() => onDelete(comic)}>
        Delete
      </button>
    </div>
  );
}
