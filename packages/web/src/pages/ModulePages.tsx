import React, { useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Printer,
  CheckCircle2,
  RotateCcw,
  Download,
  TrendingUp,
  X,
  RefreshCw,
  Store,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Cloud,
} from 'lucide-react';

/* ─── 1. POS PAGE (Interactive Web Terminal) ────────────────────────── */
interface CartItem {
  id: number;
  name: string;
  barcode: string;
  priceMinor: number;
  qty: number;
}

export function PosPage(): React.JSX.Element {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([
    { id: 1, name: 'Fresh Milk 1L - Olpers', barcode: '8964000123456', priceMinor: 28000, qty: 2 },
    { id: 2, name: 'Basmati Rice 5kg Supreme', barcode: '8964000789012', priceMinor: 145000, qty: 1 },
    { id: 3, name: 'Tapal Danedar Tea 450g', barcode: '8964000345678', priceMinor: 68000, qty: 1 },
  ]);
  const [tenderAmount, setTenderAmount] = useState('');
  const [paymentDone, setPaymentDone] = useState(false);

  const subtotalMinor = cart.reduce((sum, item) => sum + item.priceMinor * item.qty, 0);
  const taxMinor = Math.round(subtotalMinor * 0.05); // 5% GST
  const grandTotalMinor = subtotalMinor + taxMinor;

  const handleAddItem = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const newItem: CartItem = {
      id: Date.now(),
      name: `Scanned Item (${barcodeInput.slice(-4) || 'SKU'})`,
      barcode: barcodeInput,
      priceMinor: 35000,
      qty: 1,
    };
    setCart((prev) => [...prev, newItem]);
    setBarcodeInput('');
  };

  const handleUpdateQty = (index: number, delta: number): void => {
    setCart((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const handleRemove = (index: number): void => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCompleteSale = (): void => {
    if (cart.length === 0) return;
    setPaymentDone(true);
    setTimeout(() => {
      setCart([]);
      setPaymentDone(false);
      setTenderAmount('');
    }, 2000);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', height: 'calc(100vh - 110px)' }}>
      {/* Scanner & Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#5f7085' }}
            />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type name (e.g. 8964000...)"
              autoFocus
              style={{
                width: '100%',
                padding: '0.875rem 1rem 0.875rem 2.75rem',
                backgroundColor: '#131921',
                border: '1px solid #3b4a5e',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0 1.5rem',
              backgroundColor: '#f0932a',
              color: '#131921',
              fontWeight: 700,
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Plus size={18} />
            <span>Add Item</span>
          </button>
        </form>

        <div
          style={{
            flex: 1,
            backgroundColor: '#131921',
            borderRadius: '0.75rem',
            border: '1px solid #1b2530',
            overflowY: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
                <th style={{ padding: '0.75rem 1rem' }}>#</th>
                <th style={{ padding: '0.75rem 1rem' }}>Item Description</th>
                <th style={{ padding: '0.75rem 1rem' }}>Barcode</th>
                <th style={{ padding: '0.75rem 1rem' }}>Unit Price</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#5f7085' }}>{idx + 1}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#97a3b3', fontFamily: 'monospace' }}>
                    {item.barcode}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>PKR {(item.priceMinor / 100).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#1b2530', borderRadius: '0.375rem', padding: '0.125rem 0.375rem' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        style={{ background: 'none', border: 'none', color: '#97a3b3', cursor: 'pointer', fontWeight: 700 }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700 }}>{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        style={{ background: 'none', border: 'none', color: '#97a3b3', cursor: 'pointer', fontWeight: 700 }}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f0932a' }}>
                    PKR {((item.priceMinor * item.qty) / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#5f7085' }}>
                    Cart is empty. Scan barcode or search above to begin checkout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill summary */}
      <div
        style={{
          backgroundColor: '#131921',
          borderRadius: '0.75rem',
          border: '1px solid #1b2530',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white', margin: '0 0 1rem 0' }}>
            Bill Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #1b2530', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#97a3b3', fontSize: '0.875rem' }}>
              <span>Items Subtotal</span>
              <span style={{ color: 'white' }}>PKR {(subtotalMinor / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#97a3b3', fontSize: '0.875rem' }}>
              <span>GST Tax (5%)</span>
              <span style={{ color: 'white' }}>PKR {(taxMinor / 100).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ margin: '1.25rem 0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#97a3b3' }}>
              Total Payable
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f0932a' }}>
              PKR {(grandTotalMinor / 100).toFixed(2)}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#c3cad3', marginBottom: '0.375rem' }}>
              Cash Received (PKR)
            </label>
            <input
              type="number"
              value={tenderAmount}
              onChange={(e) => setTenderAmount(e.target.value)}
              placeholder="e.g. 5000"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#0d1218',
                border: '1px solid #3b4a5e',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1.125rem',
                fontWeight: 700,
                outline: 'none',
              }}
            />
            {Number(tenderAmount) * 100 >= grandTotalMinor && (
              <div style={{ marginTop: '0.5rem', color: '#4ade80', fontSize: '0.875rem', fontWeight: 600 }}>
                Change Due: PKR {(Number(tenderAmount) - grandTotalMinor / 100).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <div>
          {paymentDone ? (
            <div
              style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(22, 163, 74, 0.15)',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                color: '#4ade80',
                textAlign: 'center',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={20} />
              <span>Receipt Printed & Synced!</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: cart.length === 0 ? '#3b4a5e' : '#f0932a',
                color: '#131921',
                fontWeight: 800,
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(240, 147, 42, 0.25)',
              }}
            >
              <Printer size={18} />
              <span>Charge & Print Receipt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 2. PRODUCTS & CATALOG PAGE ────────────────────────────────────── */
export function ProductsPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [products] = useState([
    { id: 1, name: 'Olpers Milk 1L', sku: 'OLP-1L', barcode: '8964000123456', category: 'Dairy', price: '280.00', cost: '250.00', stock: 45 },
    { id: 2, name: 'Supreme Basmati Rice 5kg', sku: 'RCE-5KG', barcode: '8964000789012', category: 'Grains', price: '1450.00', cost: '1250.00', stock: 12 },
    { id: 3, name: 'Tapal Danedar Tea 450g', sku: 'TEA-450', barcode: '8964000345678', category: 'Beverages', price: '680.00', cost: '590.00', stock: 3 },
    { id: 4, name: 'Shan Biryani Masala 50g', sku: 'SHN-BIR', barcode: '8964000901234', category: 'Spices', price: '120.00', cost: '95.00', stock: 80 },
    { id: 5, name: 'Nestle Pure Life 1.5L', sku: 'WTR-1.5L', barcode: '8964000567890', category: 'Beverages', price: '90.00', cost: '70.00', stock: 65 },
  ]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Products & Catalog</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Manage product pricing, variants, and barcode mappings.</p>
        </div>
        <button
          type="button"
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>New Product</span>
        </button>
      </div>

      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#5f7085' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by name, barcode, or category..."
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem 0.625rem 2.25rem',
            background: '#131921',
            border: '1px solid #3b4a5e',
            borderRadius: '0.5rem',
            color: 'white',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Product Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Barcode</th>
              <th style={{ padding: '0.75rem 1rem' }}>Category</th>
              <th style={{ padding: '0.75rem 1rem' }}>Cost Price</th>
              <th style={{ padding: '0.75rem 1rem' }}>Selling Price</th>
              <th style={{ padding: '0.75rem 1rem' }}>Stock</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3', fontFamily: 'monospace' }}>{item.barcode}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#1b2530', fontSize: '0.75rem' }}>
                    {item.category}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>PKR {item.cost}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f0932a' }}>PKR {item.price}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: item.stock <= 5 ? '#f87171' : 'white' }}>
                  {item.stock} units
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      background: item.stock <= 5 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(22, 163, 74, 0.15)',
                      color: item.stock <= 5 ? '#f87171' : '#4ade80',
                    }}
                  >
                    {item.stock <= 5 ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 3. INVENTORY & STOCK LEVELS ───────────────────────────────────── */
export function InventoryPage(): React.JSX.Element {
  const [stockItems] = useState([
    { id: 1, name: 'Olpers Milk 1L', sku: 'OLP-1L', currentStock: 45, minStock: 20, value: 'PKR 11,250' },
    { id: 2, name: 'Supreme Basmati Rice 5kg', sku: 'RCE-5KG', currentStock: 12, minStock: 10, value: 'PKR 15,000' },
    { id: 3, name: 'Tapal Danedar Tea 450g', sku: 'TEA-450', currentStock: 3, minStock: 15, value: 'PKR 1,770' },
    { id: 4, name: 'Shan Biryani Masala 50g', sku: 'SHN-BIR', currentStock: 80, minStock: 25, value: 'PKR 7,600' },
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Stock Audit & Levels</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Multi-counter stock valuation, low inventory alerts, and adjustment logs.</p>
        </div>
        <button
          type="button"
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#1b2530',
            border: '1px solid #3b4a5e',
            color: 'white',
            fontWeight: 700,
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Quick Audit Adjust
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530', borderLeft: '4px solid #4ade80' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Total Inventory Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginTop: '0.25rem' }}>PKR 1,485,200</div>
        </div>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530', borderLeft: '4px solid #f87171' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Under Minimum Alert</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f87171', marginTop: '0.25rem' }}>4 SKUs Low</div>
        </div>
      </div>

      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Product Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>SKU</th>
              <th style={{ padding: '0.75rem 1rem' }}>On Hand</th>
              <th style={{ padding: '0.75rem 1rem' }}>Reorder Level</th>
              <th style={{ padding: '0.75rem 1rem' }}>Stock Value</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {stockItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{item.sku}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{item.currentStock} units</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{item.minStock} units</td>
                <td style={{ padding: '0.75rem 1rem', color: '#f0932a', fontWeight: 600 }}>{item.value}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      background: item.currentStock <= item.minStock ? 'rgba(220, 38, 38, 0.15)' : 'rgba(22, 163, 74, 0.15)',
                      color: item.currentStock <= item.minStock ? '#f87171' : '#4ade80',
                    }}
                  >
                    {item.currentStock <= item.minStock ? 'Reorder Needed' : 'Normal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 4. CUSTOMERS & UDHAAR LEDGER (KHATA) ────────────────────────── */
export function CustomersPage(): React.JSX.Element {
  const [customers] = useState([
    { id: 1, name: 'Haji Muhammad Aslam', phone: '0300-1234567', totalPurchases: 'PKR 142,000', balanceMinor: 1250000, lastDate: 'Yesterday' },
    { id: 2, name: 'Dr. Tariq Mahmood', phone: '0321-9876543', totalPurchases: 'PKR 86,500', balanceMinor: 0, lastDate: '3 days ago' },
    { id: 3, name: 'Chaudhry Rashid', phone: '0333-5551234', totalPurchases: 'PKR 210,000', balanceMinor: 4500000, lastDate: 'Today' },
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Customer Directory & Khata (Udhaar)</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Track customer phone numbers, credit ledgers, and payment history.</p>
        </div>
        <button
          type="button"
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>New Customer</span>
        </button>
      </div>

      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Customer Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Phone Number</th>
              <th style={{ padding: '0.75rem 1rem' }}>Total Purchased</th>
              <th style={{ padding: '0.75rem 1rem' }}>Udhaar / Balance</th>
              <th style={{ padding: '0.75rem 1rem' }}>Last Activity</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{c.phone}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{c.totalPurchases}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: c.balanceMinor > 0 ? '#f87171' : '#4ade80' }}>
                  {c.balanceMinor > 0 ? `PKR ${(c.balanceMinor / 100).toFixed(2)} (Receivable)` : 'Cleared'}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{c.lastDate}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    style={{
                      padding: '0.25rem 0.625rem',
                      background: '#1b2530',
                      border: '1px solid #3b4a5e',
                      color: '#f0932a',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    View Ledger
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 5. SUPPLIERS PAGE ──────────────────────────────────────────── */
export function SuppliersPage(): React.JSX.Element {
  const [suppliers] = useState([
    { id: 1, name: 'Engro Foods Pakistan', contact: '021-35800000', rep: 'Zahid Khan', balance: 'PKR 45,000' },
    { id: 2, name: 'Tapal Tea Pvt Ltd', contact: '021-35060000', rep: 'Bilal Ahmed', balance: 'PKR 12,000' },
    { id: 3, name: 'Unilever Pakistan', contact: '021-35610000', rep: 'Shahid Mehmood', balance: 'PKR 0' },
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Wholesale Suppliers</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Supplier accounts, contact reps, and pending payable balances.</p>
        </div>
        <button
          type="button"
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>Add Supplier</span>
        </button>
      </div>

      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Supplier Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Sales Representative</th>
              <th style={{ padding: '0.75rem 1rem' }}>Contact</th>
              <th style={{ padding: '0.75rem 1rem' }}>Payable Balance</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{s.rep}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{s.contact}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: s.balance !== 'PKR 0' ? '#f87171' : '#4ade80' }}>
                  {s.balance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 6. PURCHASES PAGE ──────────────────────────────────────────── */
interface PurchaseOrder {
  id: string;
  supplier: string;
  billNumber: string;
  itemsCount: number;
  totalPkr: number;
  paidPkr: number;
  status: 'Received' | 'Pending';
  date: string;
}

export function PurchasesPage(): React.JSX.Element {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([
    {
      id: 'PO-2026-089',
      supplier: 'Metro Cash & Carry Wholesale',
      billNumber: 'INV-MCC-9982',
      itemsCount: 42,
      totalPkr: 86500,
      paidPkr: 86500,
      status: 'Received',
      date: '12 Oct 2026',
    },
    {
      id: 'PO-2026-088',
      supplier: 'Unilever Pakistan Distribution',
      billNumber: 'INV-ULP-4412',
      itemsCount: 120,
      totalPkr: 145000,
      paidPkr: 100000,
      status: 'Received',
      date: '10 Oct 2026',
    },
    {
      id: 'PO-2026-087',
      supplier: 'Nestle Pakistan Direct',
      billNumber: 'INV-NST-1029',
      itemsCount: 65,
      totalPkr: 58200,
      paidPkr: 0,
      status: 'Pending',
      date: '08 Oct 2026',
    },
  ]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Received' | 'Pending'>('All');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [supplier, setSupplier] = useState('Metro Cash & Carry Wholesale');
  const [billNumber, setBillNumber] = useState('');
  const [itemsCount, setItemsCount] = useState('');
  const [totalPkr, setTotalPkr] = useState('');
  const [status, setStatus] = useState<'Received' | 'Pending'>('Received');

  const filtered = purchases.filter((p) => {
    const matchSearch =
      p.supplier.toLowerCase().includes(search.toLowerCase()) ||
      p.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalSpent = purchases.reduce((sum, p) => sum + p.totalPkr, 0);
  const pendingOrders = purchases.filter((p) => p.status === 'Pending').length;

  const handleCreate = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!billNumber || !totalPkr) return;
    const newPO: PurchaseOrder = {
      id: `PO-2026-${String(purchases.length + 90).padStart(3, '0')}`,
      supplier,
      billNumber,
      itemsCount: Number(itemsCount) || 1,
      totalPkr: Number(totalPkr),
      paidPkr: Number(totalPkr),
      status,
      date: 'Today',
    };
    setPurchases([newPO, ...purchases]);
    setShowModal(false);
    setBillNumber('');
    setItemsCount('');
    setTotalPkr('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Purchase Invoices & POs</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Record stock deliveries, supplier invoices, and payment terms.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Total Invoiced Purchases</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'white', marginTop: '0.25rem' }}>PKR {totalSpent.toLocaleString()}.00</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>{purchases.length} supplier orders recorded</div>
        </div>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Pending Shipments</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#f0932a', marginTop: '0.25rem' }}>{pendingOrders} POs</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Awaiting warehouse delivery</div>
        </div>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Active Suppliers</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>14 Verified</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Wholesale FMCG & Distributors</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#5f7085' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier, PO ID, or invoice #..."
            style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', backgroundColor: '#131921', border: '1px solid #1b2530', borderRadius: '0.5rem', color: 'white', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['All', 'Received', 'Pending'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid #3b4a5e',
                backgroundColor: statusFilter === s ? '#f0932a' : '#131921',
                color: statusFilter === s ? '#131921' : '#97a3b3',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>PO Number</th>
              <th style={{ padding: '0.75rem 1rem' }}>Supplier Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Bill Reference</th>
              <th style={{ padding: '0.75rem 1rem' }}>Items</th>
              <th style={{ padding: '0.75rem 1rem' }}>Date</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#f0932a', fontWeight: 700 }}>{p.id}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{p.supplier}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{p.billNumber}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{p.itemsCount} pkgs</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{p.date}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: p.status === 'Received' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(240, 147, 42, 0.15)',
                      color: p.status === 'Received' ? '#4ade80' : '#f0932a',
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>PKR {p.totalPkr.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#131921', border: '1px solid #3b4a5e', borderRadius: '0.75rem', padding: '1.5rem', width: '480px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.125rem', fontWeight: 800 }}>Create New Purchase Invoice</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#97a3b3', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Supplier Name</label>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}>
                  <option value="Metro Cash & Carry Wholesale">Metro Cash & Carry Wholesale</option>
                  <option value="Unilever Pakistan Distribution">Unilever Pakistan Distribution</option>
                  <option value="Nestle Pakistan Direct">Nestle Pakistan Direct</option>
                  <option value="National Foods Karachi">National Foods Karachi</option>
                  <option value="Engro Foods Lahore">Engro Foods Lahore</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Supplier Invoice #</label>
                <input type="text" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="e.g. INV-2026-99" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Total Item Units</label>
                  <input type="number" value={itemsCount} onChange={(e) => setItemsCount(e.target.value)} placeholder="e.g. 50" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Invoice Total (PKR)</label>
                  <input type="number" value={totalPkr} onChange={(e) => setTotalPkr(e.target.value)} placeholder="e.g. 75000" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Delivery Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'Received' | 'Pending')} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}>
                  <option value="Received">Received & Stocked in Warehouse</option>
                  <option value="Pending">Pending / In Transit</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.625rem 1rem', background: '#1b2530', color: '#97a3b3', border: '1px solid #3b4a5e', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#f0932a', color: '#131921', fontWeight: 700, border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Save Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 7. EXPENSES PAGE ───────────────────────────────────────────── */
export function ExpensesPage(): React.JSX.Element {
  const [expenses, setExpenses] = useState([
    { id: 1, category: 'Utilities', title: 'Shop Electricity Bill', amount: 'PKR 14,500', date: '30 Sep 2026' },
    { id: 2, category: 'Salary', title: 'Helper Staff Daily Wages', amount: 'PKR 1,500', date: '30 Sep 2026' },
    { id: 3, category: 'Supplies', title: 'Thermal Receipt Rolls (10 pcs)', amount: 'PKR 2,200', date: '29 Sep 2026' },
  ]);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAddExpense = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!newTitle || !newAmount) return;
    setExpenses((prev) => [
      { id: Date.now(), category: 'General', title: newTitle, amount: `PKR ${Number(newAmount).toLocaleString()}`, date: 'Today' },
      ...prev,
    ]);
    setNewTitle('');
    setNewAmount('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Daily Store Expenses</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Log petty cash, rent, utility bills, and staff tea expenses.</p>
        </div>
      </div>

      <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '0.75rem', background: '#131921', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Expense description (e.g. Generator Petrol)..."
          style={{ flex: 1, padding: '0.625rem 0.875rem', background: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}
        />
        <input
          type="number"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="Amount in PKR..."
          style={{ width: '180px', padding: '0.625rem 0.875rem', background: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}
        />
        <button
          type="submit"
          style={{
            padding: '0 1.25rem',
            background: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Add Expense
        </button>
      </form>

      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Date</th>
              <th style={{ padding: '0.75rem 1rem' }}>Category</th>
              <th style={{ padding: '0.75rem 1rem' }}>Description</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{e.date}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#1b2530', fontSize: '0.75rem' }}>
                    {e.category}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{e.title}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>
                  {e.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 8. CASH SESSIONS PAGE ───────────────────────────────────────── */
interface CashTx {
  id: number;
  type: 'Cash Sale' | 'Cash In' | 'Cash Out' | 'Shift Open';
  amountPkr: number;
  notes: string;
  time: string;
  cashier: string;
}

export function CashPage(): React.JSX.Element {
  const [isShiftOpen] = useState(true);
  const [openingFloat] = useState(5000);
  const [cashSales] = useState(34500);
  const [cashIn, setCashIn] = useState(2000);
  const [cashOut, setCashOut] = useState(4500);
  const [transactions, setTransactions] = useState<CashTx[]>([
    { id: 1, type: 'Shift Open', amountPkr: 5000, notes: 'Morning counter opening float', time: '09:00 AM', cashier: 'Bilal Ahmed' },
    { id: 2, type: 'Cash In', amountPkr: 2000, notes: 'Petty cash replenishment from store safe', time: '11:15 AM', cashier: 'Bilal Ahmed' },
    { id: 3, type: 'Cash Out', amountPkr: 4500, notes: 'Emergency dairy distributor cash delivery payout', time: '01:40 PM', cashier: 'Bilal Ahmed' },
    { id: 4, type: 'Cash Sale', amountPkr: 34500, notes: 'POS counter walk-in sales aggregate', time: '03:10 PM', cashier: 'Bilal Ahmed' },
  ]);

  const [modalType, setModalType] = useState<'in' | 'out' | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const expectedCash = openingFloat + cashSales + cashIn - cashOut;

  const handleCashMovement = (e: React.FormEvent): void => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return;

    if (modalType === 'in') {
      setCashIn((prev) => prev + val);
      setTransactions((prev) => [
        {
          id: Date.now(),
          type: 'Cash In',
          amountPkr: val,
          notes: notes || 'Cash deposited into drawer',
          time: 'Just now',
          cashier: 'Mubeen Qazi',
        },
        ...prev,
      ]);
    } else if (modalType === 'out') {
      setCashOut((prev) => prev + val);
      setTransactions((prev) => [
        {
          id: Date.now(),
          type: 'Cash Out',
          amountPkr: val,
          notes: notes || 'Cash withdrawal from drawer',
          time: 'Just now',
          cashier: 'Mubeen Qazi',
        },
        ...prev,
      ]);
    }

    setAmount('');
    setNotes('');
    setModalType(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Register Shift & Cash Drawer</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Manage shift opening balance, cash deposits/withdrawals, and end-of-day tally.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setModalType('in')}
            style={{
              padding: '0.625rem 1rem',
              backgroundColor: '#1b2530',
              border: '1px solid #3b4a5e',
              color: '#4ade80',
              fontWeight: 700,
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: 'pointer',
            }}
          >
            <ArrowDownLeft size={16} />
            <span>Cash In</span>
          </button>
          <button
            type="button"
            onClick={() => setModalType('out')}
            style={{
              padding: '0.625rem 1rem',
              backgroundColor: '#1b2530',
              border: '1px solid #3b4a5e',
              color: '#f87171',
              fontWeight: 700,
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: 'pointer',
            }}
          >
            <ArrowUpRight size={16} />
            <span>Cash Out</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Register Status</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isShiftOpen ? '#4ade80' : '#f87171', marginTop: '0.25rem' }}>
            {isShiftOpen ? 'Open (Counter #1)' : 'Closed'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Active Cashier: Bilal Ahmed</div>
        </div>

        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Opening Float</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginTop: '0.25rem' }}>PKR {openingFloat.toLocaleString()}.00</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Base drawer cash</div>
        </div>

        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Drawer In / Out Net</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: cashIn - cashOut >= 0 ? '#4ade80' : '#f87171', marginTop: '0.25rem' }}>
            PKR {(cashIn - cashOut).toLocaleString()}.00
          </div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>+PKR {cashIn.toLocaleString()} / -PKR {cashOut.toLocaleString()}</div>
        </div>

        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Expected Drawer Cash</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f0932a', marginTop: '0.25rem' }}>PKR {expectedCash.toLocaleString()}.00</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Includes Cash Sales: PKR {cashSales.toLocaleString()}</div>
        </div>
      </div>

      {/* Drawer Activity Log */}
      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #1b2530', fontWeight: 700, color: 'white', fontSize: '0.9375rem' }}>
          Cash Drawer Movements & Tally Log
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Time</th>
              <th style={{ padding: '0.75rem 1rem' }}>Movement Type</th>
              <th style={{ padding: '0.75rem 1rem' }}>Notes / Reason</th>
              <th style={{ padding: '0.75rem 1rem' }}>Staff Cashier</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{t.time}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor:
                        t.type === 'Cash In' || t.type === 'Cash Sale' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                      color: t.type === 'Cash In' || t.type === 'Cash Sale' ? '#4ade80' : '#f87171',
                    }}
                  >
                    {t.type}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{t.notes}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{t.cashier}</td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: t.type === 'Cash Out' ? '#f87171' : '#4ade80',
                  }}
                >
                  {t.type === 'Cash Out' ? '-' : '+'}PKR {t.amountPkr.toLocaleString()}.00
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cash In / Out Modal */}
      {modalType && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#131921', border: '1px solid #3b4a5e', borderRadius: '0.75rem', padding: '1.5rem', width: '400px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.125rem', fontWeight: 800 }}>
                {modalType === 'in' ? 'Drawer Cash In (Deposit)' : 'Drawer Cash Out (Withdrawal)'}
              </h3>
              <button type="button" onClick={() => setModalType(null)} style={{ background: 'none', border: 'none', color: '#97a3b3', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCashMovement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Amount in PKR</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  required
                  autoFocus
                  style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Reason / Description</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={modalType === 'in' ? 'e.g. Petty cash replenishment' : 'e.g. Vendor payout, tea, diesel'}
                  required
                  style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} style={{ padding: '0.625rem 1rem', background: '#1b2530', color: '#97a3b3', border: '1px solid #3b4a5e', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: modalType === 'in' ? '#4ade80' : '#f87171',
                    color: '#131921',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 9. BARCODE LABELS PAGE (STICKER ROLLS) ─────────────────────── */
export function BarcodeLabelsPage(): React.JSX.Element {
  const [stickers] = useState([
    { id: 1, name: 'Olpers Milk 1L', price: '280.00', barcode: '8964000123456' },
    { id: 2, name: 'Tapal Danedar 450g', price: '680.00', barcode: '8964000345678' },
    { id: 3, name: 'Supreme Rice 5kg', price: '1450.00', barcode: '8964000789012' },
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Barcode Sticker Designer</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Preview & print high-density barcode sticker rolls (38x25mm / 50x25mm).</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Printer size={16} />
          <span>Print Sticker Roll</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {stickers.map((s) => (
          <div
            key={s.id}
            style={{
              background: '#ffffff',
              color: '#000000',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '2px dashed #97a3b3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase' }}>MARTPOS RETAIL</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginTop: '0.25rem' }}>{s.name}</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 900, marginTop: '0.25rem' }}>PKR {s.price}</div>
            <div style={{ margin: '0.5rem 0 0.25rem', height: '36px', width: '100%', background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px)' }} />
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{s.barcode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 10. RETURNS & EXCHANGES PAGE ────────────────────────────────── */
interface ReturnRecord {
  id: string;
  invoiceNo: string;
  customer: string;
  item: string;
  qty: number;
  refundPkr: number;
  condition: 'Good (Restock)' | 'Damaged (Scrap)';
  method: 'Cash Refund' | 'Store Credit' | 'Card Reversal';
  reason: string;
  date: string;
}

export function ReturnsPage(): React.JSX.Element {
  const [returns, setReturns] = useState<ReturnRecord[]>([
    {
      id: 'RET-1042',
      invoiceNo: 'INV-8912',
      customer: 'Walking Customer',
      item: 'Fresh Milk 1L - Olpers',
      qty: 1,
      refundPkr: 280,
      condition: 'Damaged (Scrap)',
      method: 'Cash Refund',
      reason: 'Broken cap seal detected',
      date: '12 Oct 2026',
    },
    {
      id: 'RET-1041',
      invoiceNo: 'INV-8890',
      customer: 'Asad Khan (VIP)',
      item: 'Basmati Rice 5kg Supreme',
      qty: 1,
      refundPkr: 1450,
      condition: 'Good (Restock)',
      method: 'Store Credit',
      reason: 'Customer bought incorrect grain size',
      date: '11 Oct 2026',
    },
    {
      id: 'RET-1040',
      invoiceNo: 'INV-8865',
      customer: 'Walking Customer',
      item: 'Tapal Danedar Tea 450g',
      qty: 2,
      refundPkr: 1360,
      condition: 'Good (Restock)',
      method: 'Cash Refund',
      reason: 'Customer returned duplicate pack',
      date: '09 Oct 2026',
    },
  ]);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customer, setCustomer] = useState('Walking Customer');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('1');
  const [refundPkr, setRefundPkr] = useState('');
  const [condition, setCondition] = useState<'Good (Restock)' | 'Damaged (Scrap)'>('Good (Restock)');
  const [method, setMethod] = useState<'Cash Refund' | 'Store Credit' | 'Card Reversal'>('Cash Refund');
  const [reason, setReason] = useState('Customer Request');

  const filtered = returns.filter(
    (r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      r.item.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.toLowerCase().includes(search.toLowerCase()),
  );

  const totalRefunded = returns.reduce((sum, r) => sum + r.refundPkr, 0);

  const handleProcessReturn = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!invoiceNo || !item || !refundPkr) return;

    const newRet: ReturnRecord = {
      id: `RET-${1043 + returns.length}`,
      invoiceNo,
      customer,
      item,
      qty: Number(qty) || 1,
      refundPkr: Number(refundPkr),
      condition,
      method,
      reason,
      date: 'Today',
    };

    setReturns([newRet, ...returns]);
    setShowModal(false);
    setInvoiceNo('');
    setItem('');
    setRefundPkr('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Sales & Purchase Returns</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Lookup past receipt ID or barcode to issue refund, restock, or swap replacement items.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={16} />
          <span>Process Return / Exchange</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Total Refunds Issued</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#f87171', marginTop: '0.25rem' }}>PKR {totalRefunded.toLocaleString()}.00</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>{returns.length} return events processed</div>
        </div>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Return Rate</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>0.78%</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Well below 2% retail industry benchmark</div>
        </div>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Restocked Items</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'white', marginTop: '0.25rem' }}>
            {returns.filter((r) => r.condition.includes('Restock')).length} Units
          </div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Returned to shelf stock inventory</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#5f7085' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Return ID, Original Bill #, Customer, or Product..."
          style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', backgroundColor: '#131921', border: '1px solid #1b2530', borderRadius: '0.5rem', color: 'white', outline: 'none' }}
        />
      </div>

      {/* Returns Table */}
      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Return ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>Original Bill</th>
              <th style={{ padding: '0.75rem 1rem' }}>Product Returned</th>
              <th style={{ padding: '0.75rem 1rem' }}>Condition</th>
              <th style={{ padding: '0.75rem 1rem' }}>Reason</th>
              <th style={{ padding: '0.75rem 1rem' }}>Settlement</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Refund Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#f0932a', fontWeight: 700 }}>{r.id}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{r.invoiceNo}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{r.item} (x{r.qty})</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: r.condition.includes('Restock') ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                      color: r.condition.includes('Restock') ? '#4ade80' : '#f87171',
                    }}
                  >
                    {r.condition}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{r.reason}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#1b2530', fontSize: '0.75rem' }}>
                    {r.method}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>
                  -PKR {r.refundPkr.toLocaleString()}.00
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Return Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#131921', border: '1px solid #3b4a5e', borderRadius: '0.75rem', padding: '1.5rem', width: '480px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.125rem', fontWeight: 800 }}>Process Sales Return / Refund</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#97a3b3', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleProcessReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Original Receipt / Invoice #</label>
                  <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="e.g. INV-9021" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Customer Name</label>
                  <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walking Customer" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Returned Item Name</label>
                <input type="text" value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Fresh Milk 1L - Olpers" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Quantity</label>
                  <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Refund Amount (PKR)</label>
                  <input type="number" value={refundPkr} onChange={(e) => setRefundPkr(e.target.value)} placeholder="e.g. 280" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Condition</label>
                  <select value={condition} onChange={(e) => setCondition(e.target.value as 'Good (Restock)' | 'Damaged (Scrap)')} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}>
                    <option value="Good (Restock)">Good (Restock)</option>
                    <option value="Damaged (Scrap)">Damaged (Scrap)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Refund Method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as 'Cash Refund' | 'Store Credit' | 'Card Reversal')} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}>
                    <option value="Cash Refund">Cash Refund</option>
                    <option value="Store Credit">Store Credit Voucher</option>
                    <option value="Card Reversal">Card Reversal</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Return Reason</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Seal damaged / wrong product" style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.625rem 1rem', background: '#1b2530', color: '#97a3b3', border: '1px solid #3b4a5e', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#f0932a', color: '#131921', fontWeight: 700, border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Confirm Return</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 11. REPORTS PAGE (FINANCIAL & SALES) ────────────────────────── */
type ReportPeriod = 'Today' | '7Days' | 'ThisMonth' | 'ThisYear';

export function ReportsPage(): React.JSX.Element {
  const [period, setPeriod] = useState<ReportPeriod>('ThisMonth');

  const stats = {
    Today: { revenue: 48200, cogs: 35100, profit: 13100, orders: 114, margin: '27.2%' },
    '7Days': { revenue: 218500, cogs: 161200, profit: 57300, orders: 498, margin: '26.2%' },
    ThisMonth: { revenue: 845000, cogs: 625300, profit: 219700, orders: 1840, margin: '26.0%' },
    ThisYear: { revenue: 4890000, cogs: 3618600, profit: 1271400, orders: 10420, margin: '26.0%' },
  }[period];

  const topProducts = [
    { name: 'Fresh Milk 1L - Olpers', category: 'Dairy', units: 482, revenue: 134960, share: '16.0%' },
    { name: 'Basmati Rice 5kg Supreme', category: 'Grains', units: 84, revenue: 121800, share: '14.4%' },
    { name: 'Tapal Danedar Tea 450g', category: 'Beverages', units: 142, revenue: 96560, share: '11.4%' },
    { name: 'Dalda Cooking Oil 5L', category: 'Grocery', units: 38, revenue: 93100, share: '11.0%' },
    { name: 'Wheat Flour Chakki Atta 10kg', category: 'Grains', units: 72, revenue: 86400, share: '10.2%' },
  ];

  const handleExportCsv = (): void => {
    const csvContent = [
      ['MARTPOS - Financial & Sales Summary Report'],
      ['Period', period],
      ['Generated Date', new Date().toLocaleString()],
      [''],
      ['Financial Metric', 'Amount (PKR)'],
      ['Gross Sales Revenue', stats.revenue.toString()],
      ['Cost of Goods Sold (COGS)', stats.cogs.toString()],
      ['Gross Profit', stats.profit.toString()],
      ['Profit Margin', stats.margin],
      ['Total Completed Orders', stats.orders.toString()],
      [''],
      ['Top Selling Products Leaderboard'],
      ['Product Name', 'Category', 'Units Sold', 'Revenue (PKR)', 'Sales Contribution'],
      ...topProducts.map((p) => [p.name, p.category, p.units.toString(), p.revenue.toString(), p.share]),
    ]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MARTPOS_Report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Financial & Sales Reports</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Comprehensive P&L statements, tax audits, category shares, and CSV exports.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#131921', border: '1px solid #1b2530', borderRadius: '0.5rem', padding: '0.25rem' }}>
            {(['Today', '7Days', 'ThisMonth', 'ThisYear'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: period === p ? '#f0932a' : 'transparent',
                  color: period === p ? '#131921' : '#97a3b3',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                {p === '7Days' ? '7 Days' : p === 'ThisMonth' ? 'This Month' : p === 'ThisYear' ? 'This Year' : p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#1b2530',
              border: '1px solid #3b4a5e',
              color: 'white',
              fontWeight: 700,
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#131921', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700 }}>Gross Sales Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f0932a', marginTop: '0.375rem' }}>PKR {stats.revenue.toLocaleString()}.00</div>
          <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={14} /> +14.2% from previous period
          </div>
        </div>

        <div style={{ background: '#131921', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700 }}>Cost of Goods Sold (COGS)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', marginTop: '0.375rem' }}>PKR {stats.cogs.toLocaleString()}.00</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Supplier inventory acquisition cost</div>
        </div>

        <div style={{ background: '#131921', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700 }}>Estimated Gross Profit</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4ade80', marginTop: '0.375rem' }}>PKR {stats.profit.toLocaleString()}.00</div>
          <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>Gross Margin: {stats.margin}</div>
        </div>

        <div style={{ background: '#131921', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700 }}>Completed Transactions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', marginTop: '0.375rem' }}>{stats.orders.toLocaleString()} Bills</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Avg. Basket: PKR {Math.round(stats.revenue / stats.orders).toLocaleString()}</div>
        </div>
      </div>

      {/* Leaderboard & Payment Channels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Top selling products */}
        <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', padding: '1.25rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Top Selling Products Leaderboard</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1b2530', color: '#97a3b3' }}>
                <th style={{ paddingBottom: '0.75rem' }}>Product Name</th>
                <th style={{ paddingBottom: '0.75rem' }}>Units</th>
                <th style={{ paddingBottom: '0.75rem' }}>Total Sales</th>
                <th style={{ paddingBottom: '0.75rem', textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '0.75rem 0', color: '#97a3b3' }}>{p.units} pkgs</td>
                  <td style={{ padding: '0.75rem 0', fontWeight: 700, color: '#f0932a' }}>PKR {p.revenue.toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>{p.share}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Channels */}
        <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>Payment Methods Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#97a3b3', marginBottom: '0.25rem' }}>
                <span>Cash on Counter</span>
                <span style={{ color: 'white', fontWeight: 700 }}>68%</span>
              </div>
              <div style={{ height: '8px', background: '#1b2530', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '68%', height: '100%', background: '#4ade80' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#97a3b3', marginBottom: '0.25rem' }}>
                <span>Debit / Credit Cards</span>
                <span style={{ color: 'white', fontWeight: 700 }}>24%</span>
              </div>
              <div style={{ height: '8px', background: '#1b2530', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '24%', height: '100%', background: '#f0932a' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#97a3b3', marginBottom: '0.25rem' }}>
                <span>Raast / EasyPaisa / QR</span>
                <span style={{ color: 'white', fontWeight: 700 }}>8%</span>
              </div>
              <div style={{ height: '8px', background: '#1b2530', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '8%', height: '100%', background: '#60a5fa' }} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', background: '#0d1218', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #1b2530', fontSize: '0.75rem', color: '#97a3b3' }}>
            All payments are recorded into the double-entry accounting ledger with real-time reconciliations.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 12. USERS & STAFF MANAGEMENT ───────────────────────────────── */
interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: 'Administrator' | 'Store Manager' | 'Cashier';
  counter: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
}

export function UsersPage(): React.JSX.Element {
  const [users, setUsers] = useState<StaffUser[]>([
    {
      id: 1,
      name: 'Muhammad Mubeen Qazi',
      email: 'mubeen@martpos.com',
      role: 'Administrator',
      counter: 'Back Office / All',
      status: 'Active',
      lastActive: 'Active Now',
    },
    {
      id: 2,
      name: 'Kashif Ali',
      email: 'kashif.mgr@martpos.com',
      role: 'Store Manager',
      counter: 'Manager Desk',
      status: 'Active',
      lastActive: '25 mins ago',
    },
    {
      id: 3,
      name: 'Bilal Ahmed',
      email: 'bilal.counter1@martpos.com',
      role: 'Cashier',
      counter: 'Counter #1',
      status: 'Active',
      lastActive: '10 mins ago',
    },
    {
      id: 4,
      name: 'Hamza Raza',
      email: 'hamza.counter2@martpos.com',
      role: 'Cashier',
      counter: 'Counter #2',
      status: 'Inactive',
      lastActive: 'Yesterday',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Administrator' | 'Store Manager' | 'Cashier'>('Cashier');
  const [counter, setCounter] = useState('Counter #1');

  const toggleStatus = (id: number): void => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u)),
    );
  };

  const handleAddUser = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name || !email) return;
    const newUser: StaffUser = {
      id: Date.now(),
      name,
      email,
      role,
      counter,
      status: 'Active',
      lastActive: 'Just registered',
    };
    setUsers([...users, newUser]);
    setName('');
    setEmail('');
    setShowModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Staff & Cashier Permissions</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Assign counter terminals, access roles, and audit permissions.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontWeight: 700,
            borderRadius: '0.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Total Staff Accounts</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'white', marginTop: '0.25rem' }}>{users.length} Users</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Configured across registers</div>
        </div>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Active Cashiers On Duty</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>
            {users.filter((u) => u.role === 'Cashier' && u.status === 'Active').length} Cashiers
          </div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Authorized to scan & bill</div>
        </div>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Store Administrators</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#f0932a', marginTop: '0.25rem' }}>
            {users.filter((u) => u.role === 'Administrator').length} Super Admin
          </div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Full pricing & reports privilege</div>
        </div>
      </div>

      {/* Staff Table */}
      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2530', backgroundColor: '#0d1218', color: '#97a3b3' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Staff Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Email / Login</th>
              <th style={{ padding: '0.75rem 1rem' }}>Role</th>
              <th style={{ padding: '0.75rem 1rem' }}>Terminal / Counter</th>
              <th style={{ padding: '0.75rem 1rem' }}>Last Activity</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #1b2530', color: 'white' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{u.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{u.email}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor:
                        u.role === 'Administrator'
                          ? 'rgba(240, 147, 42, 0.15)'
                          : u.role === 'Store Manager'
                            ? 'rgba(96, 165, 250, 0.15)'
                            : 'rgba(74, 222, 128, 0.15)',
                      color:
                        u.role === 'Administrator' ? '#f0932a' : u.role === 'Store Manager' ? '#60a5fa' : '#4ade80',
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{u.counter}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#97a3b3' }}>{u.lastActive}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: u.status === 'Active' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                      color: u.status === 'Active' ? '#4ade80' : '#f87171',
                    }}
                  >
                    {u.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => toggleStatus(u.id)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #3b4a5e',
                      background: '#1b2530',
                      color: u.status === 'Active' ? '#f87171' : '#4ade80',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {u.status === 'Active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#131921', border: '1px solid #3b4a5e', borderRadius: '0.75rem', padding: '1.5rem', width: '450px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.125rem', fontWeight: 800 }}>Add Store Staff User</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#97a3b3', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Salman Malik" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Staff Email / Login ID</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="salman@martpos.com" required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Security Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}>
                    <option value="Cashier">Cashier (POS Only)</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Counter Assignment</label>
                  <select value={counter} onChange={(e) => setCounter(e.target.value)} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }}>
                    <option value="Counter #1">Counter #1</option>
                    <option value="Counter #2">Counter #2</option>
                    <option value="Counter #3">Counter #3</option>
                    <option value="Manager Desk">Manager Desk</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.625rem 1rem', background: '#1b2530', color: '#97a3b3', border: '1px solid #3b4a5e', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#f0932a', color: '#131921', fontWeight: 700, border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 13. SETTINGS & CLOUD SYNC ──────────────────────────────────── */
export function SettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'store' | 'receipt' | 'cloud'>('store');
  const [storeName, setStoreName] = useState('Metro Super Mart (Gulberg Branch)');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [taxNumber, setTaxNumber] = useState('NTN-894215-0');
  const [address, setAddress] = useState('Plot #44, Main Boulevard, Gulberg III, Lahore');
  const [receiptHeader, setReceiptHeader] = useState('Welcome to Metro Mart - Quality Guaranteed');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us! No refund without receipt.');
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [supabaseUrl] = useState('https://mydhyrxkhoqodprnxijv.supabase.co');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('Today at 01:25 PM');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent): void => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSyncNow = (): void => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync('Just now');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Store & Cloud Sync Settings</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Configure store profile, thermal receipt printing, tax rates, and Supabase cloud sync.</p>
        </div>
        {saveSuccess && (
          <div style={{ background: 'rgba(74, 222, 128, 0.15)', border: '1px solid #4ade80', color: '#4ade80', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1b2530', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          style={{
            padding: '0.625rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: activeTab === 'store' ? '#131921' : 'transparent',
            color: activeTab === 'store' ? '#f0932a' : '#97a3b3',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Store size={16} />
          <span>Store Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipt')}
          style={{
            padding: '0.625rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: activeTab === 'receipt' ? '#131921' : 'transparent',
            color: activeTab === 'receipt' ? '#f0932a' : '#97a3b3',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Receipt size={16} />
          <span>Receipt & Thermal Printing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          style={{
            padding: '0.625rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: activeTab === 'cloud' ? '#131921' : 'transparent',
            color: activeTab === 'cloud' ? '#f0932a' : '#97a3b3',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Cloud size={16} />
          <span>Cloud Sync & Supabase</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', padding: '1.5rem' }}>
        {activeTab === 'store' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>Store Brand Name</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>Contact Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>FBR NTN / Tax ID</label>
                <input type="text" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>Physical Store Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} required style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
            </div>
            <div>
              <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f0932a', color: '#131921', fontWeight: 700, border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Save Store Profile</button>
            </div>
          </form>
        )}

        {activeTab === 'receipt' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>Receipt Header Announcement</label>
              <input type="text" value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>Receipt Footer Disclaimer</label>
              <textarea value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} rows={2} style={{ width: '100%', padding: '0.625rem', backgroundColor: '#0d1218', border: '1px solid #3b4a5e', borderRadius: '0.5rem', color: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>Thermal Printer Paper Width</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer' }}>
                  <input type="radio" name="paper" value="80mm" checked={paperSize === '80mm'} onChange={() => setPaperSize('80mm')} />
                  <span>80mm Standard POS Thermal Roll (ESC/POS)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer' }}>
                  <input type="radio" name="paper" value="58mm" checked={paperSize === '58mm'} onChange={() => setPaperSize('58mm')} />
                  <span>58mm Compact Receipt</span>
                </label>
              </div>
            </div>
            <div>
              <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f0932a', color: '#131921', fontWeight: 700, border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Save Printing Preferences</button>
            </div>
          </form>
        )}

        {activeTab === 'cloud' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '650px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0d1218', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #1b2530' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem' }}>Supabase Cloud Database Connected</div>
                <div style={{ color: '#97a3b3', fontSize: '0.75rem' }}>Project URL: {supabaseUrl}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#0d1218', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #1b2530' }}>
                <div style={{ fontSize: '0.75rem', color: '#97a3b3' }}>Sync Engine Mode</div>
                <div style={{ color: '#f0932a', fontWeight: 800, marginTop: '0.25rem' }}>Two-Way Cloud Sync</div>
              </div>
              <div style={{ background: '#0d1218', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #1b2530' }}>
                <div style={{ fontSize: '0.75rem', color: '#97a3b3' }}>Last Successful Sync</div>
                <div style={{ color: '#4ade80', fontWeight: 800, marginTop: '0.25rem' }}>{lastSync}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f0932a',
                  color: '#131921',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Synchronizing Database...' : 'Sync Cloud Now'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 14. 404 NOT FOUND ──────────────────────────────────────────── */
export function NotFoundPage(): React.JSX.Element {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>404 - Page Not Found</h2>
      <p style={{ color: '#97a3b3' }}>The requested module is not available.</p>
    </div>
  );
}
