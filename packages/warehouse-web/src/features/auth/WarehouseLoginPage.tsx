import React, { useState } from 'react';
import { Warehouse, LogIn, UserPlus, ShieldAlert, CheckCircle2, Truck, Box, KeyRound } from 'lucide-react';
import { useWarehouseAuthStore } from '@/stores/warehouseAuthStore';
import type { WarehouseUser } from '@/stores/warehouseAuthStore';
import { WAREHOUSE_ENV_CONFIG } from '@/config/env';

interface WarehouseLoginPageProps {
  onBack?: () => void;
}

export const WarehouseLoginPage: React.FC<WarehouseLoginPageProps> = ({ onBack }) => {
  const { login, register, isLoading, error } = useWarehouseAuthStore();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<WarehouseUser['role']>('inbound_supervisor');
  const [localMsg, setLocalMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMsg(null);

    if (!emailOrUser.trim()) {
      setLocalMsg({ type: 'error', text: 'Please enter your username or work email.' });
      return;
    }

    if (isRegisterMode) {
      if (!fullName.trim() || !password.trim()) {
        setLocalMsg({ type: 'error', text: 'Full Name and Password are required for account registration.' });
        return;
      }
      const res = await register(emailOrUser.trim(), password, fullName.trim(), role);
      if (!res.success) {
        setLocalMsg({ type: 'error', text: res.error || 'Registration failed.' });
      }
    } else {
      const res = await login(emailOrUser.trim(), password);
      if (!res.success) {
        setLocalMsg({ type: 'error', text: res.error || 'Invalid credentials.' });
      }
    }
  };

  const handleQuickDemo = async (roleName: 'supervisor' | 'director') => {
    setLocalMsg(null);
    if (roleName === 'director') {
      await login('admin@warehouse.zenthropic.com');
    } else {
      await login('wh.supervisor@warehouse.zenthropic.com');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-xl shadow-cyan-500/10">
          <Warehouse className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">WarehouseOS</h1>
        <p className="text-sm text-cyan-400/80 font-medium mt-1">
          Enterprise Supply Chain & Multi-Branch Distribution Hub
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            {WAREHOUSE_ENV_CONFIG.env.toUpperCase()} ENVIRONMENT
          </span>
          <span className="text-[11px] text-slate-500">·</span>
          <span className="text-[11px] text-slate-400">v{WAREHOUSE_ENV_CONFIG.appVersion}</span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
          >
            ← Back to Product Overview
          </button>
        )}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setLocalMsg(null);
            }}
            className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              !isRegisterMode
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setLocalMsg(null);
            }}
            className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              isRegisterMode
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Register Personnel
          </button>
        </div>

        {(localMsg || error) && (
          <div
            className={`flex items-start gap-3 p-3.5 rounded-xl mb-6 text-xs ${
              localMsg?.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border border-red-500/30 text-red-300'
            }`}
          >
            {localMsg?.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            )}
            <span>{localMsg?.text || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Tariq Mehmood"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Work Email / Username
            </label>
            <input
              type="text"
              value={emailOrUser}
              onChange={(e) => setEmailOrUser(e.target.value)}
              placeholder="e.g. wh.supervisor@warehouse.zenthropic.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password {isRegisterMode ? '' : '(Optional for local demo)'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
            />
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Designated Logistics Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as WarehouseUser['role'])}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="inbound_supervisor">Inbound GRN Supervisor</option>
                <option value="warehouse_director">Warehouse Operations Director</option>
                <option value="picker_packer">Picker & Packer</option>
                <option value="dispatch_officer">Dispatch & Fleet Officer</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRegisterMode ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Registering...' : 'Register Warehouse Personnel'}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Signing In...' : 'Sign In to Hub'}</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-xs text-slate-400 text-center mb-3">Quick Demo Access (One-Click):</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('supervisor')}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>Supervisor</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('director')}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Director</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
          <span>Zero Cross-Product Database Bleed · Encrypted Storage</span>
        </div>
      </div>
    </div>
  );
};
