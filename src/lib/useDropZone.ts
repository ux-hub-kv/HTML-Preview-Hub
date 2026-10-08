import React, { useEffect, useRef, useState } from 'react';
import { DRAG_MIME } from './folders';

/** Drop target for items dragged inside the hub (ignores files dragged in from the OS). */
export function useDropZone(canDrop: boolean, onDrop: () => void) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    if (!canDrop) {
      depth.current = 0;
      setOver(false);
    }
  }, [canDrop]);

  const accepts = (e: React.DragEvent) => canDrop && e.dataTransfer.types.includes(DRAG_MIME);

  return {
    isOver: over && canDrop,
    dropHandlers: {
      onDragEnter: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      },
      onDrop: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        depth.current = 0;
        setOver(false);
        onDrop();
      },
    },
  };
}
