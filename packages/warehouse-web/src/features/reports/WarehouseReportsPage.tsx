import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Layers,
  AlertTriangle,
  ShieldCheck,
  Download,
  Calendar,
  Truck,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function WarehouseReportsPage(): React.JSX.Element {
  const { kpis, stock, bins, transfers, grns } = useWarehouseStore();
  const [isExporting, setIsExporting] = useState(false);

  // Group transfers by destination
  const storeDispatches = transfers.reduce<Record<string, { count: number; totalUnits: number }>>(
    (acc, tr) => {
      const units = tr.items.reduce((s, i) => s + i.pickedQty, 0);
      if (!acc[tr.destinationStore]) {
        acc[tr.destinationStore] = { count: 0, totalUnits: 0 };
      }
      acc[tr.destinationStore].count += 1;
      acc[tr.destinationStore].totalUnits += units;
      return acc;
    },
    {}
  );

  const handleExportCsv = (): void => {
    setIsExporting(true);
    try {
      const headers = ['SKU', 'Product Name', 'Category', 'Primary Bin', 'Available Qty', 'Allocated Qty', 'Unit'];
      const rows = stock.map((s) => [
        `"${s.sku}"`,
        `"${s.productName}"`,
        `"${s.category}"`,
        `"${s.primaryBin}"`,
        s.availableQty,
        s.allocatedQty,
        `"${s.unit}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `WarehouseOS_Master_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Warehouse Analytics & Audit Telemetry"
        description="Storage utilization ratios, stock turnover telemetry, FEFO expiry risks & inter-branch fulfillment audit."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            isLoading={isExporting}
            leftIcon={<Download className="h-4 w-4 text-cyan-400" />}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-white font-medium"
          >
            Export Stock Audit CSV
          </Button>
        }
      />

      {/* Primary Analytical Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="uppercase tracking-wider font-bold">WMS Stock Accuracy</span>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-2">
              {kpis?.stockAccuracyPct ?? 99.8}%
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Cycle count verification index</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="uppercase tracking-wider font-bold">Pallet Capacity Used</span>
              <Layers className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-2">
              {kpis?.binCapacityUsedPct ?? 68}%
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">42 Pallets in 4 Warehousing Zones</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="uppercase tracking-wider font-bold">Fulfillment Rate</span>
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-2">100.0%</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Zero unfulfilled store orders</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-slate-900/90 border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="uppercase tracking-wider font-bold">FEFO Expiry Alert</span>
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-2">
              {kpis?.expiringItemsCount ?? 1} Lots
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">&lt; 30 days before expiration</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inter-Branch Fulfillment Breakdown */}
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-cyan-400" />
              <span>Inter-Branch Retail Mart Replenishment</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Dispatches delivered to MartPOS retail counters across Lahore
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(storeDispatches).map(([storeName, data]) => (
                <div
                  key={storeName}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs text-white block">{storeName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {data.count} Shipments Dispatched
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-black text-cyan-400 text-sm">{data.totalUnits}</span>
                    <span className="text-slate-500 text-[10px] block">Units Stocked</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FEFO Expiry Risk Telemetry */}
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>First-Expired-First-Out (FEFO) Timeline</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Expiring inventory lots prioritized for dispatch to high-velocity mart branches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stock
                .flatMap((s) => s.batches.map((b) => ({ ...b, productName: s.productName, bin: s.primaryBin })))
                .slice(0, 4)
                .map((batch) => (
                  <div
                    key={batch.batchNumber}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{batch.batchNumber}</span>
                        <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/60">
                          {batch.bin}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{batch.productName}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-amber-400 font-bold text-xs">Exp: {batch.expiryDate ?? 'N/A'}</div>
                      <div className="text-slate-500 text-[10px]">{batch.qty} Cartons Left</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
