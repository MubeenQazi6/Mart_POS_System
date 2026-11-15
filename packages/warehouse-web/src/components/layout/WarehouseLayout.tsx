import React from 'react';
import { WarehouseHeader } from './WarehouseHeader';
import { WarehouseSidebar } from './WarehouseSidebar';

interface WarehouseLayoutProps {
  children: React.ReactNode;
}

export function WarehouseLayout({ children }: WarehouseLayoutProps): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b1120] text-slate-100">
      <WarehouseSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <WarehouseHeader />
        <main className="flex-1 overflow-y-auto p-6 bg-[#0b1120]/60">
          {children}
        </main>
      </div>
    </div>
  );
}
