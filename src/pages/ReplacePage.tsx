import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import UploadForm from '../components/UploadForm';
import { supabase } from '../lib/supabase';
import { HtmlPreview } from '../types';

export default function ReplacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<HtmlPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      if (!id) return;
      const { data, error } = await supabase
        .from('html_previews')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('PREVIEW_NOT_FOUND');
      } else {
        setPreview(data);
      }
      setLoading(false);
    }
    fetchPreview();
  }, [id]);

  const handleUpdate = async (formData: FormData, file: File) => {
    if (!preview) return;

    // 1. Overwrite file in Supabase Storage (using same path)
    const { error: storageError } = await supabase.storage
      .from('previews')
      .upload(preview.file_path, file, {
        upsert: true,
        contentType: 'text/html',
      });

    if (storageError) throw storageError;

    // 2. Update metadata in DB
    const { error: dbError } = await supabase
      .from('html_previews')
      .update({
        title: formData.get('title') as string,
        author: formData.get('author') as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', preview.id);

    if (dbError) throw dbError;

    // 3. Redirect back to preview
    navigate(`/preview/${preview.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ink" size={48} />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-black uppercase text-ink">Eror_Null</h1>
        <p className="mt-2 font-mono text-xs text-bold-muted">{error || 'Something went wrong.'}</p>
        <Link to="/" className="mt-8 inline-block font-black uppercase text-ink underline underline-offset-4">
          Exit_Process
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex flex-col border-b-2 border-bold-border bg-surface px-10 py-12">
        <Link to={`/preview/${id}`} className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-bold-muted hover:text-ink transition-colors">
          <ArrowLeft size={14} />
          Cancel_replacement
        </Link>
        <h1 className="text-6xl font-black uppercase leading-[0.85] tracking-tighter text-ink italic">
          Overwrite_Source
        </h1>
        <p className="mt-4 font-mono text-xs font-bold uppercase text-bold-muted tracking-wider">
          System: Updating <span className="text-ink">[{preview.title}]</span>. Target path remains stable.
        </p>
      </header>

      <div className="p-10">
        <div className="border-2 border-bold-border bg-surface p-12 shadow-[12px_12px_0px_rgba(0,0,0,0.05)]">
          <UploadForm 
            isReplacing 
            initialData={{
              title: preview.title,
              author: preview.author || '',
            }}
            onSubmit={handleUpdate} 
          />
        </div>
      </div>
    </div>
  );
}
