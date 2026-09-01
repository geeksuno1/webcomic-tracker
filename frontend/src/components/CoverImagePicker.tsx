import { useRef, useState, type ClipboardEvent } from 'react';
import { api, ApiError } from '../services/api';
import { useToast } from './Toast';
import { ClipboardIcon, ImageOffIcon, UploadIcon } from './Icons';

const MAX_BYTES = 6 * 1024 * 1024; // 6MB

interface Props {
  value: string;
  onChange: (url: string) => void;
  /** Shown while a background lookup (e.g. auto og:image fetch) is in progress. */
  autoLoading?: boolean;
  filenameHint?: string;
  size?: 'sm' | 'md';
}

export function CoverImagePicker({ value, onChange, autoLoading = false, filenameHint, size = 'md' }: Props) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dims = size === 'sm' ? 'h-24 w-16' : 'h-28 w-20';

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.show('Please choose an image file.', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.show('That image is too large (max 6MB). Try a smaller one.', 'error');
      return;
    }
    setUploading(true);
    setFailed(false);
    try {
      const dataUrl = await readAsDataUrl(file);
      const base64 = dataUrl.replace(/^data:[^,]+,/, '');
      const result = await api.uploadCoverImage(base64, file.type, filenameHint);
      onChange(result.url);
      toast.show('Cover image uploaded.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not upload that image. Please try again.';
      toast.show(message, 'error');
      setFailed(true);
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        handleFile(items[i].getAsFile());
        return;
      }
    }
  }

  const showImage = value && !failed;
  const busy = uploading || autoLoading;

  return (
    <div className="flex gap-3">
      <div
        tabIndex={0}
        role="button"
        aria-label="Paste an image here (Ctrl+V), or use the buttons below to upload one"
        onPaste={handlePaste}
        title="Click here and press Ctrl+V to paste an image from your clipboard"
        className={`relative shrink-0 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-slate-700 dark:bg-slate-800 ${dims}`}
      >
        {showImage ? (
          <img
            src={value}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-600">
            <ImageOffIcon className="h-5 w-5" />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <UploadIcon className="h-3.5 w-3.5" /> Upload
          </button>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <ClipboardIcon className="h-3.5 w-3.5" /> or click the box and paste (Ctrl+V)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </div>
        {value && (
          <button
            type="button"
            className="w-fit text-left text-xs text-slate-400 underline-offset-2 hover:text-red-600 hover:underline dark:text-slate-500 dark:hover:text-red-400"
            onClick={() => { onChange(''); setFailed(false); }}
          >
            Remove cover
          </button>
        )}
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}
