import React, { useState } from 'react';
import {
  FileInput,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Building2,
  Calendar,
  Truck,
  Layers,
  MapPin,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CreateGrnModal } from './CreateGrnModal';
import type { GoodsReceivedNote, GrnItem } from '../../types/warehouse';

export function GrnListPage(): React.JSX.Element {
  const { grns, updateGrnStatus } = useWarehouseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING_INSPECTION'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceivedNote | null>(null);

  const filtered = grns.filter((g) => {
    const matchesSearch =
      g.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.carrierName && g.carrierName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCartons = grns.reduce((acc, g) => acc + g.totalItems, 0);
  const approvedCount = grns.filter((g) => g.status === 'APPROVED').length;
  const pendingCount = grns.filter((g) => g.status === 'PENDING_INSPECTION').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Goods Received Notes (Inbound Inward)"
        description="Verify supplier purchase shipments, execute quality assurance approvals & put-away bin assignments."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-0"
          >
            New GRN Inward
          </Button>
        }
      />

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Shipments</span>
              <FileInput className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{grns.length}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Recorded in warehouse ledger</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Cartons Inwarded</span>
              <Layers className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{totalCartons} Units</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Cumulative item volume</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Approved & Put-Away</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{approvedCount}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Stock available in bins</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Pending QC Inspection</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{pendingCount}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Dock staging quarantine</p>
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
                placeholder="Search by GRN #, PO #, supplier, carrier..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-500 hidden sm:block" />
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {(['ALL', 'APPROVED', 'PENDING_INSPECTION'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition text-xs ${
                      statusFilter === st
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All GRNs' : st === 'APPROVED' ? 'Approved' : 'Pending QC'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise GRN Table */}
      <Card className="bg-slate-900/90 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-4">GRN & PO Ref</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Carrier & Tracking</th>
                <th className="p-4">Inward Date</th>
                <th className="p-4 text-center">Items</th>
                <th className="p-4 text-center">QC Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((grn) => (
                <tr key={grn.id} className="hover:bg-slate-800/30 transition">
                  {/* GRN & PO */}
                  <td className="p-4">
                    <div className="font-mono font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-400">{grn.grnNumber}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span className="text-slate-500">PO:</span>
                      <span className="text-slate-300">{grn.poNumber}</span>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="p-4">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{grn.supplierName}</span>
                    </div>
                    {grn.receivedBy && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Received by: {grn.receivedBy}
                      </div>
                    )}
                  </td>

                  {/* Carrier & Tracking */}
                  <td className="p-4">
                    <div className="text-slate-300 font-mono flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{grn.carrierName || 'Direct Delivery'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Bilty: {grn.trackingNumber || 'Local City Dispatch'}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="p-4 font-mono text-slate-400">
                    <div>{new Date(grn.receivedAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(grn.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  {/* Items */}
                  <td className="p-4 text-center">
                    <span className="font-bold font-mono text-white text-sm">{grn.totalItems}</span>
                    <span className="text-[10px] text-slate-500 block">cartons</span>
                  </td>

                  {/* Status */}
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
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
                      <span>{grn.status === 'APPROVED' ? 'Approved (In Stock)' : 'Pending QC'}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedGrn(grn)}
                        leftIcon={<Eye className="h-3.5 w-3.5 text-cyan-400" />}
                        className="text-xs h-8 px-2.5 bg-slate-950 border-slate-800 hover:bg-slate-800"
                      >
                        Inspect
                      </Button>
                      {grn.status === 'PENDING_INSPECTION' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => void updateGrnStatus(grn.id, 'APPROVED')}
                          leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                          className="text-xs h-8 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0"
                        >
                          Approve QC
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INSPECT GRN MODAL / DRAWER */}
      {selectedGrn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white font-mono">{selectedGrn.grnNumber}</h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedGrn.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                    }`}
                  >
                    {selectedGrn.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  PO: <span className="font-mono text-cyan-400">{selectedGrn.poNumber}</span> · Supplier:{' '}
                  <span className="text-white font-semibold">{selectedGrn.supplierName}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedGrn(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inward Line-Items & Put-Away Bins
              </h3>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/90">
                {selectedGrn.items.map((item: GrnItem) => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">{item.sku}</span>
                        <span className="font-semibold text-xs text-white">{item.productName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                        <span>Batch: <strong className="text-white">{item.batchNumber}</strong></span>
                        {item.expiryDate && (
                          <span>Expiry: <strong className="text-amber-400">{item.expiryDate}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Accepted / Expected</span>
                        <span className="font-bold text-emerald-400">
                          {item.acceptedQty} / {item.expectedQty} {item.unit}
                        </span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-center">
                        <span className="text-slate-500 text-[10px] block">Put-Away Bin</span>
                        <span className="font-bold text-cyan-300 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-cyan-400" />
                          <span>{item.allocatedBinCode}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedGrn.notes && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <strong className="text-slate-300 block mb-0.5">Dock Notes:</strong>
                  {selectedGrn.notes}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setSelectedGrn(null)}>
                Close Inspection
              </Button>
              {selectedGrn.status === 'PENDING_INSPECTION' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    await updateGrnStatus(selectedGrn.id, 'APPROVED');
                    setSelectedGrn(null);
                  }}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0"
                >
                  Approve QC & Finalize Put-Away
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && <CreateGrnModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
