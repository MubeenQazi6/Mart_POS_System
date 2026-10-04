import { useState, useEffect } from 'react';
import { useCatalogStore } from '@renderer/stores/catalogStore';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { Plus, Check, Edit2, Tags, Layers, Scale } from 'lucide-react';
import type { CategoryRow, BrandRow, UnitRow } from '@shared/types/catalog';

export function CatalogManager(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'units'>('categories');
  
  const {
    categories, brands, units,
    loadCategories, loadBrands, loadUnits,
    createCategory, updateCategory,
    createBrand, updateBrand,
    createUnit, updateUnit,
  } = useCatalogStore();

  useEffect(() => {
    void loadCategories();
    void loadBrands();
    void loadUnits();
  }, [loadCategories, loadBrands, loadUnits]);

  // Form states
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  const [brandName, setBrandName] = useState('');
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);

  const [unitName, setUnitName] = useState('');
  const [unitAbbr, setUnitAbbr] = useState('');
  const [unitDecimals, setUnitDecimals] = useState(0);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);

  const handleSaveCategory = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (editingCatId) {
      const ok = await updateCategory({ id: editingCatId, name: catName.trim(), description: catDesc.trim() });
      if (ok) { setEditingCatId(null); setCatName(''); setCatDesc(''); }
    } else {
      const ok = await createCategory({ name: catName.trim(), description: catDesc.trim() });
      if (ok) { setCatName(''); setCatDesc(''); }
    }
  };

  const handleSaveBrand = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!brandName.trim()) return;
    if (editingBrandId) {
      const ok = await updateBrand({ id: editingBrandId, name: brandName.trim() });
      if (ok) { setEditingBrandId(null); setBrandName(''); }
    } else {
      const ok = await createBrand({ name: brandName.trim() });
      if (ok) { setBrandName(''); }
    }
  };

  const handleSaveUnit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!unitName.trim() || !unitAbbr.trim()) return;
    if (editingUnitId) {
      const ok = await updateUnit({ id: editingUnitId, name: unitName.trim(), abbreviation: unitAbbr.trim(), decimals: unitDecimals });
      if (ok) { setEditingUnitId(null); setUnitName(''); setUnitAbbr(''); setUnitDecimals(0); }
    } else {
      const ok = await createUnit({ name: unitName.trim(), abbreviation: unitAbbr.trim(), decimals: unitDecimals });
      if (ok) { setUnitName(''); setUnitAbbr(''); setUnitDecimals(0); }
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        <button
          type="button"
          onClick={() => { setActiveTab('categories'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          Categories ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('brands'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'brands'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Tags className="h-4 w-4" />
          Brands ({brands.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('units'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'units'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Scale className="h-4 w-4" />
          Units ({units.length})
        </button>
      </div>

      {/* Categories View */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={(e) => { void handleSaveCategory(e); }} className="p-4 rounded-xl border border-surface-border bg-slate-50 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">{editingCatId ? 'Edit Category' : 'Add New Category'}</h3>
            <Input label="Category Name" value={catName} onChange={(e) => { setCatName(e.target.value); }} placeholder="e.g., Grocery, Confectionery" required />
            <Input label="Description" value={catDesc} onChange={(e) => { setCatDesc(e.target.value); }} placeholder="Optional details" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" leftIcon={editingCatId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
                {editingCatId ? 'Update' : 'Add Category'}
              </Button>
              {editingCatId && (
                <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingCatId(null); setCatName(''); setCatDesc(''); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <div className="md:col-span-2 rounded-xl border border-surface-border bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-surface-border text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {categories.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No categories created yet</td></tr>
                ) : (
                  categories.map((c: CategoryRow) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-slate-500">{c.description || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingCatId(c.id); setCatName(c.name); setCatDesc(c.description || ''); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { void updateCategory({ id: c.id, is_active: !c.is_active }); }}
                          className={c.is_active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                        >
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Brands View */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={(e) => { void handleSaveBrand(e); }} className="p-4 rounded-xl border border-surface-border bg-slate-50 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">{editingBrandId ? 'Edit Brand' : 'Add New Brand'}</h3>
            <Input label="Brand Name" value={brandName} onChange={(e) => { setBrandName(e.target.value); }} placeholder="e.g., Nestle, Coca Cola, Unilever" required />
            <div className="flex gap-2">
              <Button type="submit" size="sm" leftIcon={editingBrandId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
                {editingBrandId ? 'Update' : 'Add Brand'}
              </Button>
              {editingBrandId && (
                <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingBrandId(null); setBrandName(''); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <div className="md:col-span-2 rounded-xl border border-surface-border bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-surface-border text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {brands.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No brands created yet</td></tr>
                ) : (
                  brands.map((b: BrandRow) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={b.is_active ? 'success' : 'neutral'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingBrandId(b.id); setBrandName(b.name); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { void updateBrand({ id: b.id, is_active: !b.is_active }); }}
                          className={b.is_active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                        >
                          {b.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Units View */}
      {activeTab === 'units' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={(e) => { void handleSaveUnit(e); }} className="p-4 rounded-xl border border-surface-border bg-slate-50 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">{editingUnitId ? 'Edit Unit' : 'Add New Unit'}</h3>
            <Input label="Unit Name" value={unitName} onChange={(e) => { setUnitName(e.target.value); }} placeholder="e.g., Kilogram, Piece, Liter" required />
            <Input label="Abbreviation" value={unitAbbr} onChange={(e) => { setUnitAbbr(e.target.value); }} placeholder="e.g., KG, PC, LTR" required />
            <Input
              label="Decimal Places"
              type="number"
              min="0"
              max="4"
              value={unitDecimals}
              onChange={(e) => { setUnitDecimals(parseInt(e.target.value, 10) || 0); }}
              hint="0 for pieces/boxes, 3 for KG/Liters"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" leftIcon={editingUnitId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
                {editingUnitId ? 'Update' : 'Add Unit'}
              </Button>
              {editingUnitId && (
                <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingUnitId(null); setUnitName(''); setUnitAbbr(''); setUnitDecimals(0); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <div className="md:col-span-2 rounded-xl border border-surface-border bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-surface-border text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Abbreviation</th>
                  <th className="px-4 py-3 font-medium">Decimals</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {units.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No units created yet</td></tr>
                ) : (
                  units.map((u: UnitRow) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600"><span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs">{u.abbreviation}</span></td>
                      <td className="px-4 py-3 text-slate-500">{u.decimals}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingUnitId(u.id); setUnitName(u.name); setUnitAbbr(u.abbreviation); setUnitDecimals(u.decimals); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { void updateUnit({ id: u.id, is_active: !u.is_active }); }}
                          className={u.is_active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
