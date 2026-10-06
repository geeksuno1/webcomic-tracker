import { LockIcon, UnlockIcon } from './Icons';

interface Props {
  inVaultView: boolean;
  vaultCount: number;
  onToggleView: () => void;
  onLock: () => void;
  onChangePassword: () => void;
}

/** Shown only while the vault is unlocked. */
export function VaultBar({ inVaultView, vaultCount, onToggleView, onLock, onChangePassword }: Props) {
  return (
    <div className="card flex flex-col gap-3 border-accent/30 bg-accent/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex items-start gap-2.5">
        <UnlockIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {inVaultView ? 'You’re inside the Vault' : 'The Vault is unlocked'}
            <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
              {vaultCount} hidden {vaultCount === 1 ? 'title' : 'titles'}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Locks itself after 10 minutes of inactivity, and whenever this tab closes or reloads.
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !py-1.5 text-xs" onClick={onToggleView}>
          {inVaultView ? 'Back to Library' : 'Open the Vault'}
        </button>
        <button type="button" className="btn btn-secondary !py-1.5 text-xs" onClick={onChangePassword}>
          Change password
        </button>
        <button type="button" className="btn btn-secondary !py-1.5 text-xs" onClick={onLock}>
          <LockIcon className="h-3.5 w-3.5" /> Lock now
        </button>
      </div>
    </div>
  );
}
