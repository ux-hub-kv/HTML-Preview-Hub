import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base-200 font-sans text-base-content">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
