import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Truck,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { CreateGrnModal } from '../inbound/CreateGrnModal';
import { CreateTransferModal } from '../transfers/CreateTransferModal';

export function WarehouseDashboard(): React.JSX.Element {
  const { kpis, bins, grns, transfers, loadAll } = useWarehouseStore();
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Warehouse Operations Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-aisle inventory telemetry, inbound freight inspection & retail branch dispatches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGrnModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Inbound GRN</span>
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition"
          >
            <Truck className="h-4 w-4 text-cyan-400" />
            <span>Dispatch to Retail Mart</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Warehouse SKUs</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{kpis?.totalSkus ?? 0}</span>
            <span className="text-[11px] text-cyan-400 font-medium">Catalog items</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">Mapped to Aisle & Bin coordinates</p>
        </div>

        {/* Bin Capacity */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Rack / Bin Occupancy</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{kpis?.binCapacityUsedPct ?? 0}%</span>
            <span className="text-[11px] text-slate-400">Capacity Used</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-1.5 rounded-full"
              style={{ width: `${kpis?.binCapacityUsedPct ?? 0}%` }}
            />
          </div>
        </div>

        {/* Inbound GRNs */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Inbound Freight Receipts</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{kpis?.pendingInboundGrn ?? 0}</span>
            <span className="text-[11px] text-amber-400 font-medium">Under QC Inspection</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">PO validation & barcode verification</p>
        </div>

        {/* Outbound Transfers */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Store Transfers</span>
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{kpis?.activeDispatches ?? 0}</span>
            <span className="text-[11px] text-cyan-400 font-medium">In Transit / Picking</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">Dispatched to MartPOS retail counters</p>
        </div>
      </div>

      {/* Two Column Grid: Recent Inbound vs Store Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent GRN Inbound */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                <span>Recent Goods Received Notes (GRN)</span>
              </h2>
              <p className="text-[11px] text-slate-400">Shipments received at loading dock</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-semibold">{grns.length} Total</span>
          </div>

          <div className="space-y-3">
            {grns.map((grn) => (
              <div
                key={grn.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{grn.grnNumber}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        grn.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {grn.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{grn.supplierName}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Carrier: {grn.carrierName} · Tracking: {grn.trackingNumber ?? 'Local Truck'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{grn.totalItems} Items</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(grn.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Store Dispatches */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-400" />
                <span>Outbound Store Replenishments</span>
              </h2>
              <p className="text-[11px] text-slate-400">Stock transfers to retail branch inventory</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-semibold">{transfers.length} Total</span>
          </div>

          <div className="space-y-3">
            {transfers.map((tr) => (
              <div
                key={tr.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{tr.transferNumber}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        tr.status === 'DISPATCHED'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                          : 'bg-blue-950 text-blue-400 border border-blue-800/50'
                      }`}
                    >
                      {tr.status}
                    </span>
                    {tr.priority === 'URGENT' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/50">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{tr.destinationStore}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Vehicle: {tr.vehicleNumber ?? 'Pending assignment'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{tr.items.length} SKUs</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(tr.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bin Coordinates Summary */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Zone & Aisle Coordinate Telemetry</span>
            </h2>
            <p className="text-[11px] text-slate-400">Fast overview of warehouse storage zones</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{bins.length} Active Bins</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bins.map((bin) => (
            <div
              key={bin.id}
              className={`p-3 rounded-xl border ${
                bin.status === 'full'
                  ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                  : bin.status === 'occupied'
                  ? 'bg-cyan-950/20 border-cyan-900/40 text-cyan-300'
                  : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white">{bin.code}</span>
                <span className="text-[9px] font-bold uppercase">{bin.status}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">{bin.zone}</p>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                <span>{bin.currentWeightKg} kg</span>
                <span>Max: {bin.maxWeightKg} kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showGrnModal && <CreateGrnModal onClose={() => setShowGrnModal(false)} />}
      {showTransferModal && <CreateTransferModal onClose={() => setShowTransferModal(false)} />}
    </div>
  );
}
