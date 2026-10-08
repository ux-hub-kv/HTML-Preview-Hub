import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
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
        setError('Không tìm thấy file này.');
      } else if (data.deleted_at) {
        setError('File này đã bị xóa.');
      } else {
        setPreview(data);
      }
      setLoading(false);
    }
    fetchPreview();
  }, [id]);

  const handleUpdate = async (formData: FormData, file: File) => {
    if (!preview) return;

    // 1. Overwrite file in Supabase Storage (using same path); skipped when only the name changes
    if (file) {
      const { error: storageError } = await supabase.storage
        .from('previews')
        .upload(preview.file_path, file, {
          upsert: true,
          contentType: 'text/html',
        });

      if (storageError) throw storageError;
    }

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
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 text-error" />
        <h1 className="text-xl font-semibold">Không cập nhật được file</h1>
        <p className="mt-2 text-sm text-base-content/70">{error || 'Đã có lỗi xảy ra. Hãy thử lại.'}</p>
        <Link to="/" className="btn btn-primary btn-sm mt-6">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <Link to={`/preview/${id}`} className="btn btn-ghost btn-sm -ml-3 mb-2">
          <ArrowLeft size={16} />
          Quay lại
        </Link>
        <h1 className="text-2xl font-semibold">Cập nhật file</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Thay nội dung cho <span className="font-medium text-base-content">{preview.title}</span>. Link chia sẻ giữ nguyên.
        </p>
      </div>

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
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
