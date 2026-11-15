import React, { useState } from 'react';
import {
  Crown,
  ShoppingCart,
  Boxes,
  BarChart3,
  Monitor,
  ShieldCheck,
  Download,
  ArrowRight,
  Database,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DownloadDesktopModal } from '@/components/ui/DownloadDesktopModal';

interface MartPosProductShowcaseProps {
  onProceedToLogin: () => void;
}

export function MartPosProductShowcase({ onProceedToLogin }: MartPosProductShowcaseProps): React.JSX.Element {
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px]" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
              <Crown className="h-6 w-6 fill-slate-950 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white uppercase">MartPOS</span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Enterprise
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
              leftIcon={<Download className="h-4 w-4 text-amber-400" />}
              className="text-xs bg-slate-900 border-slate-800 hover:bg-slate-800 hidden sm:inline-flex"
            >
              Download Desktop (.exe)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onProceedToLogin}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold border-0 shadow-lg shadow-amber-500/20"
            >
              Sign In to Web Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 relative z-10 w-full space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-amber-400">MartPOS Product Showcase</span>
            <span className="text-slate-600">•</span>
            <span>Enterprise Retail Operating System</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            The Complete Retail POS & <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
              Cloud Inventory Engine
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Built for modern supermarkets, department stores, and retail marts. Zero floating-point math, 100% deterministic ledger accounting, sub-millisecond barcode checkout, and multi-branch cloud telemetry.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={onProceedToLogin}
              rightIcon={<ArrowRight className="h-5 w-5" />}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-base px-8 shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-transform"
            >
              Launch Live Web Portal
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDownloadModal(true)}
              leftIcon={<Monitor className="h-5 w-5 text-amber-400" />}
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
            <p className="text-xl font-black text-white mt-1">Engineered For High-Volume Supermarkets</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Fast POS */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Lightning Cashier POS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rapid barcode scanning, instant keyboard shortcuts, multi-cart holding bills, and split tenders (Cash, Card, Digital Wallet).
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-amber-400 font-mono flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span>Zero Latency Processing</span>
              </div>
            </div>

            {/* 2. Inventory & Stock Movements */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Traceable Inventory Ledger</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Double-entry stock movements, supplier purchase orders, low stock warnings, batch lot tracking, and automated stock adjustments.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-cyan-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Zero Untraceable Losses</span>
              </div>
            </div>

            {/* 3. Financial Intelligence */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Financial & Tax Reports</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Profit margin calculations, customer credit (udhar) ledgers, supplier settlements, and exportable CSV/PDF Z-Reports.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                <span>Integer Minor Money Safety</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop vs Web Dual Ecosystem */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                Flexible Deployment
              </span>
              <h3 className="text-2xl font-black text-white mt-1">Available on Both Desktop & Cloud Web</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Use the high-speed Native Desktop App on checkout counters with direct printer integration, or manage your mart remotely from anywhere via the Web Portal.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDownloadModal(true)}
                leftIcon={<Monitor className="h-4 w-4 text-amber-400" />}
                className="bg-slate-950 border-slate-700 text-white"
              >
                Get Desktop App
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onProceedToLogin}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border-0"
              >
                Sign In to Web
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 Zenthropic Technologies (Pvt) Ltd. All Rights Reserved. MartPOS Enterprise Suite.</p>
      </footer>

      {/* Download Modal */}
      <DownloadDesktopModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        appName="MartPOS Enterprise Desktop"
        version="v1.0.0"
      />
    </div>
  );
}
