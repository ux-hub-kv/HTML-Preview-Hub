import { useEffect, useState } from 'react';
import { Search, Loader2, Upload, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { HtmlPreview } from '../types';
import PreviewCard from '../components/PreviewCard';
import { cn } from '../lib/utils';

export default function BrowsePage() {
  const [previews, setPreviews] = useState<HtmlPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPreviews() {
      const { data, error } = await supabase
        .from('html_previews')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setPreviews(data);
      }
      setLoading(false);
    }

    fetchPreviews();
  }, []);

  const handleUpload = async (file: File) => {
    if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
      setError('PLEASE_UPLOAD_VALID_HTML');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('FILE_EXCEEDS_2MB_LIMIT');
      return;
    }
    setError(null);
    setUploading(true);

    try {
      const fileId = crypto.randomUUID();
      const filePath = `${fileId}.html`;

      const { error: storageError } = await supabase.storage
        .from('previews')
        .upload(filePath, file, { contentType: 'text/html' });

      if (storageError) throw storageError;

      const nameWithoutExt = file.name.replace(/\.html?$/i, '');
      const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
      const author = localStorage.getItem('html-preview-hub-author') || '';

      const { data: dbData, error: dbError } = await supabase
        .from('html_previews')
        .insert({
          title: nameWithoutExt,
          author: author,
          file_path: filePath,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      navigate(`/preview/${dbData.id}`);
    } catch (err: any) {
      setError(err.message || 'SYSTEM_ERROR_OCCURRED');
      setUploading(false);
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
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    const preview = previews.find((p) => p.id === id);
    if (!preview) return;
    await supabase.storage.from('previews').remove([preview.file_path]);
    await supabase.from('html_previews').delete().eq('id', id);
    setPreviews((prev) => prev.filter((p) => p.id !== id));
  };

  const now = new Date();
  const filteredPreviews = previews.filter((p) => {
    if (p.expires_at && new Date(p.expires_at) < now) return false;
    return p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.author?.toLowerCase().includes(search.toLowerCase()) || '');
  });

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex flex-col gap-6 border-b-2 border-bold-border bg-surface px-10 py-10 md:flex-row md:items-center md:justify-between">
        <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-tighter text-ink">
          HTML Previews
        </h1>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bold-muted" size={16} />
            <input
              type="text"
              placeholder="Search by filename"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 border-2 border-bold-border bg-surface py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-wider focus:outline-none"
            />
          </div>
        </div>
      </header>

      <div className="p-10 pb-0">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'group relative flex h-[320px] flex-col items-center justify-center border-2 border-dashed border-bold-border transition-all mb-8 bg-surface hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] cursor-pointer',
            dragActive
              ? 'border-solid border-ink bg-gray-50'
              : ''
          )}
        >
          <input
            type="file"
            accept=".html"
            onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
               <Loader2 className="animate-spin text-ink mb-3" size={32} />
               <p className="text-sm font-black uppercase tracking-widest text-ink">Uploading...</p>
            </div>
          ) : (
             <div className="flex flex-col items-center text-center mt-2">
              <div className="mb-4 border-2 border-bold-border p-3 text-ink bg-white">
                <Upload size={24} />
              </div>
              <p className="text-sm font-black uppercase tracking-widest text-ink">
                Drag_drop_source_file or Click to Upload
              </p>
              <p className="mt-2 font-mono text-[10px] font-bold uppercase text-bold-muted">
                SUPPORTS: .HTML ONLY | SIZE_LIMIT: 2MB | DEFAULTS APPLIED
              </p>
            </div>
          )}
        </div>
        {error && (
          <div className="mb-8 flex items-center gap-3 border-2 border-red-600 bg-red-50 p-6 font-mono text-xs font-bold uppercase text-red-600">
            <AlertCircle size={20} />
            <span>Error_Code: {error}</span>
          </div>
        )}
      </div>

      <div className="px-10 pb-10">
        <h2 className="mb-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bold-muted">
          Các file đã tải lên
        </h2>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-ink" size={32} />
          </div>
        ) : filteredPreviews.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPreviews.map((preview) => (
              <PreviewCard key={preview.id} preview={preview} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-bold-border bg-white py-32 text-center">
            <h3 className="text-xl font-black uppercase text-ink">List Empty</h3>
            <p className="mt-1 font-mono text-xs font-bold uppercase text-bold-muted">No snippets matches your query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
