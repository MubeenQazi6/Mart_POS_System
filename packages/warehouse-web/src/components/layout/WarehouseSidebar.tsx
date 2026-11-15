import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileInput,
  Grid3X3,
  PackageSearch,
  Truck,
  BarChart3,
  Sliders,
  Database,
  Building2,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Warehouse Overview', icon: LayoutDashboard },
  { to: '/inbound', label: 'Inbound GRN Receipts', icon: FileInput, badge: 'Inward' },
  { to: '/bins', label: 'Bin & Rack Coordinate Map', icon: Grid3X3 },
  { to: '/stock', label: 'Master Inventory & Batches', icon: PackageSearch },
  { to: '/transfers', label: 'Outbound Store Dispatches', icon: Truck, badge: 'Active' },
  { to: '/reports', label: 'Turnover & Audit Reports', icon: BarChart3 },
  { to: '/settings', label: 'Hub Configuration', icon: Sliders },
];

export function WarehouseSidebar(): React.JSX.Element {
  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Warehouse Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 m-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
          <Building2 className="h-4 w-4" />
          <span>Multi-Branch Logistics</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
          Feeds real-time stock to retail MartPOS stores without cross-database collision.
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
          <Database className="h-3 w-3" />
          <span>DB: warehouse.db (Isolated)</span>
        </div>
      </div>
    </aside>
  );
}
