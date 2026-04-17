import React, { useState } from 'react';
import { Upload, FileCode, X, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const AUTHOR_STORAGE_KEY = 'html-preview-hub-author';

interface UploadFormProps {
  initialData?: {
    title: string;
    author: string;
  };
  onSubmit: (data: FormData, file: File) => Promise<void>;
  isReplacing?: boolean;
}

export default function UploadForm({ initialData, onSubmit, isReplacing }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    author: initialData?.author || localStorage.getItem(AUTHOR_STORAGE_KEY) || '',
  });
  const [expiryDays, setExpiryDays] = useState<14 | 60 | null>(14);

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/html' && !selectedFile.name.endsWith('.html')) {
      setError('PLEASE_UPLOAD_VALID_HTML');
      return;
    }
    if (selectedFile.size > 2 * 1024 * 1024) {
      setError('FILE_EXCEEDS_2MB_LIMIT');
      return;
    }
    setFile(selectedFile);
    setError(null);
    if (!formData.title) {
      const nameWithoutExt = selectedFile.name.replace(/\.html?$/i, '');
      setFormData(prev => ({ ...prev, title: nameWithoutExt }));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !isReplacing) {
      setError('HTML_FILE_MISSING');
      return;
    }
    if (!formData.title) {
      setError('TITLE_REQUIRED');
      return;
    }

    if (formData.author) {
      localStorage.setItem(AUTHOR_STORAGE_KEY, formData.author);
    }

    setLoading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('author', formData.author);
      data.append('expiry_days', expiryDays !== null ? String(expiryDays) : '');

      if (!file && isReplacing) {
        // metadata only update
      } else if (!file) {
        setError('HTML_FILE_REQUIRED');
        setLoading(false);
        return;
      }

      await onSubmit(data, file!);
    } catch (err: any) {
      setError(err.message || 'SYSTEM_ERROR_OCCURRED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <label className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bold-muted">
          Raw_HTML_Source
        </label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative flex h-[200px] flex-col items-center justify-center border-4 border-dashed transition-all',
            dragActive
              ? 'border-bold-accent bg-blue-50'
              : 'border-gray-200 bg-surface',
            file && 'border-solid border-bold-border bg-gray-50'
          )}
        >
          <input
            type="file"
            accept=".html"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
          />

          {!file ? (
            <div className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 border-2 border-bold-border p-3 text-ink">
                <Upload size={28} />
              </div>
              <p className="text-sm font-black uppercase tracking-widest text-ink">
                Drag_drop_source_file
              </p>
              <p className="mt-2 font-mono text-[10px] font-bold uppercase text-bold-muted">
                SUPPORTS: .HTML ONLY | SIZE_LIMIT: 2MB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center p-8 text-center animate-in zoom-in-95 duration-300">
              <FileCode size={48} className="mb-3 text-ink" />
              <p className="max-w-[240px] truncate text-lg font-black uppercase tracking-tight text-ink">
                {file.name}
              </p>
              <p className="font-mono text-[10px] font-bold uppercase text-bold-muted mt-1">
                SOURCE_READY ({(file.size / 1024).toFixed(1)} KB)
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-4 flex items-center gap-2 font-mono text-[10px] font-black uppercase text-red-600 hover:scale-105"
              >
                <X size={14} /> Clear_selection
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <label className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bold-muted mb-3">
            Snippet_Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border-2 border-bold-border bg-surface px-6 py-4 text-sm font-bold uppercase tracking-wider focus:outline-none"
            placeholder="e.g. MARKETING_CAMPAIGN_V2"
            required
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bold-muted mb-3">
            Author_Identifier
          </label>
          <input
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="w-full border-2 border-bold-border bg-surface px-6 py-4 text-sm font-bold uppercase tracking-wider focus:outline-none"
            placeholder="e.g. S.JENKINS"
          />
        </div>
      </div>

      {!isReplacing && (
        <div>
          <label className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bold-muted mb-3">
            Auto_Delete_After
          </label>
          <div className="flex gap-2">
            {([14, 60, null] as const).map((days) => (
              <button
                key={String(days)}
                type="button"
                onClick={() => setExpiryDays(days)}
                className={cn(
                  'flex-1 border-2 py-3 text-xs font-black uppercase tracking-wider transition-all',
                  expiryDays === days
                    ? 'border-ink bg-ink text-surface'
                    : 'border-bold-border bg-surface text-ink hover:border-ink'
                )}
              >
                {days === null ? 'Never' : `${days} Days`}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 border-2 border-red-600 bg-red-50 p-6 font-mono text-xs font-bold uppercase text-red-600">
          <AlertCircle size={20} />
          <span>Error_Code: {error}</span>
        </div>
      )}

      <div className="flex justify-end gap-6 pt-8 border-t-2 border-bold-border">
        <button
          type="submit"
          disabled={loading}
          className="flex min-w-[200px] items-center justify-center gap-3 border-2 border-bold-border bg-ink px-10 py-5 text-sm font-black uppercase tracking-widest text-surface transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            isReplacing ? 'OVERWRITE_EXISTING' : 'INIT_UPLOAD'
          )}
        </button>
      </div>
    </form>
  );
}
