import { useEffect, useState } from 'react';
import { useLicensingStore } from '@renderer/stores/licensingStore';
import { ShieldCheck, Key, Copy, Check, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { showToast } from '@renderer/components/ui/Toast';

export function ActivationModal(): React.JSX.Element | null {
  const { isActivationModalOpen, closeActivationModal, machineCode, activate, isActivating } =
    useLicensingStore();
  const [licenseInput, setLicenseInput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isActivationModalOpen) {
      setLicenseInput('');
      setCopied(false);
    }
  }, [isActivationModalOpen]);

  if (!isActivationModalOpen) return null;

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
      showToast('error', 'Please paste your license key or load a license file');
      return;
    }

    await activate(licenseInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Software License Activation
              </h2>
              <p className="text-xs text-slate-500">
                Bind MARTPOS to this authorized computer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeActivationModal}
            disabled={isActivating}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            &times;
          </button>
        </div>

        <form onSubmit={(e) => { void handleActivateSubmit(e); }} className="space-y-4 pt-4">
          {/* Machine Code Box */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Step 1: Share Your Machine Code with the Vendor</span>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mb-2">
              Each installation is cryptographically bound to hardware. Provide this code to receive your signed license:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={machineCode}
                className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 tracking-wider dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { void handleCopyCode(); }}
                className="shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* License File / Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-brand-600" />
                <span>Step 2: Enter Signed License Key or File</span>
              </label>
              <label className="cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span>Import .JSON File</span>
                <input
                  type="file"
                  accept=".json,.txt,.lic"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={4}
              value={licenseInput}
              onChange={(e) => { setLicenseInput(e.target.value); }}
              placeholder="Paste the JSON license file content or signed key string provided by your seller..."
              className="w-full rounded-xl border border-surface-border bg-slate-50 p-3 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeActivationModal}
              disabled={isActivating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isActivating || !licenseInput.trim()}
            >
              {isActivating ? 'Verifying...' : 'Activate System'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
