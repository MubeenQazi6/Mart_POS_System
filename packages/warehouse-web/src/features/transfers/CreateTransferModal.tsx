import React, { useState } from 'react';
import { X, Truck, Plus, Trash2, MapPin, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { Button } from '../../components/ui/Button';
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
    const itemOption = stock[items.length % stock.length] ?? stock[0];
    setItems((prev) => [
      ...prev,
      {
        sku: itemOption?.sku ?? 'WH-GRO-002',
        productName: itemOption?.productName ?? 'Dalda Cooking Oil 5L',
        requestedQty: 25,
        pickedQty: 25,
        binSource: itemOption?.primaryBin ?? 'B-01-03-A',
        batchNumber: itemOption?.batches[0]?.batchNumber,
      },
    ]);
  };

  const handleRemoveItem = (index: number): void => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof Omit<TransferItem, 'id'>,
    value: string | number
  ): void => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSelectProduct = (index: number, selectedSku: string): void => {
    const found = stock.find((s) => s.sku === selectedSku);
    if (found) {
      setItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          sku: found.sku,
          productName: found.productName,
          binSource: found.primaryBin,
          batchNumber: found.batches[0]?.batchNumber,
        };
        return copy;
      });
    }
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
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-400" />
              <span>Create Stock Transfer Order (STO)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Replenish retail branch MartPOS counters from warehouse storage bins.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {/* Branch & Logistics Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Destination Retail Branch *</label>
              <select
                value={destinationStore}
                onChange={(e) => setDestinationStore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="MartPOS Retail - Al-Madina Main Super Mart">
                  MartPOS Retail - Al-Madina Main Super Mart (DHA Phase 5)
                </option>
                <option value="MartPOS Retail - Gulberg Express Mart">
                  MartPOS Retail - Gulberg Express Mart (Gulberg III)
                </option>
                <option value="MartPOS Retail - Bahria Town Super Store">
                  MartPOS Retail - Bahria Town Super Store (Sector C)
                </option>
                <option value="MartPOS Retail - Johar Town Mega Mart">
                  MartPOS Retail - Johar Town Mega Mart (G-1 Market)
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Dispatch Priority Level</label>
              <div className="flex items-center gap-2">
                {(['NORMAL', 'URGENT', 'CRITICAL'] as const).map((pr) => (
                  <button
                    type="button"
                    key={pr}
                    onClick={() => setPriority(pr)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      priority === pr
                        ? pr === 'CRITICAL' || pr === 'URGENT'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Logistics Vehicle #</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Assigned Driver & Phone</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span>Dispatch SKUs to Pick</span>
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                leftIcon={<Plus className="h-3.5 w-3.5 text-cyan-400" />}
                className="text-xs h-8 bg-slate-950 border-slate-800 hover:bg-slate-800"
              >
                Add SKU Line
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Select Product Catalog SKU</label>
                      <select
                        value={item.sku}
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {stock.map((s) => (
                          <option key={s.id} value={s.sku}>
                            {s.sku} — {s.productName} ({s.availableQty} in stock)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Pick From Bin</label>
                      <input
                        type="text"
                        value={item.binSource}
                        onChange={(e) => handleItemChange(idx, 'binSource', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Transfer Qty (Cartons)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.requestedQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          handleItemChange(idx, 'requestedQty', val);
                          handleItemChange(idx, 'pickedQty', val);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono text-right focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition"
                          title="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Gate-Pass / Security Dispatch Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special instructions for branch unloading bay, gate-pass seal #."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Total Dispatch: <strong className="text-white">{items.reduce((a, c) => a + c.requestedQty, 0)} Units</strong>
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-0"
              >
                Issue Gate-Pass & Dispatch
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
