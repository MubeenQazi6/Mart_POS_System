import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { WarehouseDownloadDesktopModal } from '../ui/WarehouseDownloadDesktopModal';
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
  Monitor,
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
      { to: '/inbound', label: 'Inbound GRN Receipts', icon: FileInput, badge: 'Inward', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      { to: '/bins', label: 'Bin & Rack Matrix', icon: Grid3X3 },
      { to: '/stock', label: 'Master Inventory & Batches', icon: PackageSearch },
      { to: '/transfers', label: 'Store Stock Transfers', icon: Truck, badge: 'Fleet', badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
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
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const { kpis, bins } = useWarehouseStore();
  const totalBins = bins.length || 8;
  const occupiedBins = bins.filter((b) => b.status === 'occupied' || b.status === 'full').length || 5;
  const utilizationPct = Math.round((occupiedBins / totalBins) * 100);

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-20">
      {/* Brand Header */}
      <div>
        <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
            <Warehouse className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white uppercase">WarehouseOS</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-amber-400/90 font-mono">Central Hub · Lahore</p>
          </div>
        </div>

        {/* Nav Links Grouped by Section */}
        <div className="p-3 space-y-5 sidebar-scroll max-h-[calc(100vh-220px)] overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                          ? 'bg-brand-600 text-white shadow-xs font-bold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              isActive ? 'bg-slate-950 text-amber-400 border-amber-400/40' : item.badgeColor
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

      {/* Footer Area with Desktop Download and Storage Capacity */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        {/* Download Desktop App Button */}
        <button
          type="button"
          onClick={() => setShowDownloadModal(true)}
          className="w-full mb-2.5 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 hover:border-amber-400 text-amber-400 hover:text-amber-300 transition-all text-xs font-semibold group"
          title="Download Desktop App"
        >
          <Monitor className="h-4 w-4 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
          <div className="text-left min-w-0 flex-1">
            <span className="block font-bold text-white text-[11px] group-hover:text-amber-400 transition-colors">
              Download Desktop App
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">100% Offline warehouse.db</span>
          </div>
        </button>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
              <Boxes className="w-3.5 h-3.5 text-amber-400" />
              Bin Utilization
            </span>
            <span className="font-mono text-amber-400 font-bold text-[11px]">{utilizationPct}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                utilizationPct > 85 ? 'bg-rose-500' : utilizationPct > 70 ? 'bg-brand-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
            <span>{occupiedBins} of {totalBins} Bins Occupied</span>
            <span className="text-emerald-400 font-medium">Optimal</span>
          </div>
        </div>
      </div>

      <WarehouseDownloadDesktopModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        appName="WarehouseOS Enterprise Desktop"
        version="v1.0.0"
      />
    </aside>
  );
}
