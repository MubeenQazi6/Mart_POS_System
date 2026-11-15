import React from 'react';
import { Boxes, Bell, User, Truck, ShieldAlert } from 'lucide-react';
import { useWarehouseAuthStore } from '../../stores/warehouseAuthStore';

export function WarehouseHeader(): React.JSX.Element {
  const { user, logout } = useWarehouseAuthStore();

  return (
    <header className="h-16 bg-[#0f172a] border-b border-slate-800 px-6 flex items-center justify-between select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide text-white uppercase">WarehouseOS</span>
              <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
                DISTRIBUTION HUB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Central Warehouse #01 — Lahore Ring Road</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-3 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
            <Truck className="h-4 w-4" />
            <span>Bay 01-04 Active</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Isolated Database (warehouse.db)</span>
          </div>
        </div>

        <button
          className="relative p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center font-bold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="text-left text-xs hidden sm:block">
            <p className="font-semibold text-slate-200 leading-tight">{user?.fullName || 'Supervisor'}</p>
            <p className="text-[10px] text-cyan-400 font-mono capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={logout}
            className="text-[11px] text-slate-400 hover:text-rose-400 ml-2 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
