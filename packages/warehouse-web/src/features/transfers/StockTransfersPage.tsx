import React, { useState } from 'react';
import { Truck, Plus, CheckCircle2, Clock, MapPin, Search } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { CreateTransferModal } from './CreateTransferModal';

export function StockTransfersPage(): React.JSX.Element {
  const { transfers, updateTransferStatus } = useWarehouseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = transfers.filter(
    (t) =>
      t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destinationStore.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-cyan-400" />
            <span>Store Transfers & Outbound Logistics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pick, pack, and dispatch bulk stock to MartPOS retail branches with automated gate-pass tracking.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Store Transfer</span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transfer # or branch name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <span className="text-xs font-mono text-cyan-400 font-semibold hidden sm:block">
          {transfers.length} Transfer Dispatches
        </span>
      </div>

      {/* Transfers Cards / List */}
      <div className="space-y-4">
        {filtered.map((tr) => (
          <div
            key={tr.id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-black text-white">{tr.transferNumber}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tr.status === 'DELIVERED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                      : tr.status === 'DISPATCHED'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                      : 'bg-blue-950 text-blue-400 border border-blue-800/50'
                  }`}
                >
                  {tr.status}
                </span>
                {tr.priority === 'URGENT' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800/50">
                    URGENT RESTOCK
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-slate-400">
                Created: {new Date(tr.createdAt).toLocaleDateString()} {new Date(tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Destination Store</span>
                <p className="text-xs font-bold text-white mt-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{tr.destinationStore}</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Transit Logistics</span>
                <p className="text-xs text-slate-300 font-mono mt-1">
                  Vehicle: {tr.vehicleNumber ?? 'Standard Delivery'} · {tr.driverName ?? 'Assigned Carrier'}
                </p>
              </div>
              <div className="flex items-center justify-start md:justify-end gap-2">
                {tr.status === 'DISPATCHED' && (
                  <button
                    onClick={() => updateTransferStatus(tr.id, 'DELIVERED')}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm Branch Delivery</span>
                  </button>
                )}
              </div>
            </div>

            {/* Items inside transfer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                Pallet Items Dispatched ({tr.items.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tr.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{item.productName}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-2">Bin: {item.binSource}</span>
                    </div>
                    <span className="font-mono font-bold text-cyan-400">{item.pickedQty} Units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && <CreateTransferModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
