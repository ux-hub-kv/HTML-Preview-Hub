import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { friendlyError } from '../lib/folders';

/** Inline name editor: Enter / blur saves, Escape cancels. Keeps editing open when the save fails. */
export default function FolderNameInput({
  initialValue,
  onSubmit,
  onCancel,
}: {
  initialValue: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = async () => {
    if (busy.current) return;
    const name = value.trim();
    if (!name) {
      setError('Tên folder không được để trống');
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(name);
    } catch (err) {
      setError(friendlyError(err));
      busy.current = false;
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative z-10 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          maxLength={100}
          disabled={saving}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          onBlur={() => { if (!error) submit(); }}
          aria-label="Tên folder"
          aria-invalid={!!error}
          className="min-w-0 flex-1 border-2 border-bold-border bg-surface px-2 py-1 text-sm font-black uppercase tracking-tight focus:outline-none disabled:opacity-60"
        />
        {saving && <Loader2 size={14} className="shrink-0 animate-spin" />}
      </div>
      {error ? (
        <p role="alert" className="font-mono text-[10px] font-bold uppercase text-red-600">{error}</p>
      ) : (
        <p className="font-mono text-[9px] font-bold uppercase text-bold-muted">Enter để lưu · Esc để hủy</p>
      )}
    </div>
  );
}
