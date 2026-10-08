import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Folder } from '../types';
import { useDropZone } from '../lib/useDropZone';
import { cn } from '../lib/utils';

export function folderUrl(folderId: string | null) {
  return folderId ? `/folder/${folderId}` : '/';
}

interface BreadcrumbProps {
  path: Folder[];
  /** Render the last segment as plain text (the folder the user is in). */
  lastIsCurrent?: boolean;
  /** Enables dropping dragged items onto a segment. */
  canDropOn?: (folderId: string | null) => boolean;
  onDropOn?: (folderId: string | null) => void;
}

export default function Breadcrumb({ path, lastIsCurrent = true, canDropOn, onDropOn }: BreadcrumbProps) {
  const segments: { id: string | null; name: string }[] = [
    { id: null, name: 'Home' },
    ...path.map((f) => ({ id: f.id, name: f.name })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <Fragment key={segment.id ?? 'root'}>
            {i > 0 && <span className="font-mono text-xs font-bold text-bold-muted">/</span>}
            <Segment
              id={segment.id}
              name={segment.name}
              current={isLast && lastIsCurrent}
              canDrop={canDropOn?.(segment.id) ?? false}
              onDrop={() => onDropOn?.(segment.id)}
            />
          </Fragment>
        );
      })}
    </nav>
  );
}

function Segment({
  id,
  name,
  current,
  canDrop,
  onDrop,
}: {
  id: string | null;
  name: string;
  current: boolean;
  canDrop: boolean;
  onDrop: () => void;
}) {
  const { isOver, dropHandlers } = useDropZone(canDrop, onDrop);
  const content = (
    <>
      {id === null && <Home size={12} />}
      <span className="max-w-[220px] truncate">{name}</span>
    </>
  );
  const base = 'flex items-center gap-1.5 border-2 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors';

  if (current) {
    return (
      <span aria-current="page" className={cn(base, 'border-transparent text-ink')} {...dropHandlers}>
        {content}
      </span>
    );
  }
  return (
    <Link
      to={folderUrl(id)}
      draggable={false}
      {...dropHandlers}
      className={cn(
        base,
        'text-bold-muted hover:text-ink',
        canDrop ? 'border-dashed border-bold-muted' : 'border-transparent',
        isOver && 'border-solid border-bold-accent bg-blue-50 text-bold-accent'
      )}
    >
      {content}
    </Link>
  );
}
