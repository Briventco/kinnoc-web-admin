import { type ChangeEvent, useEffect, useId, useMemo, useState } from 'react';
import { ImageIcon, Trash2 } from 'lucide-react';
import { imageFileProblem } from '../../api/storage';
import { Button } from '../ui/Button';

interface ImagePickerProps {
  label: string;
  hint?: string;
  /** URL of the image already on the event (when it is being kept). */
  existingUrl: string | null;
  /** A newly chosen file, uploaded when the form is saved. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Remove the image that is already on the event. */
  onRemoveExisting: () => void;
  error?: string;
  disabled?: boolean;
  aspect?: 'poster' | 'square';
}

/** Choose an image, check its type and size, and preview it before upload. */
export function ImagePicker({
  label,
  hint,
  existingUrl,
  file,
  onFileChange,
  onRemoveExisting,
  error,
  disabled,
  aspect = 'poster',
}: ImagePickerProps) {
  const id = useId();
  const [problem, setProblem] = useState<string | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!chosen) return;
    const reason = imageFileProblem(chosen);
    setProblem(reason);
    if (!reason) onFileChange(chosen);
  }

  const shown = previewUrl ?? existingUrl;
  const message = problem ?? error;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 ${
            aspect === 'poster' ? 'h-36 w-full sm:w-56' : 'size-24'
          }`}
        >
          {shown ? (
            <img src={shown} alt={`${label} preview`} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-8 text-slate-300" aria-hidden />
          )}
        </div>
        <div className="space-y-2">
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            disabled={disabled}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          {file && <p className="text-xs text-slate-500">Selected: {file.name} (uploads when you save)</p>}
          {(file || existingUrl) && (
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setProblem(null);
                if (file) onFileChange(null);
                else onRemoveExisting();
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              {file ? 'Clear selection' : 'Remove image'}
            </Button>
          )}
          {hint && !message && <p className="text-xs text-slate-500">{hint}</p>}
          {message && <p className="text-xs text-red-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}
