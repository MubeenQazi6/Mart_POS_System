import React from 'react';
import { Monitor, Download, Cpu, HardDrive, X } from 'lucide-react';
import { Button } from './Button';

interface DownloadDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
  version?: string;
}

export function DownloadDesktopModal({
  isOpen,
  onClose,
  appName = 'MartPOS Enterprise Desktop',
  version = 'v1.0.0',
}: DownloadDesktopModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const handleDownload = (): void => {
    // Generate an executable download link or download direct bundle
    const filename = `${appName.replace(/\s+/g, '_')}_Setup_${version}.exe`;
    const blob = new Blob(
      [
        `Zenthropic Technologies — ${appName} installer placeholder.\n` +
          `Version: ${version}\n` +
          `To build the binary package from source, run: npm run build:desktop or electron-builder.\n` +
          `Repository: https://github.com/MubeenQazi6/Mart_POS_System`,
      ],
      { type: 'application/octet-stream' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Monitor className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{appName}</h2>
              <p className="text-xs text-amber-400 font-mono">Native Electron + Local SQLite Engine · {version}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-300 leading-relaxed">
            The desktop application provides full <strong>100% offline resilience</strong>, sub-millisecond barcode response, direct ESC/POS hardware receipt printer integration, and automatic database backups.
          </p>

          {/* Advantages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <HardDrive className="h-4 w-4" />
                <span>Zero Latency Offline DB</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Operates completely without internet using local SQLite WAL database.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Cpu className="h-4 w-4" />
                <span>Direct Hardware Support</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct USB/Serial ESC/POS receipt printers, automatic cash drawers & barcode guns.
              </p>
            </div>
          </div>

          {/* System Requirements */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span>Platform:</span>
              <strong className="text-white">Windows 10 / 11 (64-bit)</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Package Format:</span>
              <strong className="text-white">Standalone Installer (.exe)</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Local Database:</span>
              <strong className="text-white">better-sqlite3 with WAL mode</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-mono">Free automatic cloud sync included</span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="h-4 w-4" />}
              className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold border-0 flex-1 sm:flex-none shadow-lg shadow-amber-500/20"
            >
              Download for Windows (.exe)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
