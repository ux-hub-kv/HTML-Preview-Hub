import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Share2, Loader2, AlertCircle, Check, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HtmlPreview } from '../types';
import IframePreview from '../components/IframePreview';
import { formatDate } from '../lib/utils';
import { differenceInDays, differenceInHours } from 'date-fns';

export default function PreviewViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<HtmlPreview | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchPreview() {
      if (!id) return;

      const { data, error } = await supabase
        .from('html_previews')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Preview not found.');
        setLoading(false);
        return;
      }

      setPreview(data);

      const { data: storageData } = supabase.storage
        .from('previews')
        .getPublicUrl(data.file_path);

      setPublicUrl(storageData.publicUrl);
      setLoading(false);
    }

    fetchPreview();
  }, [id]);

  const handleDelete = async () => {
    if (!preview) return;
    setDeleting(true);
    await supabase.storage.from('previews').remove([preview.file_path]);
    await supabase.from('html_previews').delete().eq('id', preview.id);
    navigate('/');
  };

  const handleShare = () => {
    if (copied) return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExpiryText = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const exp = new Date(expiresAt);
    const days = differenceInDays(exp, now);
    const hours = differenceInHours(exp, now);
    if (hours <= 0) return null;
    if (days < 1) return `File sẽ được lưu trữ trong ${hours}h`;
    return `File sẽ được lưu trữ trong ${days} ngày`;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ink" size={48} />
      </div>
    );
  }

  if (error || !preview || !publicUrl) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-black uppercase text-ink">Eror_404</h1>
        <p className="mt-2 font-mono text-xs text-bold-muted">{error || 'Something went wrong.'}</p>
        <Link to="/" className="mt-8 inline-block font-black uppercase text-ink underline underline-offset-4">
          Return_to_Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex flex-col gap-6 border-b-2 border-bold-border bg-surface px-10 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <Link to="/" className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-bold-muted hover:text-ink">
            <ArrowLeft size={14} />
            Back_to_System
          </Link>
          <h1 className="text-6xl font-black uppercase leading-[0.85] tracking-tighter text-ink">
            {preview.title}
          </h1>
          <div className="flex flex-wrap items-center gap-8 mt-6">
            {/* <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase">
              <span className="text-bold-muted">ID:</span>
              <span>{preview.id.split('-')[0]}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase">
              <span className="text-bold-muted">AUTHOR:</span>
              <span>{preview.author || 'ANON'}</span>
            </div> */}
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase">
              <span className="text-bold-muted">UPDATED:</span>
              <span>{formatDate(preview.updated_at)}</span>
            </div>
            {getExpiryText(preview.expires_at) && (
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase">
                <Clock size={12} />
                <span>{getExpiryText(preview.expires_at)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleShare}
            disabled={copied}
            className="flex items-center gap-2 border-2 border-bold-border bg-surface px-6 py-3 text-xs font-black uppercase tracking-wider text-ink transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'Đã copy' : 'Copy Link'}
          </button>
          <Link
            to={`/replace/${preview.id}`}
            className="flex items-center gap-2 border-2 border-bold-border bg-ink px-6 py-3 text-xs font-black uppercase tracking-wider text-surface transition-transform hover:scale-105 active:scale-95"
          >
            <RefreshCcw size={16} />
            Cập nhật file mới
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 border-2 border-red-500 bg-surface px-6 py-3 text-xs font-black uppercase tracking-wider text-red-500 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trash2 size={16} />
            Xóa
          </button>
        </div>
      </header>

      <section className="p-10 flex flex-col gap-10">
        <div className="h-[80vh]">
           <IframePreview url={publicUrl} title={preview.title} />
        </div>
      </section>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col gap-6 border-2 border-bold-border bg-surface p-10 shadow-[8px_8px_0px_rgba(0,0,0,1)] min-w-[320px]">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-ink">Xóa Preview?</h2>
              <p className="font-mono text-xs text-bold-muted">
                <span className="font-bold text-ink">{preview.title}</span> sẽ bị xóa vĩnh viễn.
                <br />Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 border-2 border-bold-border py-3 text-xs font-black uppercase tracking-wider hover:bg-gray-100 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 border-2 border-red-500 bg-red-500 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-red-600 disabled:opacity-70"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
