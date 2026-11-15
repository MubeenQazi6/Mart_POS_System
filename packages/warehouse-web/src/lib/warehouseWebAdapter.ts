import type {
  WarehouseBin,
  GoodsReceivedNote,
  StockTransferOrder,
  WarehouseStockItem,
  WarehouseKPIs,
  GrnStatus,
  TransferStatus,
} from '../types/warehouse';

const WAREHOUSE_STORAGE_KEYS = {
  BINS: 'warehouse_os_bins_v1',
  GRNS: 'warehouse_os_grns_v1',
  STOCK: 'warehouse_os_stock_v1',
  TRANSFERS: 'warehouse_os_transfers_v1',
  SETTINGS: 'warehouse_os_settings_v1',
};

// Seed Bins (Aisle, Rack, Shelf, Bin coordinates)
const SEED_BINS: WarehouseBin[] = [
  { id: 'b1', code: 'A-01-01-A', zone: 'Zone A (Fast-Moving Beverage)', aisle: '01', rack: '01', shelf: 'A', maxWeightKg: 1000, currentWeightKg: 640, status: 'occupied', currentSkuCount: 2 },
  { id: 'b2', code: 'A-01-01-B', zone: 'Zone A (Fast-Moving Beverage)', aisle: '01', rack: '01', shelf: 'B', maxWeightKg: 1000, currentWeightKg: 890, status: 'full', currentSkuCount: 1 },
  { id: 'b3', code: 'A-02-01-A', zone: 'Zone A (Fast-Moving Beverage)', aisle: '02', rack: '01', shelf: 'A', maxWeightKg: 1000, currentWeightKg: 0, status: 'available', currentSkuCount: 0 },
  { id: 'b4', code: 'B-01-03-A', zone: 'Zone B (Dry Foods & Grains)', aisle: '01', rack: '03', shelf: 'A', maxWeightKg: 2000, currentWeightKg: 1450, status: 'occupied', currentSkuCount: 3 },
  { id: 'b5', code: 'B-02-04-C', zone: 'Zone B (Dry Foods & Grains)', aisle: '02', rack: '04', shelf: 'C', maxWeightKg: 2000, currentWeightKg: 0, status: 'available', currentSkuCount: 0 },
  { id: 'b6', code: 'C-01-01-A', zone: 'Zone C (Cold Storage Dairy/Meat)', aisle: '01', rack: '01', shelf: 'A', maxWeightKg: 800, currentWeightKg: 520, status: 'occupied', currentSkuCount: 2 },
  { id: 'b7', code: 'D-03-02-B', zone: 'Zone D (Cleaning & Non-Food)', aisle: '03', rack: '02', shelf: 'B', maxWeightKg: 1500, currentWeightKg: 210, status: 'occupied', currentSkuCount: 1 },
  { id: 'b8', code: 'D-04-01-A', zone: 'Zone D (Cleaning & Non-Food)', aisle: '04', rack: '01', shelf: 'A', maxWeightKg: 1500, currentWeightKg: 0, status: 'available', currentSkuCount: 0 },
];

// Seed Warehouse Stock
const SEED_STOCK: WarehouseStockItem[] = [
  {
    id: 'ws1',
    sku: 'WH-BEV-001',
    barcode: '896400012001',
    productName: 'Olpers Full Cream Milk 1L (Carton of 12)',
    category: 'Dairy & Beverages',
    unit: 'Carton',
    availableQty: 320,
    allocatedQty: 40,
    inTransitQty: 100,
    minThreshold: 50,
    primaryBin: 'A-01-01-A',
    batches: [
      { batchNumber: 'LOT-2026-B1', qty: 200, binCode: 'A-01-01-A', expiryDate: '2026-12-15' },
      { batchNumber: 'LOT-2026-B2', qty: 120, binCode: 'A-01-01-B', expiryDate: '2027-02-28' },
    ],
  },
  {
    id: 'ws2',
    sku: 'WH-GRO-002',
    barcode: '896400012002',
    productName: 'Dalda Cooking Oil 5L Tin (Box of 4)',
    category: 'Edible Oils',
    unit: 'Box',
    availableQty: 180,
    allocatedQty: 25,
    inTransitQty: 60,
    minThreshold: 30,
    primaryBin: 'B-01-03-A',
    batches: [
      { batchNumber: 'LOT-DLD-99', qty: 180, binCode: 'B-01-03-A', expiryDate: '2027-06-30' },
    ],
  },
  {
    id: 'ws3',
    sku: 'WH-GRA-003',
    barcode: '896400012003',
    productName: 'Basmati Super Kernel Rice 25kg Sacks',
    category: 'Grains & Pulses',
    unit: 'Sack',
    availableQty: 450,
    allocatedQty: 80,
    inTransitQty: 150,
    minThreshold: 100,
    primaryBin: 'B-01-03-A',
    batches: [
      { batchNumber: 'LOT-RICE-2026', qty: 450, binCode: 'B-01-03-A', expiryDate: '2027-10-31' },
    ],
  },
  {
    id: 'ws4',
    sku: 'WH-BEV-004',
    barcode: '896400012004',
    productName: 'Tapal Danedar Tea 900g Pouch (Ctn of 24)',
    category: 'Tea & Coffee',
    unit: 'Carton',
    availableQty: 210,
    allocatedQty: 15,
    inTransitQty: 0,
    minThreshold: 40,
    primaryBin: 'A-01-01-B',
    batches: [
      { batchNumber: 'LOT-TPL-44', qty: 210, binCode: 'A-01-01-B', expiryDate: '2027-08-15' },
    ],
  },
];

// Seed Goods Received Notes
const SEED_GRNS: GoodsReceivedNote[] = [
  {
    id: 'grn1',
    grnNumber: 'GRN-2026-0412',
    poNumber: 'PO-ENG-9821',
    supplierName: 'Engro Foods Distribution',
    carrierName: 'National Logistics Cargo',
    trackingNumber: 'NLC-8841-PK',
    receivedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    receivedBy: 'Muhammad Asif (Lead Inbound Inspector)',
    status: 'APPROVED',
    totalItems: 320,
    notes: 'Seal verified intact. Temperature within 4-7C standard range.',
    items: [
      {
        id: 'gi1',
        sku: 'WH-BEV-001',
        productName: 'Olpers Full Cream Milk 1L (Carton of 12)',
        expectedQty: 320,
        receivedQty: 320,
        acceptedQty: 320,
        rejectedQty: 0,
        unit: 'Carton',
        batchNumber: 'LOT-2026-B2',
        expiryDate: '2027-02-28',
        allocatedBinCode: 'A-01-01-B',
      },
    ],
  },
  {
    id: 'grn2',
    grnNumber: 'GRN-2026-0413',
    poNumber: 'PO-DLD-4402',
    supplierName: 'Dalda Foods Ltd',
    carrierName: 'TCS Supply Chain',
    trackingNumber: 'TCS-901244',
    receivedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    receivedBy: 'Tariq Mehmood (Receiving Officer)',
    status: 'PENDING_INSPECTION',
    totalItems: 180,
    notes: 'Unloading pallet #4. Quality team physical sampling in progress.',
    items: [
      {
        id: 'gi2',
        sku: 'WH-GRO-002',
        productName: 'Dalda Cooking Oil 5L Tin (Box of 4)',
        expectedQty: 180,
        receivedQty: 180,
        acceptedQty: 0,
        rejectedQty: 0,
        unit: 'Box',
        batchNumber: 'LOT-DLD-99',
        expiryDate: '2027-06-30',
        allocatedBinCode: 'B-01-03-A',
      },
    ],
  },
];

// Seed Transfers to Retail Marts
const SEED_TRANSFERS: StockTransferOrder[] = [
  {
    id: 'tr1',
    transferNumber: 'STO-2026-0104',
    destinationStore: 'MartPOS Retail - Al-Madina Main Super Mart',
    priority: 'URGENT',
    status: 'DISPATCHED',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    dispatchedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    vehicleNumber: 'LES-26-8812 (Bedford 5-Ton)',
    driverName: 'Rashid Khan (Cell: 0300-5544112)',
    notes: 'Weekend high footfall restock for Counter POS.',
    items: [
      {
        id: 'ti1',
        sku: 'WH-BEV-001',
        productName: 'Olpers Full Cream Milk 1L',
        requestedQty: 40,
        pickedQty: 40,
        binSource: 'A-01-01-A',
        batchNumber: 'LOT-2026-B1',
      },
      {
        id: 'ti2',
        sku: 'WH-GRO-002',
        productName: 'Dalda Cooking Oil 5L Box',
        requestedQty: 25,
        pickedQty: 25,
        binSource: 'B-01-03-A',
        batchNumber: 'LOT-DLD-99',
      },
    ],
  },
  {
    id: 'tr2',
    transferNumber: 'STO-2026-0105',
    destinationStore: 'MartPOS Retail - Gulberg Express Branch',
    priority: 'NORMAL',
    status: 'PICKING',
    createdAt: new Date().toISOString(),
    notes: 'Regular replenishment batch.',
    items: [
      {
        id: 'ti3',
        sku: 'WH-GRA-003',
        productName: 'Basmati Super Kernel Rice 25kg',
        requestedQty: 80,
        pickedQty: 45,
        binSource: 'B-01-03-A',
        batchNumber: 'LOT-RICE-2026',
      },
    ],
  },
];

function getStorage<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save warehouse storage item', err);
  }
}

export const warehouseApi = {
  // KPIs
  getKPIs: async (): Promise<WarehouseKPIs> => {
    const stock = getStorage(WAREHOUSE_STORAGE_KEYS.STOCK, SEED_STOCK);
    const bins = getStorage(WAREHOUSE_STORAGE_KEYS.BINS, SEED_BINS);
    const grns = getStorage(WAREHOUSE_STORAGE_KEYS.GRNS, SEED_GRNS);
    const transfers = getStorage(WAREHOUSE_STORAGE_KEYS.TRANSFERS, SEED_TRANSFERS);

    const occupiedBins = bins.filter((b) => b.status === 'occupied' || b.status === 'full').length;
    const capacityPct = Math.round((occupiedBins / (bins.length || 1)) * 100);

    return {
      totalSkus: stock.length,
      totalPallets: 42,
      binCapacityUsedPct: capacityPct,
      pendingInboundGrn: grns.filter((g) => g.status === 'PENDING_INSPECTION').length,
      activeDispatches: transfers.filter((t) => t.status === 'DISPATCHED' || t.status === 'PICKING').length,
      expiringItemsCount: 1,
      stockAccuracyPct: 99.8,
    };
  },

  // Bins
  listBins: async (): Promise<WarehouseBin[]> => {
    return getStorage(WAREHOUSE_STORAGE_KEYS.BINS, SEED_BINS);
  },

  createBin: async (bin: Omit<WarehouseBin, 'id'>): Promise<WarehouseBin> => {
    const bins = getStorage(WAREHOUSE_STORAGE_KEYS.BINS, SEED_BINS);
    const newBin: WarehouseBin = { ...bin, id: 'bin_' + Date.now() };
    bins.push(newBin);
    setStorage(WAREHOUSE_STORAGE_KEYS.BINS, bins);
    return newBin;
  },

  updateBinStatus: async (id: string, status: WarehouseBin['status']): Promise<void> => {
    const bins = getStorage(WAREHOUSE_STORAGE_KEYS.BINS, SEED_BINS);
    const idx = bins.findIndex((b) => b.id === id);
    if (idx !== -1) {
      bins[idx].status = status;
      setStorage(WAREHOUSE_STORAGE_KEYS.BINS, bins);
    }
  },

  // Stock
  listStock: async (): Promise<WarehouseStockItem[]> => {
    return getStorage(WAREHOUSE_STORAGE_KEYS.STOCK, SEED_STOCK);
  },

  // GRN (Inbound)
  listGrns: async (): Promise<GoodsReceivedNote[]> => {
    return getStorage(WAREHOUSE_STORAGE_KEYS.GRNS, SEED_GRNS);
  },

  createGrn: async (grnData: Omit<GoodsReceivedNote, 'id' | 'grnNumber' | 'receivedAt'>): Promise<GoodsReceivedNote> => {
    const grns = getStorage(WAREHOUSE_STORAGE_KEYS.GRNS, SEED_GRNS);
    const count = grns.length + 414;
    const newGrn: GoodsReceivedNote = {
      ...grnData,
      id: 'grn_' + Date.now(),
      grnNumber: `GRN-2026-${String(count).padStart(4, '0')}`,
      receivedAt: new Date().toISOString(),
    };
    grns.unshift(newGrn);
    setStorage(WAREHOUSE_STORAGE_KEYS.GRNS, grns);
    return newGrn;
  },

  updateGrnStatus: async (id: string, status: GrnStatus): Promise<void> => {
    const grns = getStorage(WAREHOUSE_STORAGE_KEYS.GRNS, SEED_GRNS);
    const idx = grns.findIndex((g) => g.id === id);
    if (idx !== -1) {
      grns[idx].status = status;
      setStorage(WAREHOUSE_STORAGE_KEYS.GRNS, grns);
    }
  },

  // Stock Transfers
  listTransfers: async (): Promise<StockTransferOrder[]> => {
    return getStorage(WAREHOUSE_STORAGE_KEYS.TRANSFERS, SEED_TRANSFERS);
  },

  createTransfer: async (orderData: Omit<StockTransferOrder, 'id' | 'transferNumber' | 'createdAt'>): Promise<StockTransferOrder> => {
    const transfers = getStorage(WAREHOUSE_STORAGE_KEYS.TRANSFERS, SEED_TRANSFERS);
    const count = transfers.length + 106;
    const newTransfer: StockTransferOrder = {
      ...orderData,
      id: 'sto_' + Date.now(),
      transferNumber: `STO-2026-${String(count).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };
    transfers.unshift(newTransfer);
    setStorage(WAREHOUSE_STORAGE_KEYS.TRANSFERS, transfers);
    return newTransfer;
  },

  updateTransferStatus: async (id: string, status: TransferStatus): Promise<void> => {
    const transfers = getStorage(WAREHOUSE_STORAGE_KEYS.TRANSFERS, SEED_TRANSFERS);
    const idx = transfers.findIndex((t) => t.id === id);
    if (idx !== -1) {
      transfers[idx].status = status;
      if (status === 'DISPATCHED') {
        transfers[idx].dispatchedAt = new Date().toISOString();
      } else if (status === 'DELIVERED') {
        transfers[idx].deliveredAt = new Date().toISOString();
      }
      setStorage(WAREHOUSE_STORAGE_KEYS.TRANSFERS, transfers);
    }
  },
};
