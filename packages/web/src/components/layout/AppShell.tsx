import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#0d1218',
        color: '#f8f9fa',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          backgroundColor: '#131921',
        }}
      >
        <Header onToggleSidebar={() => setIsCollapsed(!isCollapsed)} />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            backgroundColor: '#0d1218',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
