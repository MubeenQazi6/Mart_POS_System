import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { WarehouseLayout } from './components/layout/WarehouseLayout';
import { WarehouseRoutes } from './routes';
import { WarehouseUatGatekeeper } from './components/shell/WarehouseUatGatekeeper';
import { WarehouseLoginPage } from './features/auth/WarehouseLoginPage';
import { WarehouseProductShowcase } from './features/landing/WarehouseProductShowcase';
import { useWarehouseAuthStore } from './stores/warehouseAuthStore';
import { Loader2 } from 'lucide-react';

export default function App(): React.JSX.Element {
  const { isAuthenticated, isLoading, initAuth } = useWarehouseAuthStore();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return (
    <WarehouseUatGatekeeper>
      {isLoading ? (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-sm font-medium text-slate-400">Loading WarehouseOS Core Engine...</span>
        </div>
      ) : !isAuthenticated ? (
        showLogin ? (
          <WarehouseLoginPage onBack={() => setShowLogin(false)} />
        ) : (
          <WarehouseProductShowcase onProceedToLogin={() => setShowLogin(true)} />
        )
      ) : (
        <HashRouter>
          <WarehouseLayout>
            <WarehouseRoutes />
          </WarehouseLayout>
        </HashRouter>
      )}
    </WarehouseUatGatekeeper>
  );
}
