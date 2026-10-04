import React, { useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Printer,
  CheckCircle2,
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
export function PurchasesPage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Purchase Invoices & POs</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Record stock deliveries, supplier invoices, and payment terms.</p>
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
          <span>New Purchase Order</span>
        </button>
      </div>

      <div style={{ backgroundColor: '#131921', borderRadius: '0.75rem', border: '1px solid #1b2530', padding: '2rem', textAlign: 'center', color: '#97a3b3' }}>
        Purchase invoices automatically add quantities into inventory and update your supplier payable ledger.
      </div>
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
      { id: Date.now(), category: 'General', title: newTitle, amount: `PKR ${newAmount}`, date: 'Today' },
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

      {/* Add expense form */}
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
export function CashPage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Register Shift & Cash Drawer</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Manage shift opening balance, cash deposits/withdrawals, and end-of-day tally.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Current Register Status</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>Open (Counter #1)</div>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginTop: '0.25rem' }}>Shift started at 09:00 AM</div>
        </div>

        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Opening Float</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginTop: '0.25rem' }}>PKR 5,000.00</div>
        </div>

        <div style={{ background: '#131921', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.75rem', color: '#97a3b3', fontWeight: 700 }}>Expected Drawer Cash</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f0932a', marginTop: '0.25rem' }}>PKR 19,500.00</div>
        </div>
      </div>
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

      {/* Label stickers preview grid */}
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
            {/* Barcode visual representation */}
            <div style={{ margin: '0.5rem 0 0.25rem', height: '36px', width: '100%', background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px)' }} />
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{s.barcode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 10. RETURNS PAGE ───────────────────────────────────────────── */
export function ReturnsPage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Sales & Purchase Returns</h1>
      <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: 0 }}>Lookup past receipt ID or barcode to issue refund or swap replacement items.</p>
    </div>
  );
}

/* ─── 11. REPORTS PAGE ───────────────────────────────────────────── */
export function ReportsPage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Financial & Sales Reports</h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Comprehensive P&L statements, tax audits, and CSV exports.</p>
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
          Export CSV Summary
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#131921', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700 }}>This Month Net Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f0932a', marginTop: '0.375rem' }}>PKR 485,000.00</div>
        </div>
        <div style={{ background: '#131921', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700 }}>Cost of Goods Sold (COGS)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', marginTop: '0.375rem' }}>PKR 361,000.00</div>
        </div>
        <div style={{ background: '#131921', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1b2530' }}>
          <div style={{ fontSize: '0.8125rem', color: '#97a3b3', fontWeight: 700 }}>Estimated Gross Profit</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4ade80', marginTop: '0.375rem' }}>PKR 124,000.00</div>
        </div>
      </div>
    </div>
  );
}

/* ─── 12. USERS PAGE ─────────────────────────────────────────────── */
export function UsersPage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Staff & Cashier Permissions</h1>
      <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: 0 }}>Assign counter access, discount limits, and void permissions.</p>
    </div>
  );
}

/* ─── 13. SETTINGS PAGE ──────────────────────────────────────────── */
export function SettingsPage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Store & Cloud Sync Settings</h1>
      <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: 0 }}>Configure tax rate, receipt footer message, printer type, and cloud DB tokens.</p>
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
