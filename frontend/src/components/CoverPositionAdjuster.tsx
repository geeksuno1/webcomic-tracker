interface Props {
  coverImageUrl: string;
  position: number; // 0 (top) – 100 (bottom), 50 = centered
  onChange: (position: number) => void;
}

/**
 * Lets the user pick which part of a tall cover image stays visible once it's
 * cropped to the wide tile/row thumbnails — the crop is the same object-fit:
 * cover behavior used everywhere else, previewed live at that aspect ratio.
 */
export function CoverPositionAdjuster({ coverImageUrl, position, onChange }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        Reposition cover in tiles
      </label>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
        <img
          src={coverImageUrl}
          alt=""
          className="h-16 w-full object-cover"
          style={{ objectPosition: `center ${position}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">Top</span>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-accent"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">Bottom</span>
        {position !== 50 && (
          <button
            type="button"
            className="text-xs font-medium text-accent hover:underline"
            onClick={() => onChange(50)}
          >
            Reset
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Adjusts what stays visible when the cover is cropped in list/card view.
      </p>
    </div>
  );
}
