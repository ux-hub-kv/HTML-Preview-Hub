import React, { useEffect } from 'react';

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal modal-open modal-bottom sm:modal-middle"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-box flex max-h-[85vh] flex-col gap-5"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
