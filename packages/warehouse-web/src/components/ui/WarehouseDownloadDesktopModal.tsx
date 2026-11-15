import React from 'react';
import { Monitor, Download, HardDrive, Cpu, X, Warehouse } from 'lucide-react';
import { Button } from './Button';

interface WarehouseDownloadDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
  version?: string;
}

export function WarehouseDownloadDesktopModal({
  isOpen,
  onClose,
  appName = 'WarehouseOS Enterprise Desktop',
  version = 'v1.0.0',
}: WarehouseDownloadDesktopModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const handleDownload = (): void => {
    const filename = `${appName.replace(/\s+/g, '_')}_Setup_${version}.exe`;
    const blob = new Blob(
      [
        `Zenthropic Technologies — ${appName} installer placeholder.\n` +
          `Version: ${version}\n` +
          `Offline-first WMS Desktop with warehouse.db SQLite engine.\n` +
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
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <Warehouse className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{appName}</h2>
              <p className="text-xs text-cyan-400 font-mono">Dedicated Distribution Center Desktop Engine · {version}</p>
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
            Run your distribution hub with zero internet dependency. Instant barcode terminal scanning, wireless forklift tablet integration, and automated stock movements to local <code>warehouse.db</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <HardDrive className="h-4 w-4" />
                <span>Isolated warehouse.db</span>
              </div>
              <p className="text-[11px] text-slate-400">
                100% independent database. Never collides with retail MartPOS tables.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Cpu className="h-4 w-4" />
                <span>Barcode Gun & Tablet Ready</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Optimized for handheld Bluetooth/USB 2D barcode scanners and touchscreen tablets.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span>Operating System:</span>
              <strong className="text-white">Windows 10 / 11 (64-bit)</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Architecture:</span>
              <strong className="text-white">Electron + SQLite WAL engine</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-mono">Free cloud sync to Central Hub included</span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="h-4 w-4" />}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-0 flex-1 sm:flex-none shadow-lg shadow-cyan-500/20"
            >
              Download WarehouseOS (.exe)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
