import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { WarehouseDashboard } from '../features/dashboard/WarehouseDashboard';
import { GrnListPage } from '../features/inbound/GrnListPage';
import { BinManagementPage } from '../features/bins/BinManagementPage';
import { WarehouseStockPage } from '../features/stock/WarehouseStockPage';
import { StockTransfersPage } from '../features/transfers/StockTransfersPage';
import { WarehouseReportsPage } from '../features/reports/WarehouseReportsPage';
import { WarehouseSettingsPage } from '../features/settings/WarehouseSettingsPage';

export function WarehouseRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<WarehouseDashboard />} />
      <Route path="/inbound" element={<GrnListPage />} />
      <Route path="/bins" element={<BinManagementPage />} />
      <Route path="/stock" element={<WarehouseStockPage />} />
      <Route path="/transfers" element={<StockTransfersPage />} />
      <Route path="/reports" element={<WarehouseReportsPage />} />
      <Route path="/settings" element={<WarehouseSettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
