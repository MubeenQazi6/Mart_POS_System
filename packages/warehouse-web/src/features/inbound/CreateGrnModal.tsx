import React, { useState } from 'react';
import { X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import type { GrnItem } from '../../types/warehouse';

interface CreateGrnModalProps {
  onClose: () => void;
}

export function CreateGrnModal({ onClose }: CreateGrnModalProps): React.JSX.Element {
  const { bins, createGrn } = useWarehouseStore();
  const [poNumber, setPoNumber] = useState('PO-2026-');
  const [supplierName, setSupplierName] = useState('');
  const [carrierName, setCarrierName] = useState('TCS Logistics');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Omit<GrnItem, 'id'>[]>([
    {
      sku: 'WH-BEV-001',
      productName: 'Olpers Full Cream Milk 1L (Carton of 12)',
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!supplierName.trim()) return;

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
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Record Goods Received Note (GRN)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify incoming purchase order shipment & assign warehouse storage bins.
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
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Supplier Name *</label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Nestle Pakistan / Unilever"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Purchase Order (PO) #</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Freight Carrier</label>
              <input
                type="text"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tracking / Bilty #</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BLT-88912"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="border-t border-slate-800/80 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-200">Received Inventory Items</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-1">Product Description</label>
                      <input
                        type="text"
                        required
                        value={item.productName}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].productName = e.target.value;
                          setItems(updated);
                        }}
                        placeholder="Product name / Variant description"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Assigned Bin Coordinate</label>
                      <select
                        value={item.allocatedBinCode}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].allocatedBinCode = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono"
                      >
                        {bins.map((b) => (
                          <option key={b.id} value={b.code}>
                            {b.code} ({b.zone.slice(0, 15)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Accepted Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.acceptedQty}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].acceptedQty = Number(e.target.value) || 0;
                          updated[idx].receivedQty = updated[idx].acceptedQty + updated[idx].rejectedQty;
                          setItems(updated);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Damaged / Rejected</label>
                      <input
                        type="number"
                        min="0"
                        value={item.rejectedQty}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].rejectedQty = Number(e.target.value) || 0;
                          updated[idx].receivedQty = updated[idx].acceptedQty + updated[idx].rejectedQty;
                          setItems(updated);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-rose-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Batch / Lot #</label>
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].batchNumber = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={item.expiryDate ?? ''}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].expiryDate = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-slate-500 hover:text-rose-400 transition"
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
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Inspection Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Seal verification pass, temperature logs attached..."
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
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Posting GRN...' : 'Approve & Stock In Bins'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
