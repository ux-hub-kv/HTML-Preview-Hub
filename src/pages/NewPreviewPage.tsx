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
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <Link to="/" className="btn btn-ghost btn-sm -ml-3 mb-2">
          <ArrowLeft size={16} />
          Quay lại
        </Link>
        <h1 className="text-2xl font-semibold">Tải lên file mới</h1>
        <p className="mt-1 text-sm text-base-content/70">Tải file HTML lên để có link xem và chia sẻ ngay.</p>
      </div>

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <UploadForm onSubmit={handleCreate} />
        </div>
      </div>
    </div>
  );
}
