import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { previewFileUrl } from '../lib/folders';

type State =
  | { status: 'loading' }
  | { status: 'ready'; html: string; title: string }
  | { status: 'deleted' }
  | { status: 'error' };

/** Share target: the prototype alone, filling the whole window, without the hub's chrome. */
export default function FullPageViewPage() {
  const { id } = useParams();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      const { data, error } = await supabase.from('html_previews').select('*').eq('id', id).single();
      if (cancelled) return;
      if (error || !data) {
        setState({ status: 'error' });
        return;
      }
      if (data.deleted_at) {
        setState({ status: 'deleted' });
        return;
      }
      try {
        // Fetched and rendered via srcDoc (like the detail page) because the bucket does not serve it as a page
        const res = await fetch(previewFileUrl(data));
        if (!res.ok) throw new Error(String(res.status));
        const html = await res.text();
        if (!cancelled) setState({ status: 'ready', html, title: data.title });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (state.status === 'ready') document.title = state.title;
  }, [state]);

  if (state.status === 'ready') {
    return (
      <iframe
        srcDoc={state.html}
        title={state.title}
        className="fixed inset-0 h-full w-full border-0 bg-white"
        sandbox="allow-scripts allow-forms"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {state.status === 'deleted' ? (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-base-300 text-base-content/60">
            <Trash2 size={24} />
          </div>
          <h1 className="text-xl font-semibold">File đã bị xóa</h1>
          <p className="mt-2 text-sm text-base-content/70">Liên hệ người đã chia sẻ link nếu bạn vẫn cần xem file này.</p>
        </>
      ) : (
        <>
          <AlertCircle size={40} className="mx-auto mb-4 text-error" />
          <h1 className="text-xl font-semibold">Không mở được file</h1>
          <p className="mt-2 text-sm text-base-content/70">Link có thể sai hoặc file đã bị xóa vĩnh viễn.</p>
        </>
      )}
    </div>
  );
}
