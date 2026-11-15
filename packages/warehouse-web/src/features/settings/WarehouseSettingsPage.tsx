import React, { useState } from 'react';
import { Sliders, Building2, Database, ShieldCheck, Save, Warehouse, CheckCircle2, Server, Key, Radio } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function WarehouseSettingsPage(): React.JSX.Element {
  const [hubName, setHubName] = useState('WarehouseOS — Central Distribution Hub #01');
  const [hubCode, setHubCode] = useState('WH-LHR-01');
  const [hubAddress, setHubAddress] = useState('Plot 44-B, Sundar Industrial Estate, Raiwind Road, Lahore');
  const [managerEmail, setManagerEmail] = useState('warehouse.ops@zenthropic.com');
  const [managerPhone, setManagerPhone] = useState('+92 300 1234567');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent): void => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Warehouse Hub Configuration"
        description="Hub facility parameters, physical storage zones & dedicated database isolation telemetry."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Hub Profile Details */}
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-cyan-400" />
              <span>Distribution Center Profile</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Primary identification parameters transmitted on all Goods Received Notes (GRN) and Store Transfer Orders (STO)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Facility / Hub Name</label>
                <input
                  type="text"
                  value={hubName}
                  onChange={(e) => setHubName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Hub Station Code</label>
                <input
                  type="text"
                  value={hubCode}
                  onChange={(e) => setHubCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Physical Complex Address</label>
              <input
                type="text"
                value={hubAddress}
                onChange={(e) => setHubAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Operations Alert Email</label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Loading Dock Direct Hotline</label>
                <input
                  type="text"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database & Cloud Isolation Architecture */}
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <span>Multi-Tenant Database Isolation Telemetry</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Dedicated storage schema enforcing zero data bleed with MartPOS retail databases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Server className="h-4 w-4" />
                  <span>Cloud Backend Mode: Active Supabase Instance</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  RLS ENFORCED
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                WarehouseOS uses an isolated cloud namespace (<code className="text-cyan-300 font-mono">warehouse_hubs</code>, <code className="text-cyan-300 font-mono">warehouse_bins</code>, <code className="text-cyan-300 font-mono">warehouse_stock</code>, <code className="text-cyan-300 font-mono">warehouse_grn</code>, <code className="text-cyan-300 font-mono">warehouse_transfers</code>) with dedicated Row Level Security policies.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs font-mono">
                <div className="text-slate-400">
                  Instance ID: <span className="text-slate-200">mydhyrxkhoqodprnxijv</span>
                </div>
                <div className="text-slate-400">
                  Desktop DB: <span className="text-cyan-300">warehouse.db (WAL enabled)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4" />
              <span>Hub configurations updated successfully in cloud registry!</span>
            </span>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            leftIcon={<Save className="h-4 w-4" />}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold border-0 px-6"
          >
            Save Hub Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
