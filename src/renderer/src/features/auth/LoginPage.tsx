import { useState } from 'react';
import { useAuthStore } from '@renderer/stores/authStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Crown, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@shared/constants/app';

export function LoginPage(): React.JSX.Element {
  const { login, isLoading, error } = useAuthStore();
  const { settings } = useSettingsStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const storeName = settings['store.name'] || APP_NAME;
  const storeLogo = settings['store.logo'];

  const handleSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    await login({ username, password });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background glow decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          {storeLogo ? (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/95 p-1 mb-3 shadow-xl ring-4 ring-amber-500/20 overflow-hidden">
              <img src={storeLogo} alt={storeName} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-slate-950 mb-3 shadow-xl ring-4 ring-amber-500/20">
              <Crown className="w-9 h-9 fill-slate-950 stroke-[1.75]" />
            </div>
          )}
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">{storeName}</h1>
          <p className="text-xs font-semibold text-amber-400/90 mt-0.5 tracking-wider uppercase">
            Retail POS & Inventory System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Username / Operator ID
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                autoFocus
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                placeholder="e.g. admin or cashier01"
                className="pl-10 h-11 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Access Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full min-h-12 text-sm font-bold mt-2 shadow-md"
            disabled={isLoading || !username.trim() || !password}
          >
            {isLoading ? 'Authenticating Operator...' : 'Sign In to Counter'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure,stable and reliable</span>
          </div>
          <span>
            &copy; Kings Mart{' '}
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
