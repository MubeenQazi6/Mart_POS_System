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
  Warehouse,
  Boxes,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';

interface NavSection {
  title: string;
  items: Array<{
    to: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
  }>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { to: '/', label: 'Command Center', icon: LayoutDashboard },
      { to: '/inbound', label: 'Inbound GRN Receipts', icon: FileInput, badge: 'Inward', badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
      { to: '/bins', label: 'Bin & Rack Matrix', icon: Grid3X3 },
      { to: '/stock', label: 'Master Inventory & Batches', icon: PackageSearch },
      { to: '/transfers', label: 'Store Stock Transfers', icon: Truck, badge: 'Fleet', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    ],
  },
  {
    title: 'Analytics & Management',
    items: [
      { to: '/reports', label: 'Supply Chain Reports', icon: BarChart3 },
      { to: '/settings', label: 'Distribution Hub Settings', icon: Sliders },
    ],
  },
];

export function WarehouseSidebar(): React.JSX.Element {
  const { kpis, bins } = useWarehouseStore();
  const totalBins = bins.length || 8;
  const occupiedBins = bins.filter((b) => b.status === 'occupied' || b.status === 'full').length || 5;
  const utilizationPct = Math.round((occupiedBins / totalBins) * 100);

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-20">
      {/* Brand Header */}
      <div>
        <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-900/90">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
            <Warehouse className="h-4.5 w-4.5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">WarehouseOS</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Central Hub · Lahore</p>
          </div>
        </div>

        {/* Nav Links Grouped by Section */}
        <div className="p-3 space-y-5 sidebar-scroll max-h-[calc(100vh-210px)] overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              isActive ? 'bg-slate-950 text-cyan-400 border-cyan-300' : item.badgeColor
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Storage Capacity Gauge Card at Bottom */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              Bin Utilization
            </span>
            <span className="font-mono text-cyan-400 font-bold">{utilizationPct}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                utilizationPct > 85 ? 'bg-rose-500' : utilizationPct > 70 ? 'bg-cyan-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
            <span>{occupiedBins} of {totalBins} Bins Occupied</span>
            <span className="text-emerald-400 font-medium">Optimal</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
