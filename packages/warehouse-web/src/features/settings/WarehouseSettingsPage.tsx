import React, { useState } from 'react';
import { Sliders, Building2, Database, ShieldCheck, Save } from 'lucide-react';

export function WarehouseSettingsPage(): React.JSX.Element {
  const [hubName, setHubName] = useState('WarehouseOS — Central Distribution Hub #01');
  const [hubAddress, setHubAddress] = useState('Plot 44-B, Sundar Industrial Estate, Lahore');
  const [managerEmail, setManagerEmail] = useState('warehouse.ops@zenthropic.com');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent): void => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Sliders className="h-5 w-5 text-cyan-400" />
          <span>Warehouse Hub Configuration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Hub parameters, storage zones & dedicated database isolation settings.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-5">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Hub / Facility Name</label>
            <input
              type="text"
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Physical Facility Address</label>
            <input
              type="text"
              value={hubAddress}
              onChange={(e) => setHubAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Operations Alert Email</label>
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Database isolation badge */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Database className="h-4 w-4" />
            <span>Dedicated Isolated Database Architecture</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            WarehouseOS maintains an independent database (<code className="text-cyan-300">warehouse.db</code> for desktop, dedicated warehouse cloud namespace). Zero cross-talk or schema collision with MartPOS retail tables.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between">
          {isSaved ? (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>Hub configurations updated successfully!</span>
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <Save className="h-4 w-4" />
            <span>Save Hub Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
