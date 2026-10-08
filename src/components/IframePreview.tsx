import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Download, X } from 'lucide-react';

interface IframePreviewProps {
  url: string;
  title: string;
}

export default function IframePreview({ url, title }: IframePreviewProps) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(setSrcDoc)
      .catch(() => setSrcDoc('<p style="font-family:sans-serif;padding:16px">Không tải được nội dung file.</p>'));
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleDownload = () => {
    if (!srcDoc) return;
    const blob = new Blob([srcDoc], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const frame = (
    <div className={`flex flex-col overflow-hidden bg-base-100 ${fullscreen ? 'fixed inset-0 z-50' : 'h-full w-full rounded-box border border-base-300 shadow-sm'}`}>
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-base-300 bg-base-200/60 px-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="min-w-0 max-w-[60%] truncate rounded-field bg-base-100 px-3 py-1 text-xs text-base-content/60">
          {url}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            title="Tải file HTML"
            aria-label="Tải file HTML"
            className="btn btn-ghost btn-square btn-sm"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => setFullscreen(f => !f)}
            title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className="btn btn-ghost btn-square btn-sm"
          >
            {fullscreen ? <X size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {srcDoc === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-100">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        )}
        {srcDoc !== null && (
          <iframe
            srcDoc={srcDoc}
            title={title}
            className="h-full w-full bg-white"
            sandbox="allow-scripts allow-forms"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );

  return frame;
}
