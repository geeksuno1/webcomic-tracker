const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Bucket a title into the letter it should be indexed under: 'A'-'Z' or '#' for anything else. */
export function firstLetterOf(title: string): string {
  const ch = (title || '').trim().charAt(0).toUpperCase();
  return ch >= 'A' && ch <= 'Z' ? ch : '#';
}

interface Props {
  availableLetters: Set<string>;
  active: string | null;
  onSelect: (letter: string | null) => void;
}

/** A-Z (+ #) jump index. Letters with no matching comics are shown disabled. */
export function AlphaIndex({ availableLetters, active, onSelect }: Props) {
  return (
    <div className="card flex flex-wrap items-center gap-1 p-2.5">
      <IndexButton label="All" isActive={active === null} disabled={false} onClick={() => onSelect(null)} />
      <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
      {LETTERS.map((letter) => (
        <IndexButton
          key={letter}
          label={letter}
          isActive={active === letter}
          disabled={!availableLetters.has(letter)}
          onClick={() => onSelect(letter)}
        />
      ))}
      <IndexButton
        label="#"
        isActive={active === '#'}
        disabled={!availableLetters.has('#')}
        onClick={() => onSelect('#')}
      />
    </div>
  );
}

function IndexButton({
  label, isActive, disabled, onClick,
}: { label: string; isActive: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-semibold transition-colors ${
        isActive
          ? 'bg-accent text-white shadow-sm'
          : disabled
          ? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      {label}
    </button>
  );
}
