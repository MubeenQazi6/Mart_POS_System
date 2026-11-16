import React, { useState } from 'react';
import { useLicensingStore } from '@renderer/stores/licensingStore';
import { ShieldAlert, Key, Copy, Check, Upload, Lock } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { showToast } from '@renderer/components/ui/Toast';
import { APP_NAME } from '@shared/constants/app';

export function LicenseLockScreen(): React.JSX.Element {
  const { machineCode, activate, isActivating } = useLicensingStore();
  const [licenseInput, setLicenseInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(machineCode);
      setCopied(true);
      showToast('info', 'Machine code copied to clipboard');
      setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      showToast('error', 'Failed to copy machine code');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setLicenseInput(text);
        showToast('info', `Loaded license file: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleActivateSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!licenseInput.trim()) {
      showToast('error', 'Please provide a valid license key or load a license JSON file');
      return;
    }

    await activate(licenseInput.trim());
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100 p-4 select-none">
      <div className="w-full max-w-xl rounded-2xl border border-rose-900/50 bg-slate-900 p-8 shadow-2xl space-y-6">
        {/* Header with Warning */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg ring-4 ring-rose-500/20">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-950 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-800 uppercase tracking-wide">
                Trial Expired / Unlicensed
              </span>
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight mt-1">
              {APP_NAME} — Activation Required
            </h1>
            <p className="text-xs text-slate-400">
              Your 3-day free trial has expired. Activate software to unlock permanent access.
            </p>
          </div>
        </div>

        {/* Machine Code Box */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">Step 1: Your Computer Machine Code</span>
            <button
              type="button"
              onClick={() => { void handleCopyCode(); }}
              className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-200"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <div className="rounded-lg border border-amber-900/60 bg-slate-950 px-3.5 py-2 font-mono text-sm font-bold text-amber-300 tracking-widest text-center">
            {machineCode || 'DETECTING-HARDWARE...'}
          </div>
          <p className="text-[11px] text-slate-400">
            Send this machine code to the software vendor to receive your genuine license JSON file.
          </p>
        </div>

        {/* Activation Form */}
        <form onSubmit={(e) => { void handleActivateSubmit(e); }} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="license-json-input" className="text-xs font-bold text-slate-300">
                Step 2: Enter or Import License JSON
              </label>
              <label className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload .json file</span>
                <input
                  type="file"
                  accept=".json,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              id="license-json-input"
              rows={4}
              value={licenseInput}
              onChange={(e) => { setLicenseInput(e.target.value); }}
              placeholder='Paste your signed license JSON here, e.g. { "payload": { ... }, "signature": "..." }'
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Offline Ed25519 Cryptographic Verification</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isActivating}
              disabled={isActivating || !licenseInput.trim()}
              leftIcon={<Key className="h-4 w-4" />}
            >
              Verify &amp; Activate System
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
