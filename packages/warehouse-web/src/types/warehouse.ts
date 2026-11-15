export type BinStatus = 'available' | 'occupied' | 'full' | 'maintenance';

export interface WarehouseBin {
  id: string;
  code: string; // e.g. "A-01-03-B" (Zone-Aisle-Rack-Shelf)
  zone: string; // "Zone A - Fast Moving"
  aisle: string;
  rack: string;
  shelf: string;
  maxWeightKg: number;
  currentWeightKg: number;
  status: BinStatus;
  currentSkuCount: number;
}

export type GrnStatus = 'PENDING_INSPECTION' | 'APPROVED' | 'PARTIAL' | 'REJECTED';

export interface GrnItem {
  id: string;
  sku: string;
  productName: string;
  expectedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  batchNumber: string;
  expiryDate?: string;
  allocatedBinCode?: string;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string; // e.g. "GRN-2026-0891"
  poNumber: string;
  supplierName: string;
  carrierName: string;
  trackingNumber?: string;
  receivedAt: string;
  receivedBy: string;
  status: GrnStatus;
  totalItems: number;
  notes?: string;
  items: GrnItem[];
}

export type TransferStatus = 'DRAFT' | 'PICKING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface TransferItem {
  id: string;
  sku: string;
  productName: string;
  requestedQty: number;
  pickedQty: number;
  binSource: string;
  batchNumber?: string;
}

export interface StockTransferOrder {
  id: string;
  transferNumber: string; // "STO-2026-0342"
  destinationStore: string; // e.g. "MartPOS - Al-Madina Main Branch"
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: TransferStatus;
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  vehicleNumber?: string;
  driverName?: string;
  notes?: string;
  items: TransferItem[];
}

export interface WarehouseStockItem {
  id: string;
  sku: string;
  barcode: string;
  productName: string;
  category: string;
  unit: string;
  availableQty: number;
  allocatedQty: number;
  inTransitQty: number;
  minThreshold: number;
  primaryBin: string;
  batches: {
    batchNumber: string;
    qty: number;
    binCode: string;
    expiryDate?: string;
  }[];
}

export interface WarehouseKPIs {
  totalSkus: number;
  totalPallets: number;
  binCapacityUsedPct: number;
  pendingInboundGrn: number;
  activeDispatches: number;
  expiringItemsCount: number;
  stockAccuracyPct: number;
}
