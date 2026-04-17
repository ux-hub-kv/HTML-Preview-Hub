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
      .catch(() => setSrcDoc('<p>Failed to load preview.</p>'));
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
    <div className={`flex flex-col overflow-hidden border-2 border-bold-border bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.05)] ${fullscreen ? 'fixed inset-0 z-50 border-0 shadow-none' : 'h-full w-full'}`}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b-2 border-bold-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border border-bold-border bg-red-400" />
          <div className="h-3 w-3 rounded-full border border-bold-border bg-yellow-400" />
          <div className="h-3 w-3 rounded-full border border-bold-border bg-green-400" />
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-bold-muted truncate max-w-[300px]">
          {url}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            title="Download HTML"
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 transition-colors"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => setFullscreen(f => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 transition-colors"
          >
            {fullscreen ? <X size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {srcDoc === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
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
