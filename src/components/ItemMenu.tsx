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
        className={cn('btn btn-ghost btn-circle btn-sm relative z-10 text-base-content/60', pos && 'bg-base-200 text-base-content')}
      >
        <MoreHorizontal size={18} />
      </button>
      {pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-40 min-w-[190px] rounded-box border border-base-300 bg-base-100 p-1 shadow-lg"
          >
            <ul className="menu menu-sm w-full p-0">
              {actions.map((action) => (
                <li key={action.label}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPos(null);
                      action.onSelect();
                    }}
                    className={cn('gap-3 py-2', action.danger && 'text-error')}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
