import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Share2, AlertCircle, Check, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Folder, HtmlPreview } from '../types';
import IframePreview from '../components/IframePreview';
import Modal from '../components/Modal';
import Breadcrumb, { folderUrl } from '../components/Breadcrumb';
import { fetchFolders, getFolderPath } from '../lib/folders';
import { formatDate } from '../lib/utils';
import { EXPIRY_ENABLED, TRASH_RETENTION_DAYS } from '../lib/config';
import { useTrashPreview } from '../lib/useTrashPreview';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';

export default function PreviewViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const trashPreview = useTrashPreview();
  const [preview, setPreview] = useState<HtmlPreview | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);

  useEffect(() => {
    async function fetchPreview() {
      if (!id) return;

      const { data, error } = await supabase
        .from('html_previews')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Không tìm thấy file này. Link có thể sai hoặc file đã bị xóa vĩnh viễn.');
        setLoading(false);
        return;
      }

      setPreview(data);

      const { data: storageData } = supabase.storage
        .from('previews')
        .getPublicUrl(data.file_path);

      setPublicUrl(storageData.publicUrl);
      setLoading(false);

      if (data.folder_id) {
        fetchFolders()
          .then((folders) => setFolderPath(getFolderPath(folders, data.folder_id)))
          .catch(() => setFolderPath([]));
      }
    }

    fetchPreview();
  }, [id]);

  const handleDelete = async () => {
    if (!preview) return;
    setDeleting(true);
    try {
      await trashPreview(preview);
      navigate(folderUrl(preview.folder_id ?? null));
    } catch {
      setDeleting(false);
      setDeleteError('Không xóa được file, vui lòng thử lại.');
    }
  };

  const handleShare = () => {
    if (copied) return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExpiryText = (expiresAt: string | null) => {
    if (!EXPIRY_ENABLED || !expiresAt) return null;
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
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (preview?.deleted_at) {
    const deletedAt = new Date(preview.deleted_at);
    const purgeAt = addDays(deletedAt, TRASH_RETENTION_DAYS);
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-base-300 text-base-content/60">
          <Trash2 size={24} />
        </div>
        <h1 className="text-xl font-semibold">File đã bị xóa</h1>
        <p className="mt-2 text-sm text-base-content/70">
          <span className="font-medium text-base-content">{preview.title}</span> đã bị xóa lúc {formatDate(deletedAt)}
          {' '}và sẽ bị xóa vĩnh viễn sau {formatDate(purgeAt)}.
        </p>
        <p className="mt-1 text-sm text-base-content/70">Liên hệ quản trị viên nếu cần khôi phục.</p>
        <Link to="/" className="btn btn-primary btn-sm mt-6">Về trang chủ</Link>
      </div>
    );
  }

  if (error || !preview || !publicUrl) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 text-error" />
        <h1 className="text-xl font-semibold">Không mở được file</h1>
        <p className="mt-2 text-sm text-base-content/70">{error || 'Đã có lỗi xảy ra. Hãy thử lại.'}</p>
        <Link to="/" className="btn btn-primary btn-sm mt-6">Về trang chủ</Link>
      </div>
    );
  }

  const expiryText = getExpiryText(preview.expires_at);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <Link
          to={folderUrl(preview.folder_id ?? null)}
          aria-label="Quay lại folder"
          className="btn btn-ghost btn-circle btn-sm"
        >
          <ArrowLeft size={18} />
        </Link>
        <Breadcrumb path={folderPath} lastIsCurrent={false} />
      </div>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold leading-tight sm:text-3xl">{preview.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-base-content/60">
            <span>Cập nhật {formatDate(preview.updated_at)}</span>
            {expiryText && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {expiryText}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleShare} disabled={copied} className="btn btn-soft">
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'Đã copy link' : 'Copy link'}
          </button>
          <Link to={`/replace/${preview.id}`} className="btn btn-primary">
            <RefreshCcw size={16} />
            Cập nhật file
          </Link>
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn btn-ghost text-error">
            <Trash2 size={16} />
            Xóa
          </button>
        </div>
      </header>

      <section className="h-[80vh] pb-8">
        <IframePreview url={publicUrl} title={preview.title} />
      </section>

      {showDeleteConfirm && (
        <Modal title="Xóa file này?" onClose={() => !deleting && setShowDeleteConfirm(false)}>
          <p className="-mt-2 text-sm text-base-content/70">
            <span className="font-medium text-base-content">{preview.title}</span> sẽ bị gỡ khỏi danh sách.
            File được giữ thêm {TRASH_RETENTION_DAYS} ngày trước khi bị xóa vĩnh viễn.
          </p>
          {deleteError && (
            <div role="alert" className="alert alert-error alert-soft py-2 text-sm">{deleteError}</div>
          )}
          <div className="modal-action mt-0">
            <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="btn btn-ghost">
              Hủy
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-error">
              {deleting ? <span className="loading loading-spinner loading-xs" /> : <Trash2 size={14} />}
              {deleting ? 'Đang xóa…' : 'Xóa'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
