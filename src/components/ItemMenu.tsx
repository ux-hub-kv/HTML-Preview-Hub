import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

export interface MenuAction {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

/** "⋯" button with a dropdown rendered in a portal so it never gets clipped by neighbouring cards. */
export default function ItemMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pos) {
      setPos(null);
      return;
    }
    const rect = buttonRef.current!.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        draggable={false}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        className={cn(
          'relative z-10 p-1.5 text-bold-muted transition-colors hover:text-ink cursor-pointer',
          pos && 'text-ink'
        )}
      >
        <MoreHorizontal size={16} />
      </button>
      {pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-40 min-w-[180px] border-2 border-bold-border bg-surface py-1 shadow-[4px_4px_0px_rgba(0,0,0,1)]"
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setPos(null);
                  action.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-black uppercase tracking-wider hover:bg-gray-100 cursor-pointer',
                  action.danger ? 'text-red-500' : 'text-ink'
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
