import { create } from 'zustand';
import type {
  WarehouseBin,
  GoodsReceivedNote,
  StockTransferOrder,
  WarehouseStockItem,
  WarehouseKPIs,
  GrnStatus,
  TransferStatus,
} from '../types/warehouse';
import { warehouseApi } from '../lib/warehouseWebAdapter';

interface WarehouseState {
  kpis: WarehouseKPIs | null;
  bins: WarehouseBin[];
  stock: WarehouseStockItem[];
  grns: GoodsReceivedNote[];
  transfers: StockTransferOrder[];
  isLoading: boolean;

  loadAll: () => Promise<void>;
  createGrn: (grnData: Omit<GoodsReceivedNote, 'id' | 'grnNumber' | 'receivedAt'>) => Promise<void>;
  updateGrnStatus: (id: string, status: GrnStatus) => Promise<void>;
  createTransfer: (orderData: Omit<StockTransferOrder, 'id' | 'transferNumber' | 'createdAt'>) => Promise<void>;
  updateTransferStatus: (id: string, status: TransferStatus) => Promise<void>;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  kpis: null,
  bins: [],
  stock: [],
  grns: [],
  transfers: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [kpis, bins, stock, grns, transfers] = await Promise.all([
        warehouseApi.getKPIs(),
        warehouseApi.listBins(),
        warehouseApi.listStock(),
        warehouseApi.listGrns(),
        warehouseApi.listTransfers(),
      ]);
      set({ kpis, bins, stock, grns, transfers });
    } finally {
      set({ isLoading: false });
    }
  },

  createGrn: async (grnData) => {
    await warehouseApi.createGrn(grnData);
    await get().loadAll();
  },

  updateGrnStatus: async (id, status) => {
    await warehouseApi.updateGrnStatus(id, status);
    await get().loadAll();
  },

  createTransfer: async (orderData) => {
    await warehouseApi.createTransfer(orderData);
    await get().loadAll();
  },

  updateTransferStatus: async (id, status) => {
    await warehouseApi.updateTransferStatus(id, status);
    await get().loadAll();
  },
}));
