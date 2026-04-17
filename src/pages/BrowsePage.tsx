import { useEffect, useState } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { HtmlPreview } from '../types';
import PreviewCard from '../components/PreviewCard';

export default function BrowsePage() {
  const [previews, setPreviews] = useState<HtmlPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
          All Previews
        </h1>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bold-muted" size={16} />
            <input
              type="text"
              placeholder="Filter by title or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 border-2 border-bold-border bg-surface py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-wider focus:outline-none"
            />
          </div>
          <Link
            to="/new"
            className="flex items-center gap-2 border-2 border-bold-border bg-ink px-6 py-3 text-xs font-black uppercase tracking-wider text-surface transition-transform hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            Upload HTML
          </Link>
        </div>
      </header>

      <div className="p-10">
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
