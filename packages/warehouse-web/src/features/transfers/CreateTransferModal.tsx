import React, { useState } from 'react';
import { X, Truck, Plus, Trash2 } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import type { TransferItem } from '../../types/warehouse';

interface CreateTransferModalProps {
  onClose: () => void;
}

export function CreateTransferModal({ onClose }: CreateTransferModalProps): React.JSX.Element {
  const { stock, createTransfer } = useWarehouseStore();
  const [destinationStore, setDestinationStore] = useState('MartPOS Retail - Al-Madina Main Super Mart');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('NORMAL');
  const [vehicleNumber, setVehicleNumber] = useState('LES-26-8812');
  const [driverName, setDriverName] = useState('Muhammad Tariq (0301-4455221)');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Omit<TransferItem, 'id'>[]>([
    {
      sku: stock[0]?.sku ?? 'WH-BEV-001',
      productName: stock[0]?.productName ?? 'Olpers Milk 1L',
      requestedQty: 50,
      pickedQty: 50,
      binSource: stock[0]?.primaryBin ?? 'A-01-01-A',
      batchNumber: stock[0]?.batches[0]?.batchNumber,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = (): void => {
    setItems((prev) => [
      ...prev,
      {
        sku: stock[1]?.sku ?? 'WH-GRO-002',
        productName: stock[1]?.productName ?? 'Dalda Oil 5L',
        requestedQty: 20,
        pickedQty: 20,
        binSource: stock[1]?.primaryBin ?? 'B-01-03-A',
        batchNumber: stock[1]?.batches[0]?.batchNumber,
      },
    ]);
  };

  const handleRemoveItem = (index: number): void => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formattedItems: TransferItem[] = items.map((item, idx) => ({
        ...item,
        id: `ti_${Date.now()}_${idx}`,
      }));

      await createTransfer({
        destinationStore,
        priority,
        status: 'DISPATCHED',
        dispatchedAt: new Date().toISOString(),
        vehicleNumber,
        driverName,
        notes: notes || undefined,
        items: formattedItems,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Create Stock Transfer Order (STO)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Replenish retail branch MartPOS counters from warehouse bins.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Destination Retail Branch *</label>
              <select
                value={destinationStore}
                onChange={(e) => setDestinationStore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="MartPOS Retail - Al-Madina Main Super Mart">MartPOS - Al-Madina Main Super Mart</option>
                <option value="MartPOS Retail - Gulberg Express Branch">MartPOS - Gulberg Express Branch</option>
                <option value="MartPOS Retail - DHA Phase 5 Store">MartPOS - DHA Phase 5 Store</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'NORMAL' | 'URGENT' | 'CRITICAL')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-cyan-400 font-semibold focus:outline-none focus:border-cyan-500"
              >
                <option value="NORMAL">NORMAL (Scheduled Dispatch)</option>
                <option value="URGENT">URGENT (Stock Out Alert)</option>
                <option value="CRITICAL">CRITICAL (Weekend Footfall)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Vehicle Registration #</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Driver Name & Contact</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-200">Items to Pick & Dispatch</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-1">Stock Item (From Available Bins)</label>
                    <select
                      value={item.sku}
                      onChange={(e) => {
                        const selected = stock.find((s) => s.sku === e.target.value);
                        const updated = [...items];
                        updated[idx].sku = e.target.value;
                        updated[idx].productName = selected?.productName ?? '';
                        updated[idx].binSource = selected?.primaryBin ?? '';
                        updated[idx].batchNumber = selected?.batches[0]?.batchNumber;
                        setItems(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      {stock.map((s) => (
                        <option key={s.id} value={s.sku}>
                          {s.sku} — {s.productName} ({s.availableQty} Avail)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] text-slate-400 block mb-1">Dispatch Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.requestedQty}
                      onChange={(e) => {
                        const updated = [...items];
                        updated[idx].requestedQty = Number(e.target.value) || 1;
                        updated[idx].pickedQty = updated[idx].requestedQty;
                        setItems(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-bold"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition mt-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Dispatch Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ensure cold chain temperature on transit..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              <Truck className="h-4 w-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Pallets to Store'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
