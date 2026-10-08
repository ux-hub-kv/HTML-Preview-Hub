import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
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
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center text-xs">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <Fragment key={segment.id ?? 'root'}>
            {i > 0 && <ChevronRight size={12} className="text-base-content/30" aria-hidden="true" />}
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
  const base = 'flex items-center gap-1 rounded-field border border-transparent px-1.5 py-0.5 transition-colors';

  if (current) {
    return (
      <span aria-current="page" className={cn(base, 'font-medium text-base-content/80')} {...dropHandlers}>
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
        'text-base-content/50 hover:bg-base-300/60 hover:text-base-content',
        canDrop && 'border-dashed border-primary/50',
        isOver && 'border-solid border-primary bg-primary/10 text-primary'
      )}
    >
      {content}
    </Link>
  );
}
