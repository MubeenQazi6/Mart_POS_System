import React, { useState } from 'react';
import {
  PackageSearch,
  Search,
  AlertCircle,
  Calendar,
  MapPin,
  Tag,
  Layers,
  Boxes,
  Truck,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function WarehouseStockPage(): React.JSX.Element {
  const { stock } = useWarehouseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const categories = Array.from(new Set(stock.map((s) => s.category)));

  const filtered = stock.filter((s) => {
    const matchesSearch =
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.barcode.includes(searchTerm) ||
      s.primaryBin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalUnits = stock.reduce((a, s) => a + s.availableQty, 0);
  const totalAllocated = stock.reduce((a, s) => a + s.allocatedQty, 0);
  const lowStockCount = stock.filter((s) => s.availableQty < 100).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Master Warehouse Stock & Batch Lots"
        description="Centrally stored wholesale items, expiration date tracking & designated pick-face bins."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-3 py-1 rounded-full font-bold">
              {stock.length} Catalog Items
            </span>
          </div>
        }
      />

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Master SKUs</span>
              <Boxes className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{stock.length}</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Wholesale inventory lines</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Available Units</span>
              <Layers className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {totalUnits.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Physical items on racks</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Reserved for STO</span>
              <Truck className="h-4 w-4 text-violet-400" />
            </div>
            <div className="text-2xl font-black text-violet-400 font-mono mt-1">
              {totalAllocated.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Locked in dispatch picking</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Low Reorder Alert</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{lowStockCount} SKUs</div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">&lt; 100 units remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU, product title, barcode, bin..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <Filter className="h-4 w-4 text-slate-500 hidden md:block" />
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  categoryFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    categoryFilter === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card className="bg-slate-900/90 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-4">SKU & Barcode</th>
                <th className="p-4">Product Description</th>
                <th className="p-4">Category</th>
                <th className="p-4">Primary Bin</th>
                <th className="p-4 text-right">Available Qty</th>
                <th className="p-4 text-right">Allocated Qty</th>
                <th className="p-4">Active Batches & FEFO Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition">
                  {/* SKU & Barcode */}
                  <td className="p-4 font-mono">
                    <div className="font-bold text-cyan-400 text-xs">{item.sku}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.barcode}</div>
                  </td>

                  {/* Product Description */}
                  <td className="p-4">
                    <div className="font-bold text-slate-100 max-w-sm">{item.productName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Unit: {item.unit}</div>
                  </td>

                  {/* Category */}
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 font-medium text-[11px]">
                      {item.category}
                    </span>
                  </td>

                  {/* Primary Bin */}
                  <td className="p-4 font-mono">
                    <span className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-300 font-bold text-xs">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{item.primaryBin}</span>
                    </span>
                  </td>

                  {/* Available Qty */}
                  <td className="p-4 text-right font-mono">
                    <div className="font-black text-white text-sm">
                      {item.availableQty} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                    </div>
                  </td>

                  {/* Allocated Qty */}
                  <td className="p-4 text-right font-mono">
                    <div className="font-semibold text-amber-400">
                      {item.allocatedQty} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                    </div>
                  </td>

                  {/* Batches / Lots */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {item.batches.map((b) => (
                        <div
                          key={b.batchNumber}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] font-mono text-slate-300 space-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white">{b.batchNumber}</span>
                            <span className="text-cyan-400 font-semibold">{b.qty} {item.unit}</span>
                          </div>
                          {b.expiryDate && (
                            <div className="text-slate-400 text-[10px] flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-amber-400" />
                              <span>Exp: {b.expiryDate}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
