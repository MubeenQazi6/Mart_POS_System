import React, { useState } from 'react';
import { X, CheckCircle2, Plus, Trash2, Package, Layers, MapPin, Calendar, Truck } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { Button } from '../../components/ui/Button';
import type { GrnItem } from '../../types/warehouse';

interface CreateGrnModalProps {
  onClose: () => void;
}

export function CreateGrnModal({ onClose }: CreateGrnModalProps): React.JSX.Element {
  const { bins, stock, createGrn } = useWarehouseStore();
  const [poNumber, setPoNumber] = useState(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [supplierName, setSupplierName] = useState('');
  const [carrierName, setCarrierName] = useState('TCS Logistics Fleet');
  const [trackingNumber, setTrackingNumber] = useState(`BLT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Omit<GrnItem, 'id'>[]>([
    {
      sku: stock[0]?.sku ?? 'WH-BEV-001',
      productName: stock[0]?.productName ?? 'Olpers Full Cream Milk 1L (Carton of 12)',
      expectedQty: 100,
      receivedQty: 100,
      acceptedQty: 100,
      rejectedQty: 0,
      unit: 'Carton',
      batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
      expiryDate: '2027-01-31',
      allocatedBinCode: bins[0]?.code ?? 'A-01-01-A',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = (): void => {
    setItems((prev) => [
      ...prev,
      {
        sku: 'WH-NEW-SKU',
        productName: '',
        expectedQty: 50,
        receivedQty: 50,
        acceptedQty: 50,
        rejectedQty: 0,
        unit: 'Carton',
        batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
        expiryDate: '2027-06-30',
        allocatedBinCode: bins[0]?.code ?? 'A-01-01-A',
      },
    ]);
  };

  const handleRemoveItem = (index: number): void => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof Omit<GrnItem, 'id'>,
    value: string | number
  ): void => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('Please enter a Supplier Name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedItems: GrnItem[] = items.map((item, idx) => ({
        ...item,
        id: `gi_${Date.now()}_${idx}`,
      }));

      const totalItems = formattedItems.reduce((acc, curr) => acc + curr.acceptedQty, 0);

      await createGrn({
        poNumber,
        supplierName,
        carrierName,
        trackingNumber: trackingNumber || undefined,
        receivedBy: 'Warehouse Inbound Supervisor',
        status: 'APPROVED',
        totalItems,
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
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-400" />
              <span>Record Inbound Goods Received Note (GRN)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inward wholesale merchandise, capture batch barcodes & allocate warehouse storage bins.
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
          {/* Freight & PO Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">PO Reference # *</label>
              <input
                type="text"
                required
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Supplier Name *</label>
              <input
                type="text"
                required
                value={supplierName}
                placeholder="e.g. Engro Foods / Unilever"
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Logistics Carrier</label>
              <input
                type="text"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Bilty / Tracking #</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span>Inward Line Items & Bin Put-Away</span>
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
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Master SKU</label>
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Product Description</label>
                      <input
                        type="text"
                        value={item.productName}
                        placeholder="Product title"
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Accepted Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.acceptedQty}
                        onChange={(e) => handleItemChange(idx, 'acceptedQty', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono text-right focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Put-Away Bin</label>
                      <select
                        value={item.allocatedBinCode}
                        onChange={(e) => handleItemChange(idx, 'allocatedBinCode', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      >
                        {bins.map((b) => (
                          <option key={b.id} value={b.code}>
                            {b.code} ({b.zone.split(' ')[0]})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-900">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Lot / Batch #</label>
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Expiration Date</label>
                      <input
                        type="date"
                        value={item.expiryDate ?? ''}
                        onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Packaging Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Dock Receiving Remarks / QC Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Seals verified intact, temperature checked, pallet shrink-wrapped properly."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Total Inward Quantity: <strong className="text-white">{items.reduce((a, c) => a + c.acceptedQty, 0)} Units</strong>
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
                Approve & Commit GRN
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
