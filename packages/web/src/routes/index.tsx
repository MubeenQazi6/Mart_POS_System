import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from '@renderer/pages/DashboardPage';
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
  AuditLogsPage,
  SettingsPage,
  NotificationsPage,
  NotFoundPage,
} from '@renderer/pages/ModulePages';
import { ProtectedRoute } from '@renderer/components/shell/ProtectedRoute';

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute moduleId="dashboard"><DashboardPage /></ProtectedRoute>} />

      {/* Cashier + Manager + Admin */}
      <Route path="/pos" element={<ProtectedRoute moduleId="pos"><PosPage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute moduleId="products"><ProductsPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute moduleId="inventory"><InventoryPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute moduleId="customers"><CustomersPage /></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute moduleId="returns"><ReturnsPage /></ProtectedRoute>} />

      {/* Manager + Admin only */}
      <Route path="/purchases" element={<ProtectedRoute moduleId="purchases"><PurchasesPage /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute moduleId="suppliers"><SuppliersPage /></ProtectedRoute>} />
      <Route path="/barcode-labels" element={<ProtectedRoute moduleId="barcode-labels"><BarcodeLabelsPage /></ProtectedRoute>} />

      {/* Finance + Manager + Admin */}
      <Route path="/expenses" element={<ProtectedRoute moduleId="expenses"><ExpensesPage /></ProtectedRoute>} />
      <Route path="/cash" element={<ProtectedRoute moduleId="cash"><CashPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute moduleId="reports"><ReportsPage /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/users" element={<ProtectedRoute moduleId="users"><UsersPage /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute moduleId="audit-logs"><AuditLogsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute moduleId="settings"><SettingsPage /></ProtectedRoute>} />

      {/* Notifications */}
      <Route path="/notifications" element={<ProtectedRoute moduleId="notifications"><NotificationsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

