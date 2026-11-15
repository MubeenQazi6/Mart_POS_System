import React, { useState } from 'react';
import { FileInput, Plus, Search, Filter, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { CreateGrnModal } from './CreateGrnModal';

export function GrnListPage(): React.JSX.Element {
  const { grns } = useWarehouseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING_INSPECTION'>('ALL');
  const [showModal, setShowModal] = useState(false);

  const filtered = grns.filter((g) => {
    const matchesSearch =
      g.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <FileInput className="h-5 w-5 text-cyan-400" />
            <span>Goods Received Notes (Inbound Inward)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supplier purchase shipments, quality check approvals & put-away bin assignments.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New GRN Entry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search GRN #, supplier, or PO..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500 hidden sm:block" />
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['ALL', 'APPROVED', 'PENDING_INSPECTION'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === st
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All GRNs' : st === 'APPROVED' ? 'Approved' : 'Pending QC'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRN Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">GRN Number</th>
                <th className="p-3.5">PO Ref</th>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5">Carrier / Bilty</th>
                <th className="p-3.5">Received Date</th>
                <th className="p-3.5 text-center">Items</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((grn) => (
                <tr key={grn.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-mono font-bold text-white flex items-center gap-2">
                    <span className="text-cyan-400">{grn.grnNumber}</span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">{grn.poNumber}</td>
                  <td className="p-3.5 font-medium text-slate-200">{grn.supplierName}</td>
                  <td className="p-3.5 text-slate-400 font-mono">
                    {grn.carrierName} ({grn.trackingNumber ?? 'Local'})
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono">
                    {new Date(grn.receivedAt).toLocaleDateString()} {new Date(grn.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3.5 text-center font-bold text-white">{grn.totalItems}</td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        grn.status === 'APPROVED'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                      }`}
                    >
                      {grn.status === 'APPROVED' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      <span>{grn.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <CreateGrnModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
