/**
 * WarehouseOS Cloud Data Layer (Supabase + Local Fallback)
 *
 * Implements real Supabase database operations for:
 * - Bins & Coordinate Matrix
 * - Stock & Batch Lot Inventory
 * - Inbound GRNs
 * - Stock Transfer Orders
 *
 * If Supabase is offline or not configured, gracefully falls back
 * to local storage ensuring 100% operational uptime.
 */

import { getWarehouseSupabase } from './warehouseSupabase';
import { warehouseApi } from './warehouseWebAdapter';
import type {
  WarehouseBin,
  WarehouseStockItem,
  GoodsReceivedNote,
  StockTransferOrder,
  WarehouseKPIs,
  GrnItem,
  TransferItem,
} from '../types/warehouse';

export async function fetchCloudBins(): Promise<WarehouseBin[]> {
  const supabase = getWarehouseSupabase();
  if (!supabase) {
    return warehouseApi.listBins();
  }

  try {
    const { data, error } = await supabase
      .from('warehouse_bins')
      .select('*')
      .order('zone', { ascending: true });

    if (error || !data || data.length === 0) {
      return warehouseApi.listBins();
    }

    return data.map((b) => ({
      id: b.id,
      code: b.code,
      zone: b.zone,
      aisle: b.aisle,
      rack: b.rack,
      shelf: b.shelf,
      maxWeightKg: Number(b.max_weight_kg),
      currentWeightKg: Number(b.current_weight_kg),
      status: b.status,
      currentSkuCount: 0,
    }));
  } catch {
    return warehouseApi.listBins();
  }
}

export async function fetchCloudStock(): Promise<WarehouseStockItem[]> {
  const supabase = getWarehouseSupabase();
  if (!supabase) {
    return warehouseApi.listStock();
  }

  try {
    const { data, error } = await supabase
      .from('warehouse_stock')
      .select('*, warehouse_bins(code)')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return warehouseApi.listStock();
    }

    return data.map((s) => ({
      id: s.id,
      sku: s.sku,
      barcode: s.barcode,
      productName: s.name,
      category: s.category,
      unit: s.unit,
      availableQty: s.quantity,
      allocatedQty: s.reserved_quantity,
      inTransitQty: 0,
      minThreshold: s.min_threshold,
      primaryBin: s.warehouse_bins?.code || 'UNASSIGNED',
      batches: s.batch_lot
        ? [
            {
              batchNumber: s.batch_lot,
              qty: s.quantity,
              binCode: s.warehouse_bins?.code || 'UNASSIGNED',
              expiryDate: s.expiry_date || undefined,
            },
          ]
        : [],
    }));
  } catch {
    return warehouseApi.listStock();
  }
}

export async function fetchCloudGrns(): Promise<GoodsReceivedNote[]> {
  const supabase = getWarehouseSupabase();
  if (!supabase) {
    return warehouseApi.listGrns();
  }

  try {
    const { data, error } = await supabase
      .from('warehouse_grn')
      .select('*, warehouse_grn_items(*)')
      .order('received_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return warehouseApi.listGrns();
    }

    return data.map((g) => ({
      id: g.id,
      grnNumber: g.grn_number,
      poNumber: g.po_number,
      supplierName: g.supplier_name,
      carrierName: g.carrier || 'Standard Freight',
      trackingNumber: g.tracking_number,
      status: (g.status?.toUpperCase() || 'APPROVED') as GoodsReceivedNote['status'],
      receivedBy: g.received_by,
      totalItems: g.total_items,
      notes: g.notes,
      receivedAt: g.received_at,
      items: (g.warehouse_grn_items || []).map((i: Record<string, unknown>): GrnItem => ({
        id: String(i.id),
        sku: String(i.sku),
        productName: String(i.product_name),
        expectedQty: Number(i.expected_qty),
        receivedQty: Number(i.received_qty),
        acceptedQty: Number(i.received_qty) - Number(i.rejected_qty || 0),
        rejectedQty: Number(i.rejected_qty || 0),
        unit: 'Carton',
        batchNumber: String(i.batch_lot || 'LOT-2026-X'),
        expiryDate: i.expiry_date ? String(i.expiry_date) : undefined,
        allocatedBinCode: undefined,
      })),
    }));
  } catch {
    return warehouseApi.listGrns();
  }
}

export async function createCloudGrn(
  grnData: Omit<GoodsReceivedNote, 'id' | 'grnNumber' | 'receivedAt'>
): Promise<GoodsReceivedNote> {
  const supabase = getWarehouseSupabase();
  if (!supabase) {
    return warehouseApi.createGrn(grnData);
  }

  try {
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const { data: grn, error: grnError } = await supabase
      .from('warehouse_grn')
      .insert({
        grn_number: grnNumber,
        po_number: grnData.poNumber,
        supplier_name: grnData.supplierName,
        carrier: grnData.carrierName,
        tracking_number: grnData.trackingNumber,
        status: grnData.status || 'APPROVED',
        received_by: grnData.receivedBy,
        total_items: grnData.items.length,
        notes: grnData.notes,
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (grnError || !grn) {
      return warehouseApi.createGrn(grnData);
    }

    if (grnData.items.length > 0) {
      await supabase.from('warehouse_grn_items').insert(
        grnData.items.map((item: GrnItem) => ({
          grn_id: grn.id,
          sku: item.sku,
          product_name: item.productName,
          expected_qty: item.expectedQty,
          received_qty: item.receivedQty,
          rejected_qty: item.rejectedQty,
          bin_id: null,
          batch_lot: item.batchNumber || null,
          expiry_date: item.expiryDate || null,
        }))
      );
    }

    return {
      ...grnData,
      id: grn.id,
      grnNumber,
      receivedAt: grn.received_at,
    };
  } catch {
    return warehouseApi.createGrn(grnData);
  }
}

export async function fetchCloudTransfers(): Promise<StockTransferOrder[]> {
  const supabase = getWarehouseSupabase();
  if (!supabase) {
    return warehouseApi.listTransfers();
  }

  try {
    const { data, error } = await supabase
      .from('warehouse_transfers')
      .select('*, warehouse_transfer_items(*)')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return warehouseApi.listTransfers();
    }

    return data.map((t) => ({
      id: t.id,
      transferNumber: t.transfer_number,
      destinationStore: t.destination_store,
      priority: (t.priority?.toUpperCase() || 'NORMAL') as StockTransferOrder['priority'],
      status: (t.status?.toUpperCase() || 'DRAFT') as StockTransferOrder['status'],
      vehicleNumber: t.vehicle_number,
      driverName: t.driver_name,
      notes: t.notes,
      createdAt: t.created_at,
      dispatchedAt: t.dispatched_at,
      deliveredAt: t.delivered_at,
      items: (t.warehouse_transfer_items || []).map((i: Record<string, unknown>): TransferItem => ({
        id: String(i.id),
        sku: String(i.sku),
        productName: String(i.product_name),
        requestedQty: Number(i.quantity || 1),
        pickedQty: Number(i.quantity || 1),
        binSource: String(i.source_bin_id || 'A-01-01-A'),
      })),
    }));
  } catch {
    return warehouseApi.listTransfers();
  }
}

export async function createCloudTransfer(
  transferData: Omit<StockTransferOrder, 'id' | 'transferNumber' | 'createdAt'>
): Promise<StockTransferOrder> {
  const supabase = getWarehouseSupabase();
  if (!supabase) {
    return warehouseApi.createTransfer(transferData);
  }

  try {
    const transferNumber = `STO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const { data: tr, error: trError } = await supabase
      .from('warehouse_transfers')
      .insert({
        transfer_number: transferNumber,
        destination_store: transferData.destinationStore,
        priority: transferData.priority,
        status: transferData.status || 'DRAFT',
        vehicle_number: transferData.vehicleNumber,
        driver_name: transferData.driverName,
        total_units: transferData.items.reduce((sum, item) => sum + item.requestedQty, 0),
        notes: transferData.notes,
      })
      .select()
      .single();

    if (trError || !tr) {
      return warehouseApi.createTransfer(transferData);
    }

    if (transferData.items.length > 0) {
      await supabase.from('warehouse_transfer_items').insert(
        transferData.items.map((item: TransferItem) => ({
          transfer_id: tr.id,
          sku: item.sku,
          product_name: item.productName,
          quantity: item.requestedQty,
          source_bin_id: null,
        }))
      );
    }

    return {
      ...transferData,
      id: tr.id,
      transferNumber,
      createdAt: tr.created_at,
    };
  } catch {
    return warehouseApi.createTransfer(transferData);
  }
}

export async function fetchCloudKpis(): Promise<WarehouseKPIs> {
  return warehouseApi.getKPIs();
}
