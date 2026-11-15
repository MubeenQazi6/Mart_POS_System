import React, { useState } from 'react';
import { Grid3X3, Layers, Plus, Filter, ShieldCheck, Weight } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import type { BinStatus } from '../../types/warehouse';

export function BinManagementPage(): React.JSX.Element {
  const { bins } = useWarehouseStore();
  const [selectedZone, setSelectedZone] = useState('ALL');

  const zones = Array.from(new Set(bins.map((b) => b.zone)));

  const filteredBins = bins.filter((b) => selectedZone === 'ALL' || b.zone === selectedZone);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-cyan-400" />
            <span>Bin & Rack Coordinate Telemetry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Physical layout coordinates, pallet weight load limits & SKU put-away capacity.
          </p>
        </div>
      </div>

      {/* Zone Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedZone('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            selectedZone === 'ALL'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Zones ({bins.length})
        </button>
        {zones.map((zone) => (
          <button
            key={zone}
            onClick={() => setSelectedZone(zone)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedZone === zone
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {zone}
          </button>
        ))}
      </div>

      {/* Interactive Bin Coordinate Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBins.map((bin) => {
          const loadPct = Math.round((bin.currentWeightKg / bin.maxWeightKg) * 100);
          return (
            <div
              key={bin.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition group shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-white">{bin.code}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Aisle {bin.aisle} · R{bin.rack} · S{bin.shelf}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      bin.status === 'full'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                        : bin.status === 'occupied'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                    }`}
                  >
                    {bin.status}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 font-medium">{bin.zone}</p>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  SKU Placements: <span className="font-bold text-white">{bin.currentSkuCount} Products</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3 text-cyan-400" />
                    <span>Weight Load</span>
                  </span>
                  <span>
                    {bin.currentWeightKg} / {bin.maxWeightKg} kg ({loadPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-1.5 rounded-full ${
                      loadPct > 80 ? 'bg-rose-500' : loadPct > 50 ? 'bg-cyan-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(loadPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
