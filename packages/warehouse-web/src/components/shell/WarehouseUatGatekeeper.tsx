import React, { useState } from 'react';
import { Warehouse, ShieldCheck, Lock, AlertTriangle, Key } from 'lucide-react';
import {
  WAREHOUSE_ENV_CONFIG,
  isWarehouseUatAccessUnlocked,
  unlockWarehouseUatAccess,
} from '@/config/env';

interface WarehouseUatGatekeeperProps {
  children: React.ReactNode;
}

export const WarehouseUatGatekeeper: React.FC<WarehouseUatGatekeeperProps> = ({ children }) => {
  // If not UAT, render without gatekeeper
  if (!WAREHOUSE_ENV_CONFIG.isUat) {
    return <>{children}</>;
  }

  const [isUnlocked, setIsUnlocked] = useState<boolean>(isWarehouseUatAccessUnlocked());
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMsg('Please enter the WarehouseOS UAT Access PIN');
      return;
    }

    const success = unlockWarehouseUatAccess(pinInput.trim());
    if (success) {
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid WarehouseOS UAT PIN. Authorized logistics personnel only.');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Logistics Sandbox
              </span>
              <h2 className="text-xl font-bold text-white mt-1">WarehouseOS UAT</h2>
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-6">
            This staging environment is isolated for GRN verification, bin allocation testing, and stock transfer dry-runs. Enter the UAT authorization PIN to proceed.
          </p>

          <form onSubmit={handleAuthorize} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Logistics Team PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter Warehouse UAT PIN..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
                  autoFocus
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Access Warehouse Staging
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
            Zenthropic Supply Chain & Logistics Network
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-cyan-500 text-slate-950 text-xs font-bold py-1 px-4 flex items-center justify-between shadow-md relative z-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>WAREHOUSE-OS UAT ENVIRONMENT ({WAREHOUSE_ENV_CONFIG.appVersion}) — ISOLATED TESTING DATA</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded uppercase tracking-wider">
            DB: WAREHOUSE_UAT_ISOLATED
          </span>
        </div>
      </div>
      {children}
    </>
  );
};
