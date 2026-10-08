import React, { useState } from 'react';
import { Upload, FileCode, X, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { EXPIRY_ENABLED, MAX_UPLOAD_BYTES } from '../lib/config';

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
  const [expiryDays, setExpiryDays] = useState<14 | 60 | null>(EXPIRY_ENABLED ? 14 : null);

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/html' && !selectedFile.name.endsWith('.html')) {
      setError('Chỉ hỗ trợ file .html. Hãy chọn file khác.');
      return;
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setError('File lớn hơn 10MB. Hãy chọn file nhỏ hơn.');
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
      setError('Hãy chọn file HTML để tải lên.');
      return;
    }
    if (!formData.title) {
      setError('Hãy nhập tên cho file.');
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
        setError('Hãy chọn file HTML để tải lên.');
        setLoading(false);
        return;
      }

      await onSubmit(data, file!);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra. Hãy thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">File HTML</legend>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative flex h-48 flex-col items-center justify-center rounded-box border-2 border-dashed transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-base-content/20 bg-base-100 hover:border-primary/60',
            file && 'border-solid border-primary/40 bg-primary/5'
          )}
        >
          <input
            type="file"
            accept=".html"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            aria-label="Chọn file HTML"
          />

          {!file ? (
            <div className="flex flex-col items-center p-6 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload size={20} />
              </div>
              <p className="text-sm font-medium">
                Kéo thả file vào đây hoặc <span className="text-primary">chọn file</span>
              </p>
              <p className="mt-1 text-xs text-base-content/60">
                {isReplacing ? 'Bỏ trống nếu chỉ muốn đổi tên. ' : ''}Chỉ file .html, tối đa 10MB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center p-6 text-center">
              <FileCode size={36} className="mb-2 text-primary" />
              <p className="max-w-[260px] truncate text-sm font-semibold">{file.name}</p>
              <p className="mt-0.5 text-xs text-base-content/60">Sẵn sàng tải lên · {(file.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="btn btn-ghost btn-xs relative z-20 mt-3 text-error"
              >
                <X size={14} /> Bỏ chọn file
              </button>
            </div>
          )}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Tên file</legend>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input w-full"
            placeholder="Landing page chiến dịch tháng 10"
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Người đăng</legend>
          <input
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="input w-full"
            placeholder="Nguyễn Văn A"
          />
        </fieldset>
      </div>

      {!isReplacing && EXPIRY_ENABLED && (
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Tự xóa sau</legend>
          <div className="join w-full">
            {([14, 60, null] as const).map((days) => (
              <button
                key={String(days)}
                type="button"
                onClick={() => setExpiryDays(days)}
                className={cn('btn join-item flex-1', expiryDays === days && 'btn-primary')}
              >
                {days === null ? 'Không bao giờ' : `${days} ngày`}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end border-t border-base-300 pt-5">
        <button type="submit" disabled={loading} className="btn btn-primary min-w-40">
          {loading && <span className="loading loading-spinner loading-sm" />}
          {isReplacing ? 'Lưu thay đổi' : 'Tải lên'}
        </button>
      </div>
    </form>
  );
}
