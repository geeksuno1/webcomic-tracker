import { GridIcon, ListIcon } from './Icons';

export type ViewMode = 'list' | 'cards';

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      <ToggleButton label="List" icon={<ListIcon className="h-3.5 w-3.5" />} active={value === 'list'} onClick={() => onChange('list')} />
      <ToggleButton label="Tiles" icon={<GridIcon className="h-3.5 w-3.5" />} active={value === 'cards'} onClick={() => onChange('cards')} />
    </div>
  );
}

function ToggleButton({
  label, icon, active, onClick,
}: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={`${label} view`}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
