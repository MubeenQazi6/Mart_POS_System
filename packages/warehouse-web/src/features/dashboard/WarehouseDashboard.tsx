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
  RefreshCw,
  Warehouse,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CreateGrnModal } from '../inbound/CreateGrnModal';
import { CreateTransferModal } from '../transfers/CreateTransferModal';

export function WarehouseDashboard(): React.JSX.Element {
  const { kpis, bins, stock, grns, transfers, isLoading, loadAll, updateTransferStatus } =
    useWarehouseStore();
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  useEffect(() => {
    void loadAll();
    setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [loadAll]);

  const handleRefresh = async (): Promise<void> => {
    await loadAll();
    setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  // Group bins by zone for zone capacity overview
  const zones = ['Zone A (Beverages)', 'Zone B (Groceries & Staples)', 'Zone C (Snacks & Confectionery)', 'Zone D (Household & Toiletries)'];
  const zoneStats = zones.map((zoneName) => {
    const zoneBins = bins.filter((b) => b.zone === zoneName);
    const totalMax = zoneBins.reduce((acc, b) => acc + b.maxWeightKg, 0) || 1;
    const totalCurrent = zoneBins.reduce((acc, b) => acc + b.currentWeightKg, 0);
    const pct = Math.min(100, Math.round((totalCurrent / totalMax) * 100));
    return {
      name: zoneName,
      binCount: zoneBins.length,
      occupancyPct: pct,
      currentKg: totalCurrent,
      maxKg: totalMax,
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title="Warehouse Operations Center"
        description="Real-time multi-aisle inventory telemetry, inbound freight inspection & retail branch dispatches."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-400 font-mono hidden md:inline-flex items-center gap-1.5 mr-1">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>Synced {lastRefreshed || 'now'}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="h-3.5 w-3.5 text-cyan-400" />}
            >
              Refresh Telemetry
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowGrnModal(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-0"
            >
              New Inbound GRN
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTransferModal(true)}
              leftIcon={<Truck className="h-3.5 w-3.5 text-cyan-400" />}
            >
              Dispatch to Retail Mart
            </Button>
          </div>
        }
      />

      {/* TOP 4 PRIMARY KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Warehouse SKUs */}
        <Card className="border-l-4 border-l-cyan-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Warehouse SKUs
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 shadow-xs border border-cyan-500/20">
                <Boxes className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black tracking-tight text-white font-mono">
                {kpis?.totalSkus ?? stock.length}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Active master wholesale items
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Rack & Bin Occupancy */}
        <Card className="border-l-4 border-l-blue-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rack / Bin Occupancy
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 shadow-xs border border-blue-500/20">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black tracking-tight text-white font-mono">
                  {kpis?.binCapacityUsedPct ?? 68}%
                </p>
                <span className="text-[11px] font-mono text-cyan-400">
                  {bins.filter((b) => b.status !== 'available').length} / {bins.length} Bins Active
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${kpis?.binCapacityUsedPct ?? 68}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Inbound Freight Inspection */}
        <Card className="border-l-4 border-l-emerald-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inbound Freight
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shadow-xs border border-emerald-500/20">
                <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black tracking-tight text-white font-mono">
                {kpis?.pendingInboundGrn ?? 2}
              </p>
              <p className="mt-1 text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                Under QC Inspection & Put-away
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Active Store Dispatches */}
        <Card className="border-l-4 border-l-violet-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Mart Dispatches
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 shadow-xs border border-violet-500/20">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black tracking-tight text-white font-mono">
                {kpis?.activeDispatches ?? 3}
              </p>
              <p className="mt-1 text-xs font-medium text-cyan-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Dispatched to MartPOS branches
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECONDARY METRICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono">{kpis?.stockAccuracyPct ?? 99.8}%</div>
            <div className="text-[10px] text-slate-400">WMS Accuracy Rate</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Warehouse className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono">{bins.length} Active Bins</div>
            <div className="text-[10px] text-slate-400">4 Warehousing Zones</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono">{kpis?.expiringItemsCount ?? 1} Batch Lots</div>
            <div className="text-[10px] text-slate-400">FEFO Expiry Watch</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono">{kpis?.totalPallets ?? 42} Pallets</div>
            <div className="text-[10px] text-slate-400">Pallet Volume Managed</div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: INBOUND VS DISPATCH TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent GRN Inbound Freight */}
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                <span>Recent Inbound Shipments (GRN)</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Supplier PO deliveries received at inbound docking bays
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-0.5 rounded-full">
              {grns.length} Total
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {grns.slice(0, 4).map((grn) => (
                <div
                  key={grn.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between hover:border-cyan-500/40 transition group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{grn.grnNumber}</span>
                      <span className="text-[10px] font-mono text-slate-400 border border-slate-800 rounded px-1.5 py-0.2 bg-slate-900">
                        {grn.poNumber}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">{grn.supplierName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Carrier: {grn.carrierName} · {grn.totalItems} cartons received
                    </div>
                  </div>
                  <div className="text-right space-y-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        grn.status === 'APPROVED'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                      }`}
                    >
                      {grn.status === 'APPROVED' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      <span>{grn.status === 'APPROVED' ? 'Stock Put-Away' : 'Pending QC'}</span>
                    </span>
                    <div className="text-[10px] font-mono text-slate-500">
                      {new Date(grn.receivedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Store Transfer Dispatches */}
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-400" />
                <span>Retail Mart Dispatches (STO)</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Outbound replenishment orders to MartPOS branches
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-violet-400 bg-violet-950/80 border border-violet-800/60 px-2.5 py-0.5 rounded-full">
              {transfers.length} Dispatches
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {transfers.slice(0, 4).map((tr) => (
                <div
                  key={tr.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between hover:border-violet-500/40 transition group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{tr.transferNumber}</span>
                      {tr.priority === 'URGENT' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/60 animate-pulse">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{tr.destinationStore}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Vehicle: {tr.vehicleNumber ?? 'LES-26-8812'} · {tr.driverName ?? 'Assigned Logistics'}
                    </div>
                  </div>
                  <div className="text-right space-y-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tr.status === 'DELIVERED'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : tr.status === 'DISPATCHED'
                          ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                          : 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                      }`}
                    >
                      <span>{tr.status}</span>
                    </span>
                    <div className="text-[10px] font-mono text-slate-500">
                      {new Date(tr.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* STORAGE ZONE OCCUPANCY BREAKDOWN */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <span>Warehousing Zone Capacity & Weight Telemetry</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Live load distribution across physical warehouse racking bays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {zoneStats.map((zone) => (
              <div
                key={zone.name}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{zone.name}</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{zone.occupancyPct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      zone.occupancyPct > 85
                        ? 'bg-rose-500'
                        : zone.occupancyPct > 65
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${zone.occupancyPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{zone.binCount} Bins</span>
                  <span>
                    {zone.currentKg} / {zone.maxKg} kg
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {showGrnModal && <CreateGrnModal onClose={() => setShowGrnModal(false)} />}
      {showTransferModal && <CreateTransferModal onClose={() => setShowTransferModal(false)} />}
    </div>
  );
}
