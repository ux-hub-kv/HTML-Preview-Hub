import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import UploadForm from '../components/UploadForm';
import { supabase } from '../lib/supabase';

export default function NewPreviewPage() {
  const navigate = useNavigate();

  const handleCreate = async (formData: FormData, file: File) => {
    // 1. Upload file to Supabase Storage
    const fileId = crypto.randomUUID();
    const filePath = `${fileId}.html`;

    const { error: storageError } = await supabase.storage
      .from('previews')
      .upload(filePath, file, { contentType: 'text/html' });

    if (storageError) throw storageError;

    // 2. Save metadata to DB
    const expiryDaysRaw = formData.get('expiry_days') as string;
    const expiryDays = expiryDaysRaw ? parseInt(expiryDaysRaw) : null;
    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 86400000).toISOString()
      : null;

    const { data: dbData, error: dbError } = await supabase
      .from('html_previews')
      .insert({
        title: formData.get('title') as string,
        author: formData.get('author') as string,
        file_path: filePath,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Redirect to preview page
    navigate(`/preview/${dbData.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex flex-col border-b-2 border-bold-border bg-surface px-10 py-12">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-bold-muted hover:text-ink transition-colors">
          <ArrowLeft size={14} />
          Abort_command
        </Link>
        <h1 className="text-6xl font-black uppercase leading-[0.85] tracking-tighter text-ink">
          New_Preview
        </h1>
        <p className="mt-4 font-mono text-xs font-bold uppercase text-bold-muted tracking-wider">
          Upload custom HTML source for instant deployment.
        </p>
      </header>
      
      <div className="p-10">
        <div className="border-2 border-bold-border bg-surface p-12 shadow-[12px_12px_0px_rgba(0,0,0,0.05)]">
          <UploadForm onSubmit={handleCreate} />
        </div>
      </div>
    </div>
  );
}
