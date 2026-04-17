import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-ink">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
