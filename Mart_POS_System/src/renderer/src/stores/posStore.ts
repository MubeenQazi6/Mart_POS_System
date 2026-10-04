import { create } from 'zustand';
import type {
  SaleRow,
  HeldBillRow,
  PaymentInput,
  PosLookupResult,
} from '@shared/types/sales';
import { showToast } from '@renderer/components/ui/Toast';

export interface PosCartItem {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  selling_price_minor: number;
  quantity: number; // Scaled by 1000 (e.g. 1000 = 1 unit, 1500 = 1.5 units)
  discount_minor: number; // Per-item discount in minor units
  is_manual: boolean;
  barcode?: string;
}

interface PosState {
  // Cart state
  items: PosCartItem[];
  billDiscountMinor: number;

  // Held bills state
  heldBills: HeldBillRow[];
  isLoadingHeldBills: boolean;

  // Modals & Active Sale state
  isPaymentModalOpen: boolean;
  isHeldBillsModalOpen: boolean;
  isReceiptModalOpen: boolean;
  completedSale: SaleRow | null;
  isProcessingSale: boolean;

  // Cart calculations (for UI representation only)
  getSubtotalMinor: () => number;
  getTotalDiscountMinor: () => number;
  getTotalMinor: () => number;
  getItemCount: () => number;

  // Cart Actions
  addItem: (item: Omit<PosCartItem, 'quantity' | 'discount_minor' | 'is_manual'> & { quantity?: number; discount_minor?: number; is_manual?: boolean }) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  updateItemDiscount: (variantId: number, discountMinor: number) => void;
  removeItem: (variantId: number) => void;
  clearCart: () => void;
  setBillDiscount: (discountMinor: number) => void;

  // Barcode Scanning
  lookupAndAddBarcode: (barcode: string) => Promise<boolean>;

  // Held Bills Actions
  loadHeldBills: () => Promise<void>;
  holdCurrentBill: (notes?: string) => Promise<boolean>;
  resumeHeldBill: (id: number) => Promise<boolean>;
  deleteHeldBill: (id: number) => Promise<boolean>;

  // Payment & Finalize
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openHeldBillsModal: () => void;
  closeHeldBillsModal: () => void;
  closeReceiptModal: () => void;
  completeSale: (payments: PaymentInput[], notes?: string, customerId?: number) => Promise<SaleRow | null>;
}

export const usePosStore = create<PosState>((set, get) => ({
  items: [],
  billDiscountMinor: 0,
  heldBills: [],
  isLoadingHeldBills: false,
  isPaymentModalOpen: false,
  isHeldBillsModalOpen: false,
  isReceiptModalOpen: false,
  completedSale: null,
  isProcessingSale: false,

  getSubtotalMinor: () => {
    return get().items.reduce((sum, item) => {
      const line = Math.round((item.quantity * item.selling_price_minor) / 1000);
      return sum + line;
    }, 0);
  },

  getTotalDiscountMinor: () => {
    const itemDiscounts = get().items.reduce((sum, item) => sum + item.discount_minor, 0);
    return itemDiscounts + get().billDiscountMinor;
  },

  getTotalMinor: () => {
    const subtotal = get().getSubtotalMinor();
    const discounts = get().getTotalDiscountMinor();
    return Math.max(0, subtotal - discounts);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity / 1000, 0);
  },

  addItem: (newItem) => {
    const defaultQty = newItem.quantity ?? 1000;
    const defaultDiscount = newItem.discount_minor ?? 0;

    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.variant_id === newItem.variant_id);
      if (existingIndex >= 0) {
        const updated = [...state.items];
        const existing = updated[existingIndex];
        if (existing) {
          updated[existingIndex] = {
            ...existing,
            quantity: existing.quantity + defaultQty,
          };
        }
        return { items: updated };
      }

      return {
        items: [
          ...state.items,
          {
            variant_id: newItem.variant_id,
            product_name: newItem.product_name,
            variant_name: newItem.variant_name,
            sku: newItem.sku,
            selling_price_minor: newItem.selling_price_minor,
            quantity: defaultQty,
            discount_minor: defaultDiscount,
            is_manual: newItem.is_manual === true,
            barcode: newItem.barcode,
          },
        ],
      };
    });
  },

  updateQuantity: (variantId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(variantId);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.variant_id === variantId ? { ...item, quantity } : item
      ),
    }));
  },

  updateItemDiscount: (variantId, discountMinor) => {
    const safeDiscount = Math.max(0, discountMinor);
    set((state) => ({
      items: state.items.map((item) =>
        item.variant_id === variantId ? { ...item, discount_minor: safeDiscount } : item
      ),
    }));
  },

  removeItem: (variantId) => {
    set((state) => ({
      items: state.items.filter((item) => item.variant_id !== variantId),
    }));
  },

  clearCart: () => {
    set({ items: [], billDiscountMinor: 0 });
  },

  setBillDiscount: (discountMinor) => {
    set({ billDiscountMinor: Math.max(0, discountMinor) });
  },

  lookupAndAddBarcode: async (barcode: string) => {
    if (!window.martpos) return false;
    const clean = barcode.trim();
    if (!clean) return false;

    try {
      const res = await window.martpos.sales.lookupBarcode(clean);
      if (res.success && res.data) {
        const item = res.data;
        if (item.available_stock <= 0) {
          showToast('error', `${item.product_name} (${item.variant_name}) is out of stock. Use Add Manually from the product list if the physical item is available.`);
          return false;
        }
        const existing = get().items.find((cartItem) => cartItem.variant_id === item.variant_id);
        if ((existing?.quantity ?? 0) + 1000 > item.available_stock) {
          showToast('error', `Only ${String(item.available_stock / 1000)} units are available for ${item.product_name}.`);
          return false;
        }
        get().addItem({
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          sku: item.sku,
          selling_price_minor: item.selling_price_minor,
          barcode: item.barcode,
        });
        return true;
      }
      showToast('error', 'No Product Found on this Barcode<br />Please scan a correct barcode');
      return false;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Barcode lookup failed');
      return false;
    }
  },

  loadHeldBills: async () => {
    if (!window.martpos) return;
    set({ isLoadingHeldBills: true });
    try {
      const res = await window.martpos.sales.getHeldBills();
      if (res.success) {
        set({ heldBills: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingHeldBills: false });
    }
  },

  holdCurrentBill: async (notes) => {
    if (!window.martpos) return false;
    const items = get().items;
    if (items.length === 0) {
      showToast('error', 'Cannot hold an empty cart');
      return false;
    }

    try {
      const input = {
        items: items.map((i) => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
          discount_minor: i.discount_minor,
          is_manual: i.is_manual,
        })),
        discount_minor: get().billDiscountMinor,
        notes,
      };

      const res = await window.martpos.sales.holdBill(input);
      if (res.success) {
        showToast('success', `Bill held (ID: ${String(res.data.id)})`);
        get().clearCart();
        void get().loadHeldBills();
        return true;
      }
      showToast('error', res.error);
      return false;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to hold bill');
      return false;
    }
  },

  resumeHeldBill: async (id: number) => {
    if (!window.martpos) return false;
    try {
      const res = await window.martpos.sales.resumeHeldBill(id);
      if (!res.success) {
        showToast('error', res.error);
        return false;
      }

      const bill = res.data;
      const parsed = JSON.parse(bill.cart_data) as {
        items: Array<{ variant_id: number; quantity: number; discount_minor: number; is_manual?: boolean }>;
        discount_minor: number;
      };

      // Hydrate product details for all items from product search / get
      const hydratedItems: PosCartItem[] = [];
      for (const rawItem of parsed.items) {
        // Query products or lookup
        const productRes = await window.martpos.products.list({ is_active: true });
        let foundDetails: PosLookupResult | null = null;

        if (productRes.success) {
          for (const prod of productRes.data) {
            const v = prod.variants?.find((varItem) => varItem.id === rawItem.variant_id);
            if (v) {
              foundDetails = {
                variant_id: v.id,
                product_id: prod.id,
                product_name: prod.name,
                variant_name: v.variant_name,
                sku: v.sku,
                selling_price_minor: v.selling_price_minor,
                barcode: v.barcodes?.[0]?.barcode ?? '',
                is_active: v.is_active,
                  available_stock: v.available_stock ?? 0,
              };
              break;
            }
          }
        }

        hydratedItems.push({
          variant_id: rawItem.variant_id,
          product_name: foundDetails?.product_name ?? `Item #${String(rawItem.variant_id)}`,
          variant_name: foundDetails?.variant_name ?? '',
          sku: foundDetails?.sku ?? null,
          selling_price_minor: foundDetails?.selling_price_minor ?? 0,
          quantity: rawItem.quantity,
          discount_minor: rawItem.discount_minor,
          is_manual: rawItem.is_manual === true,
          barcode: foundDetails?.barcode,
        });
      }

      set({
        items: hydratedItems,
        billDiscountMinor: parsed.discount_minor,
        isHeldBillsModalOpen: false,
      });

      showToast('success', 'Held bill resumed to cart');
      void get().loadHeldBills();
      return true;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to resume held bill');
      return false;
    }
  },

  deleteHeldBill: async (id: number) => {
    if (!window.martpos) return false;
    try {
      const res = await window.martpos.sales.deleteHeldBill(id);
      if (res.success) {
        showToast('info', 'Held bill removed');
        void get().loadHeldBills();
        return true;
      }
      showToast('error', res.error);
      return false;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete held bill');
      return false;
    }
  },

  openPaymentModal: () => {
    if (get().items.length === 0) {
      showToast('error', 'Cart is empty');
      return;
    }
    set({ isPaymentModalOpen: true });
  },

  closePaymentModal: () => {
    set({ isPaymentModalOpen: false });
  },
  openHeldBillsModal: () => {
    void get().loadHeldBills();
    set({ isHeldBillsModalOpen: true });
  },
  closeHeldBillsModal: () => {
    set({ isHeldBillsModalOpen: false });
  },
  closeReceiptModal: () => {
    set({ isReceiptModalOpen: false, completedSale: null });
  },

  completeSale: async (payments: PaymentInput[], notes?: string, customerId?: number) => {
    if (!window.martpos) return null;
    const items = get().items;
    if (items.length === 0) {
      showToast('error', 'Cart is empty');
      return null;
    }

    set({ isProcessingSale: true });
    try {
      const input = {
        items: items.map((i) => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
          discount_minor: i.discount_minor,
          is_manual: i.is_manual,
        })),
        payments,
        discount_minor: get().billDiscountMinor,
        customer_id: customerId,
        notes,
      };

      const res = await window.martpos.sales.create(input);
      if (res.success) {
        get().clearCart();
        set({
          isPaymentModalOpen: false,
          completedSale: res.data,
          isReceiptModalOpen: true,
        });
        return res.data;
      }
      showToast('error', res.error);
      return null;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Sale failed');
      return null;
    } finally {
      set({ isProcessingSale: false });
    }
  },
}));
