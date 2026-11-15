import React, { useState } from 'react';
import {
  Warehouse,
  Truck,
  Layers,
  ArrowRight,
  Download,
  Monitor,
  ShieldCheck,
  MapPin,
  Sparkles,
  CheckCircle2,
  FileInput,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WarehouseDownloadDesktopModal } from '@/components/ui/WarehouseDownloadDesktopModal';

interface WarehouseProductShowcaseProps {
  onProceedToLogin: () => void;
}

export function WarehouseProductShowcase({ onProceedToLogin }: WarehouseProductShowcaseProps): React.JSX.Element {
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Warehouse className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">WarehouseOS</span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Enterprise WMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">By Zenthropic Technologies</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDownloadModal(true)}
              leftIcon={<Download className="h-4 w-4 text-cyan-400" />}
              className="text-xs bg-slate-900 border-slate-800 hover:bg-slate-800 hidden sm:inline-flex"
            >
              Download Desktop (.exe)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onProceedToLogin}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-0 shadow-lg shadow-cyan-500/20"
            >
              Sign In to Hub
            </Button>
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 relative z-10 w-full space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-cyan-400">WarehouseOS Showcase</span>
            <span className="text-slate-600">•</span>
            <span>Central Logistics & Distribution Center Hub</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Distribution Logistics, Rack Telemetry & <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              Branch Replenishment (STO)
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Manage multi-aisle warehouse racking, inbound supplier freight inspection, First-Expired-First-Out (FEFO) batch lots, and high-velocity dispatches to retail branches.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={onProceedToLogin}
              rightIcon={<ArrowRight className="h-5 w-5" />}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base px-8 shadow-xl shadow-cyan-500/20 hover:scale-[1.02] transition-transform border-0"
            >
              Launch Live Warehouse Hub
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDownloadModal(true)}
              leftIcon={<Monitor className="h-5 w-5 text-cyan-400" />}
              className="w-full sm:w-auto bg-slate-900 border-slate-800 hover:bg-slate-800 text-white font-bold text-base px-6"
            >
              Download Desktop App (.exe)
            </Button>
          </div>
        </div>

        {/* Feature Grid / Capabilities Uses Panel */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Core Capabilities & Uses</h2>
            <p className="text-xl font-black text-white mt-1">Enterprise Supply Chain & Logistics Control</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Inbound GRN */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <FileInput className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Inbound Freight & Put-Away</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Record Goods Received Notes (GRN), verify supplier Purchase Orders, execute Quality Control approvals, and auto-allocate storage bins.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-cyan-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Automated PO Matching</span>
              </div>
            </div>

            {/* 2. Bin Coordinates */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3D Bin & Rack Telemetry</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Physical coordinate digital twin (Aisle, Rack, Shelf). Real-time pallet structural weight load meters and put-away optimization.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-blue-400 font-mono flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>Zone Load Thresholds</span>
              </div>
            </div>

            {/* 3. Outbound STO */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-violet-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Retail Store Replenishment</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pick, pack and dispatch bulk stock to MartPOS branches. Generate driver manifests, track transit vehicles, and receive confirmation stamps.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-violet-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Automated Gate-Pass Tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop vs Web Dual Ecosystem */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Dedicated WMS Architecture
              </span>
              <h3 className="text-2xl font-black text-white mt-1">Multi-Tenant Cloud + Offline Desktop Hub</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Run the dedicated Desktop app on industrial tablets in warehouse aisles with local <code>warehouse.db</code>, or access live operational metrics from any web browser.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDownloadModal(true)}
                leftIcon={<Monitor className="h-4 w-4 text-cyan-400" />}
                className="bg-slate-950 border-slate-700 text-white"
              >
                Get Desktop Edition
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onProceedToLogin}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border-0"
              >
                Sign In to Hub
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 Zenthropic Technologies (Pvt) Ltd. All Rights Reserved. WarehouseOS Enterprise Suite.</p>
      </footer>

      {/* Download Modal */}
      <WarehouseDownloadDesktopModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        appName="WarehouseOS Enterprise Desktop"
        version="v1.0.0"
      />
    </div>
  );
}
