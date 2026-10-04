import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import {
  PosPage,
  ProductsPage,
  InventoryPage,
  PurchasesPage,
  SuppliersPage,
  CustomersPage,
  ReturnsPage,
  ExpensesPage,
  CashPage,
  ReportsPage,
  BarcodeLabelsPage,
  UsersPage,
  SettingsPage,
  NotFoundPage,
} from '@/pages/ModulePages';
import { UpgradePage } from '@/features/licensing/UpgradePage';

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/pos" element={<PosPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/barcode-labels" element={<BarcodeLabelsPage />} />
      <Route path="/purchases" element={<PurchasesPage />} />
      <Route path="/suppliers" element={<SuppliersPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/returns" element={<ReturnsPage />} />
      <Route path="/cash" element={<CashPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/billing" element={<UpgradePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
