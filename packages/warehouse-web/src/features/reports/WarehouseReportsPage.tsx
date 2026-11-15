import React from 'react';
import { BarChart3, TrendingUp, Layers, AlertTriangle, ShieldCheck, Download } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';

export function WarehouseReportsPage(): React.JSX.Element {
  const { kpis, stock, bins } = useWarehouseStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <span>Warehouse Analytics & Cycle Count Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Storage utilization ratios, stock turnover telemetry, and inter-branch fulfillment audit.
          </p>
        </div>
        <button
          onClick={() => alert('Exporting Warehouse Audit CSV...')}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-xl text-xs border border-slate-700 transition"
        >
          <Download className="h-4 w-4 text-cyan-400" />
          <span>Export Audit Log</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Stock Accuracy Rate</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{kpis?.stockAccuracyPct ?? 99.8}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Physical vs WMS System Cycle Verification</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Total Pallets Handled</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{kpis?.totalPallets ?? 42} Pallets</div>
          <p className="text-[11px] text-slate-500 mt-1">Across 4 major warehouse zones</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Expiring Lots (&lt; 30 Days)</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{kpis?.expiringItemsCount ?? 1} Items</div>
          <p className="text-[11px] text-slate-500 mt-1">First-Expired-First-Out (FEFO) Alert</p>
        </div>
      </div>
    </div>
  );
}
