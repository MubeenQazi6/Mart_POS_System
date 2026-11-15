import React, { useState } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  User,
  Boxes,
  FileText,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CreateTransferModal } from './CreateTransferModal';
import type { TransferStatus } from '../../types/warehouse';

export function StockTransfersPage(): React.JSX.Element {
  const { transfers, updateTransferStatus } = useWarehouseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransferStatus>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = transfers.filter((t) => {
    const matchesSearch =
      t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destinationStore.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.driverName && t.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTransfers = transfers.length;
  const inTransitCount = transfers.filter((t) => t.status === 'DISPATCHED').length;
  const deliveredCount = transfers.filter((t) => t.status === 'DELIVERED').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Store Transfers & Outbound Logistics"
        description="Pick, pack & dispatch bulk stock to MartPOS retail branches with automated gate-pass tracking."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-0"
          >
            New Store Transfer
          </Button>
        }
      />

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Dispatches</span>
              <Truck className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{totalTransfers}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Dispatched to MartPOS stores</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>In Transit / Freight</span>
              <Clock className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">{inTransitCount}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">En route to branch loading docks</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Delivered & Verified</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{deliveredCount}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Received by store manager</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transfer #, retail branch, driver..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['ALL', 'DRAFT', 'DISPATCHED', 'DELIVERED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                    statusFilter === st
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All Transfers' : st}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Cards / Pipeline */}
      <div className="space-y-4">
        {filtered.map((tr) => (
          <Card key={tr.id} className="bg-slate-900/90 border-slate-800 overflow-hidden hover:border-slate-700 transition">
            <CardContent className="p-5">
              {/* Card Header Strip */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-white">{tr.transferNumber}</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      tr.status === 'DELIVERED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : tr.status === 'DISPATCHED'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                        : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                    }`}
                  >
                    {tr.status}
                  </span>
                  {tr.priority === 'URGENT' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800/60 animate-pulse">
                      URGENT RESTOCK
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {new Date(tr.createdAt).toLocaleDateString()} at{' '}
                    {new Date(tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Destination & Logistics Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                    Destination Retail Branch
                  </span>
                  <p className="text-xs font-bold text-white mt-1 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>{tr.destinationStore}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                    Assigned Fleet & Driver
                  </span>
                  <p className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Vehicle: {tr.vehicleNumber ?? 'Standard Fleet'}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{tr.driverName ?? 'Designated Courier'}</span>
                  </p>
                </div>

                <div className="flex items-center justify-start md:justify-end gap-2">
                  {tr.status === 'DISPATCHED' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void updateTransferStatus(tr.id, 'DELIVERED')}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0"
                    >
                      Confirm Retail Receipt
                    </Button>
                  ) : tr.status === 'DELIVERED' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/60">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Fulfillment Verified</span>
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void updateTransferStatus(tr.id, 'DISPATCHED')}
                      leftIcon={<Truck className="h-4 w-4" />}
                      className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold border-0"
                    >
                      Dispatch Consignment
                    </Button>
                  )}
                </div>
              </div>

              {/* Line Items List */}
              <div className="mt-4 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Manifested SKUs ({tr.items.length} Lines)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tr.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-cyan-400">{item.sku}</span>
                          <span className="text-white font-medium truncate max-w-[150px]">{item.productName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          From Bin: <strong className="text-slate-300">{item.binSource}</strong>
                          {item.batchNumber && <span> · Batch: {item.batchNumber}</span>}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-white font-black text-sm">{item.pickedQty}</span>
                        <span className="text-slate-400 text-[10px] block">/ {item.requestedQty} Units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {tr.notes && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-slate-300 font-bold">Logistics Note: </span>
                  {tr.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showCreateModal && <CreateTransferModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
