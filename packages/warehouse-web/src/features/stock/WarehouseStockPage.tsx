import React, { useState } from 'react';
import { PackageSearch, Search, AlertCircle, Calendar, MapPin, Tag } from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';

export function WarehouseStockPage(): React.JSX.Element {
  const { stock } = useWarehouseStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = stock.filter(
    (s) =>
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-cyan-400" />
            <span>Master Warehouse Stock & Batch Lots</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally stored wholesale items, expiration dates & designated pick-face bins.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU, product name, or barcode..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <span className="text-xs font-mono text-cyan-400 font-semibold hidden sm:block">
          {stock.length} Active Master SKUs
        </span>
      </div>

      {/* Stock Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">SKU & Barcode</th>
                <th className="p-3.5">Product Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Primary Bin</th>
                <th className="p-3.5 text-right">Available Qty</th>
                <th className="p-3.5 text-right">Allocated Qty</th>
                <th className="p-3.5">Batches / Lots</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-mono">
                    <div className="font-bold text-cyan-400">{item.sku}</div>
                    <div className="text-[10px] text-slate-500">{item.barcode}</div>
                  </td>
                  <td className="p-3.5 font-medium text-slate-100 max-w-xs">{item.productName}</td>
                  <td className="p-3.5 text-slate-400">{item.category}</td>
                  <td className="p-3.5 font-mono">
                    <span className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-cyan-300 font-bold text-[11px]">
                      <MapPin className="h-3 w-3 text-cyan-400" />
                      <span>{item.primaryBin}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-white font-mono">
                    {item.availableQty} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                  </td>
                  <td className="p-3.5 text-right font-mono text-amber-400">
                    {item.allocatedQty} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {item.batches.map((b) => (
                        <span
                          key={b.batchNumber}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px] font-mono text-slate-300 flex items-center gap-1.5"
                        >
                          <span className="font-semibold text-white">{b.batchNumber}:</span>
                          <span>{b.qty} {item.unit}</span>
                          {b.expiryDate && (
                            <span className="text-slate-500 text-[9px]">Exp: {b.expiryDate}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
