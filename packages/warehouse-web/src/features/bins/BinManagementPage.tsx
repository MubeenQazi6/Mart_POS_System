import React, { useState } from 'react';
import {
  Grid3X3,
  Layers,
  Plus,
  Filter,
  ShieldCheck,
  Weight,
  Search,
  Box,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  Warehouse,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { WarehouseBin } from '../../types/warehouse';

export function BinManagementPage(): React.JSX.Element {
  const { bins, stock } = useWarehouseStore();
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'available' | 'occupied' | 'full'>('ALL');
  const [selectedBin, setSelectedBin] = useState<WarehouseBin | null>(null);

  const zones = Array.from(new Set(bins.map((b) => b.zone)));

  const filteredBins = bins.filter((b) => {
    const matchesZone = selectedZone === 'ALL' || b.zone === selectedZone;
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch =
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.aisle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesZone && matchesStatus && matchesSearch;
  });

  const totalCapacityKg = bins.reduce((a, b) => a + b.maxWeightKg, 0);
  const totalOccupiedKg = bins.reduce((a, b) => a + b.currentWeightKg, 0);
  const totalSkusPlaced = bins.reduce((a, b) => a + b.currentSkuCount, 0);
  const occupiedBinsCount = bins.filter((b) => b.status !== 'available').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Bin & Rack Coordinate Telemetry"
        description="Physical multi-aisle warehouse layout coordinates, pallet load limits & SKU put-away capacity."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-3 py-1 rounded-full font-bold">
              {occupiedBinsCount} / {bins.length} Active Bins
            </span>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Warehouse Bins</span>
              <Warehouse className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{bins.length}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Across {zones.length} storage zones</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Pallet Weight Load</span>
              <Weight className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {totalOccupiedKg} <span className="text-sm font-normal text-slate-400">/ {totalCapacityKg} kg</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {Math.round((totalOccupiedKg / totalCapacityKg) * 100)}% structural capacity
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Occupied & Full</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{occupiedBinsCount}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Stock ready for picking</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Available Put-Away</span>
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
              {bins.length - occupiedBinsCount} Bins
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Empty slots for inbound</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search bin code (e.g. A-01-01)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {(['ALL', 'available', 'occupied', 'full'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition text-xs capitalize ${
                      statusFilter === st
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                <button
                  onClick={() => setSelectedZone('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedZone === 'ALL'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Zones
                </button>
                {zones.map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setSelectedZone(zone)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedZone === zone
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {zone.split(' ')[0]} {zone.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Bin Coordinate Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBins.map((bin) => {
          const loadPct = Math.round((bin.currentWeightKg / bin.maxWeightKg) * 100);
          return (
            <div
              key={bin.id}
              onClick={() => setSelectedBin(bin)}
              className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group cursor-pointer shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-white group-hover:text-cyan-300 transition">
                      {bin.code}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      bin.status === 'full'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                        : bin.status === 'occupied'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    }`}
                  >
                    {bin.status}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  Aisle {bin.aisle} · Rack {bin.rack} · Shelf {bin.shelf}
                </div>

                <p className="text-xs text-slate-300 mt-2 font-medium truncate">{bin.zone}</p>
                <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                  <Box className="h-3 w-3 text-cyan-400" />
                  <span>
                    Placement: <strong className="text-white">{bin.currentSkuCount} SKUs</strong>
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1.5">
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3 text-cyan-400" />
                    <span>Weight Load</span>
                  </span>
                  <span className="text-white font-bold">
                    {bin.currentWeightKg} / {bin.maxWeightKg} kg ({loadPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      loadPct > 85
                        ? 'bg-rose-500'
                        : loadPct > 65
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${loadPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bin Detail Modal */}
      {selectedBin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white font-mono">{selectedBin.code}</h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedBin.status === 'full'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                        : selectedBin.status === 'occupied'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    }`}
                  >
                    {selectedBin.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedBin.zone} · Aisle {selectedBin.aisle}, Rack {selectedBin.rack}, Shelf {selectedBin.shelf}
                </p>
              </div>
              <button
                onClick={() => setSelectedBin(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/90 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Current Weight</span>
                  <p className="text-base font-black text-white font-mono mt-0.5">
                    {selectedBin.currentWeightKg} kg
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Max Structural Limit</span>
                  <p className="text-base font-black text-cyan-400 font-mono mt-0.5">
                    {selectedBin.maxWeightKg} kg
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Stock Assigned To This Bin
                </h4>
                {stock.filter((s) => s.primaryBin === selectedBin.code).length > 0 ? (
                  <div className="space-y-2">
                    {stock
                      .filter((s) => s.primaryBin === selectedBin.code)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-cyan-400 block">{item.sku}</span>
                            <span className="text-white font-medium">{item.productName}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-white text-sm">{item.availableQty}</span>
                            <span className="text-slate-400 text-[10px] block">{item.unit}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                    No primary products currently designated to this coordinate.
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedBin(null)}>
                Close Telemetry
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
