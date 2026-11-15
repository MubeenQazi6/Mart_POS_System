import React from 'react';
import { HashRouter } from 'react-router-dom';
import { WarehouseLayout } from './components/layout/WarehouseLayout';
import { WarehouseRoutes } from './routes';

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <WarehouseLayout>
        <WarehouseRoutes />
      </WarehouseLayout>
    </HashRouter>
  );
}
