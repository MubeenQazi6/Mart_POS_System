import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { useLicensingStore } from '@renderer/stores/licensingStore';
import { useBackupStore } from '@renderer/stores/backupStore';
import { useAuthStore } from '@renderer/stores/authStore';
import { useThemeStore } from '@renderer/stores/themeStore';
import { THEME_ACCENTS } from '@renderer/styles/theme';
import type { ThemeAccent, ThemeMode } from '@shared/types/settings';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import {
  Palette,
  Store,
  ShoppingCart,
  Boxes,
  RotateCcw,
  Shield,
  Printer,
  Key,
  Save,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Database,
  Info,
  Bell,
  HardDrive,
  Download,
  Upload,
  AlertTriangle,
  Crown,
  Globe,
  Phone,
  Layers,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { showToast } from '@renderer/components/ui/Toast';

type SettingsTab =
  | 'appearance'
  | 'store'
  | 'pos'
  | 'inventory'
  | 'returns'
  | 'security'
  | 'printing'
  | 'notifications'
  | 'backup'
  | 'licensing'
  | 'about';

export function SettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const {
    settings,
    isLoading,
    isSaving,
    loadSettings,
    updateSetting,
    saveSettings,
    resetToDefaults,
  } = useSettingsStore();
  const { accent, mode, setAccent, setMode } = useThemeStore();
  const {
    status: licenseStatus,
    machineCode,
    loadStatus,
    openActivationModal,
    deactivate,
  } = useLicensingStore();
  const {
    backups,
    stats,
    isCreating,
    isRestoring,
    validationResult,
    isConfirmRestoreOpen,
    loadBackupsAndStats,
    createBackup,
    selectAndValidateFile,
    restoreSelectedBackup,
    closeRestoreConfirm,
    downloadDb,
    isDownloading,
  } = useBackupStore();

  const { currentUser } = useAuthStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [backupNotes, setBackupNotes] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [pendingAccent, setPendingAccent] = useState<ThemeAccent>(accent);
  const [pendingMode, setPendingMode] = useState<ThemeMode>(mode);
  const [printersList, setPrintersList] = useState<import('@shared/types/hardware').PrinterDeviceInfo[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [appInfo, setAppInfo] = useState<import('@shared/types/app').AppInfo | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'store_manager' || isAdmin;

  const loadPrinters = async (): Promise<void> => {
    if (!window.martpos) return;
    setIsLoadingPrinters(true);
    try {
      const res = await window.martpos.hardware.getPrinters();
      if (res.success && res.data) {
        setPrintersList(res.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  useEffect(() => {
    void loadSettings();
    void loadStatus();
    void loadBackupsAndStats();
    void loadPrinters();
    void window.martpos?.app.getInfo().then((info) => {
      if (info) setAppInfo(info);
    });
  }, [loadSettings, loadStatus, loadBackupsAndStats]);

  // Synchronize pending theme state with settings when loaded
  useEffect(() => {
    if (settings['theme.accent']) {
      setPendingAccent(settings['theme.accent']);
    } else {
      setPendingAccent(accent);
    }
    if (settings['theme.mode']) {
      setPendingMode(settings['theme.mode']);
    } else {
      setPendingMode(mode);
    }
  }, [settings, accent, mode]);

  const handleCopyMachineCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(machineCode);
      setCopiedCode(true);
      showToast('info', 'Machine code copied to clipboard');
      setTimeout(() => {
        setCopiedCode(false);
      }, 2000);
    } catch {
      showToast('error', 'Failed to copy machine code');
    }
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isSaving) return;
    updateSetting('theme.accent', pendingAccent);
    updateSetting('theme.mode', pendingMode);
    const success = await saveSettings();
    if (success) {
      await setAccent(pendingAccent);
      await setMode(pendingMode);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Logo image file must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSetting('store.logo', reader.result);
        showToast('info', 'Store logo updated. Click "Save Settings" to persist.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (): void => {
    updateSetting('store.logo', '');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    showToast('info', 'Store logo removed. Click "Save Settings" to persist.');
  };

  const handleCreateBackup = async (): Promise<void> => {
    await createBackup(backupNotes || undefined);
    setBackupNotes('');
  };

  const handleDownloadDb = async (): Promise<void> => {
    await downloadDb();
  };

  // Download specific backup file
  // Download specific backup file - Fixed with proper API
  const downloadBackupFile = async (backupId: number): Promise<void> => {
    try {
      // Fix 1: Convert backupId to string for comparison with b.id
      const backup = backups.find((b) => String(b.id) === String(backupId));
      if (!backup) {
        showToast('error', 'Backup not found');
        return;
      }

      // Fix 2 & 3: Check window.martpos exists and use backup API
      if (!window.martpos) {
        showToast('error', 'MartPOS API not available');
        return;
      }

      // Use window.martpos.backup (not db) and create fresh backup then download
      showToast('info', 'Creating fresh backup for download...');

      // First create a fresh backup
      const createRes = await window.martpos.backup.create('Download requested');
      if (!createRes?.success || !createRes.data) {
        showToast('error', 'Failed to create backup');
        return;
      }

      // Then download the database using the backup API
      const response = await window.martpos.backup.downloadDb();
      if (response?.success && response.data) {
        // Create download link
        const blob = new Blob([response.data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
          createRes.data.filename ||
          `martpos_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('success', `Downloaded: ${a.download}`);
        await loadBackupsAndStats();
      } else {
        showToast('error', 'Failed to download backup');
      }
    } catch (error) {
      console.error('Download backup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download backup';
      showToast('error', errorMessage);
    }
  };

  const handleTestPrint = async (): Promise<void> => {
    if (!window.martpos) return;
    setIsTestingPrint(true);
    try {
      const res = await window.martpos.hardware.testPrint({
        printerName: settings['printing.receipt_printer_name'] || undefined,
        copies: settings['printing.print_copies'] || 1,
      });
      if (res.success && res.data) {
        showToast('success', res.data.message);
      } else {
        showToast('error', !res.success ? res.error : 'Failed to send test print');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Hardware test print failed');
    } finally {
      setIsTestingPrint(false);
    }
  };

  const handlePulseDrawer = async (): Promise<void> => {
    if (!window.martpos) return;
    try {
      const res = await window.martpos.hardware.openDrawer(settings['printing.receipt_printer_name'] || undefined);
      if (res.success && res.data) {
        showToast('success', res.data.message);
      } else {
        showToast('error', !res.success ? res.error : 'Failed to pulse cash drawer');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Drawer pulse error');
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading Kings Mart settings..." />;
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Store; adminOnly?: boolean }> = [
    { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
    { id: 'store', label: 'Store Profile', icon: Store },
    { id: 'pos', label: 'POS & Billing', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory Defaults', icon: Boxes },
    { id: 'returns', label: 'Returns & Policy', icon: RotateCcw },
    { id: 'printing', label: 'Hardware & Printers', icon: Printer },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Shield, adminOnly: true },
    { id: 'backup', label: 'Backup & Restore', icon: Database, adminOnly: true },
    { id: 'licensing', label: 'Software License', icon: Key },
    { id: 'about', label: 'About Kings Mart', icon: Info },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isManager);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Operational Settings"
          description="Configure your color theme, store profile, POS checkout options, thermal receipt printers, backup snapshots, and software license."
        />
        {isManager && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (window.confirm('Reset all application settings to factory defaults?')) {
                  const success = await resetToDefaults();
                  if (success) {
                    setPendingAccent('emerald');
                    setPendingMode('light');
                    await setAccent('emerald');
                    await setMode('light');
                  }
                }
              }}
              disabled={isSaving}
            >
              <RotateCw className="h-4 w-4" />
              <span>Reset Defaults</span>
            </Button>
            <Button
              type="submit"
              form="settings-form"
              variant="primary"
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Tabs */}
        <div className="lg:col-span-1 space-y-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-surface-border dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3">
          <form
            id="settings-form"
            onSubmit={(e) => {
              void handleSave(e);
            }}
            className="rounded-2xl border border-surface-border bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6"
          >
            {/* 1. Appearance & Theme Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-brand-600" />
                    <span>Application Color Theme & Visual Appearance</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Choose an application accent color and display mode. Selected changes remain in pending state and will be applied when you click <strong>Save Settings</strong>.
                  </p>
                </div>

                {/* Unsaved Appearance Changes Banner */}
                {(pendingAccent !== accent || pendingMode !== mode) && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>You have unsaved theme changes ({pendingAccent} accent, {pendingMode} mode). Click <strong>Save Settings</strong> below to apply.</span>
                  </div>
                )}

                {/* 6 Accent Color Options */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Primary Accent Color (6 Curated Palettes)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(THEME_ACCENTS) as ThemeAccent[]).map((key) => {
                      const themeItem = THEME_ACCENTS[key];
                      const isSelected = pendingAccent === key;
                      const isCurrentApplied = accent === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setPendingAccent(key);
                            updateSetting('theme.accent', key);
                          }}
                          className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/20 shadow-xs'
                              : 'border-surface-border bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2.5">
                            <div
                              className="h-6 w-6 rounded-full shadow-xs flex items-center justify-center text-white"
                              style={{ backgroundColor: themeItem.previewColor }}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                            {isCurrentApplied ? (
                              <Badge variant="brand" className="text-[10px] py-0 px-1.5 font-bold">
                                Active
                              </Badge>
                            ) : isSelected ? (
                              <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-bold">
                                Selected
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono capitalize">
                                {key === 'emerald' ? 'Default' : ''}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {themeItem.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {themeItem.previewColor}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Mode (Light / Dark / System) */}
                <div className="space-y-3 border-t border-surface-border pt-5 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Display Appearance Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: 'light' as ThemeMode,
                        label: 'Light Mode',
                        icon: Sun,
                        desc: 'High contrast crisp daytime display',
                      },
                      {
                        id: 'dark' as ThemeMode,
                        label: 'Dark Mode',
                        icon: Moon,
                        desc: 'Eye-friendly low glare evening display',
                      },
                      {
                        id: 'system' as ThemeMode,
                        label: 'System Default',
                        icon: Monitor,
                        desc: 'Follows your operating system theme',
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = pendingMode === item.id;
                      const isCurrentApplied = mode === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPendingMode(item.id);
                            updateSetting('theme.mode', item.id);
                          }}
                          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/20 shadow-xs'
                              : 'border-surface-border bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <Icon
                              className={`h-4 w-4 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                            />
                            {isCurrentApplied ? (
                              <Badge variant="brand" className="text-[10px] py-0 px-1 font-bold">Active</Badge>
                            ) : isSelected ? (
                              <Badge variant="warning" className="text-[10px] py-0 px-1 font-bold">Selected</Badge>
                            ) : null}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Design System Preview Card */}
                <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Live Design System Component Preview ({pendingAccent} accent)
                  </h4>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button variant="primary" size="sm">
                      Primary Action
                    </Button>
                    <Button variant="secondary" size="sm">
                      Secondary
                    </Button>
                    <Button variant="outline" size="sm">
                      Outline
                    </Button>
                    <Button variant="destructive" size="sm">
                      Destructive
                    </Button>
                    <Badge variant="brand">Theme Badge</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="danger">Error</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Store Profile Tab */}
            {activeTab === 'store' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span>Business & Store Profile</span>
                </h3>

                {/* Store Logo Management Card */}
                <div className="rounded-2xl border border-surface-border bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        <span>Store Logo & Brand Identity</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload your store logo. It will be displayed on the login screen, sidebar, receipts, and exported reports.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    {/* Logo Preview Container */}
                    <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                      {settings['store.logo'] ? (
                        <img
                          src={settings['store.logo']}
                          alt="Store Logo"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Crown className="h-8 w-8 text-amber-500/80" />
                      )}
                    </div>

                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!isManager}
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{settings['store.logo'] ? 'Change Logo' : 'Upload Logo'}</span>
                      </Button>

                      {settings['store.logo'] && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!isManager}
                          onClick={handleRemoveLogo}
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove Logo</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Store / Business Name"
                    value={settings['store.name']}
                    onChange={(e) => {
                      updateSetting('store.name', e.target.value);
                    }}
                    required
                    disabled={!isManager}
                  />
                  <Input
                    label="Tax / NTN / STRN Registration Number"
                    value={settings['store.tax_number']}
                    onChange={(e) => {
                      updateSetting('store.tax_number', e.target.value);
                    }}
                    disabled={!isManager}
                  />
                  <Input
                    label="Official Contact Phone"
                    value={settings['store.phone']}
                    onChange={(e) => {
                      updateSetting('store.phone', e.target.value);
                    }}
                    disabled={!isManager}
                  />
                  <Input
                    label="Official Email Address"
                    type="email"
                    value={settings['store.email']}
                    onChange={(e) => {
                      updateSetting('store.email', e.target.value);
                    }}
                    disabled={!isManager}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Physical Store Address"
                      value={settings['store.address']}
                      onChange={(e) => {
                        updateSetting('store.address', e.target.value);
                      }}
                      disabled={!isManager}
                    />
                  </div>
                  <Input
                    label="Currency Display Symbol"
                    value={settings['store.currency_symbol']}
                    onChange={(e) => {
                      updateSetting('store.currency_symbol', e.target.value);
                    }}
                    disabled={!isManager}
                  />
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Receipt Footer Notice / Policy Terms
                    </label>
                    <textarea
                      rows={2}
                      value={settings['store.receipt_footer']}
                      onChange={(e) => {
                        updateSetting('store.receipt_footer', e.target.value);
                      }}
                      className="w-full rounded-lg border border-surface-border bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      disabled={!isManager}
                    />
                  </div>
                </div>

                {/* Receipt Preview Card */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Live Thermal Receipt Footer Preview
                  </h4>
                  <div className="max-w-xs mx-auto bg-white p-4 font-mono text-center text-[11px] text-slate-800 border border-dashed border-slate-300 shadow-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700">
                    {settings['store.logo'] ? (
                      <div className="flex justify-center mb-2">
                        <img src={settings['store.logo']} alt="Store Logo" className="h-8 max-w-[100px] object-contain" />
                      </div>
                    ) : (
                      <div className="flex justify-center mb-1">
                        <Crown className="h-5 w-5 text-amber-500" />
                      </div>
                    )}
                    <p className="font-bold text-xs uppercase">{settings['store.name'] || 'Kings Mart'}</p>
                    {settings['store.address'] && <p className="text-[10px] text-slate-500">{settings['store.address']}</p>}
                    {settings['store.phone'] && <p className="text-[10px] text-slate-500">Tel: {settings['store.phone']}</p>}
                    {settings['store.tax_number'] && <p className="text-[9px] text-slate-400 font-mono">Tax/NTN: {settings['store.tax_number']}</p>}
                    <div className="my-2 border-b border-dashed border-slate-300 dark:border-slate-700" />
                    <p className="italic text-[10px] text-slate-600 dark:text-slate-400">
                      {settings['store.receipt_footer'] || 'Exchange within 7 days with valid receipt.'}
                    </p>
                    <div className="my-2 border-b border-dashed border-slate-300 dark:border-slate-700" />
                    <p className="text-[9px] font-bold text-slate-400">
                      Powered By ZENTHROPIC Technologies
                    </p>
                    <p className="text-[9px] text-slate-400">
                      www.zenthropic-technologies.vercel.app · +923123001579
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. POS & Billing Tab */}
            {activeTab === 'pos' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800">
                  POS & Checkout Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Invoice Number Prefix"
                    value={settings['pos.invoice_prefix']}
                    onChange={(e) => {
                      updateSetting('pos.invoice_prefix', e.target.value);
                    }}
                    disabled={!isManager}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Default Payment Tender
                    </label>
                    <select
                      value={settings['pos.default_payment_method']}
                      onChange={(e) => {
                        updateSetting('pos.default_payment_method', e.target.value as any);
                      }}
                      className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      disabled={!isManager}
                    >
                      <option value="cash">Cash (Default)</option>
                      <option value="card">Bank Card</option>
                      <option value="khata">Khata Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Thermal Receipt Paper Width
                    </label>
                    <select
                      value={settings['pos.receipt_paper_size']}
                      onChange={(e) => {
                        updateSetting('pos.receipt_paper_size', e.target.value as any);
                      }}
                      className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      disabled={!isManager}
                    >
                      <option value="80mm">80mm Standard Thermal (Recommended)</option>
                      <option value="58mm">58mm Compact Thermal</option>
                      <option value="A4">A4 Full Page Invoice</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="allow_negative"
                      checked={settings['pos.allow_negative_stock']}
                      onChange={(e) => {
                        updateSetting('pos.allow_negative_stock', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <label
                      htmlFor="allow_negative"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Allow sales when digital stock is zero or negative (Supermarket Mode)
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto_print"
                      checked={settings['pos.auto_print_receipt']}
                      onChange={(e) => {
                        updateSetting('pos.auto_print_receipt', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <label
                      htmlFor="auto_print"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Automatically send receipt to printer upon checkout completion
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Inventory Defaults Tab */}
            {activeTab === 'inventory' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800">
                  Inventory & Stock Thresholds
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Default Low Stock Threshold (Scaled x1000)"
                    type="number"
                    value={settings['inventory.low_stock_threshold'].toString()}
                    onChange={(e) => {
                      updateSetting(
                        'inventory.low_stock_threshold',
                        parseInt(e.target.value, 10) || 0,
                      );
                    }}
                    disabled={!isManager}
                  />
                  <Input
                    label="Default Measurement Unit"
                    value={settings['inventory.default_unit']}
                    onChange={(e) => {
                      updateSetting('inventory.default_unit', e.target.value);
                    }}
                    disabled={!isManager}
                  />
                  <div className="flex items-center gap-3 pt-4 md:col-span-2">
                    <input
                      type="checkbox"
                      id="enable_alerts"
                      checked={settings['inventory.enable_low_stock_alerts']}
                      onChange={(e) => {
                        updateSetting('inventory.enable_low_stock_alerts', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <label
                      htmlFor="enable_alerts"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Show in-app notification badge when items fall below minimum alert level
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Returns Tab */}
            {activeTab === 'returns' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800">
                  Returns & Refund Policies
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Return Policy Terms
                    </label>
                    <textarea
                      rows={3}
                      value={settings['returns.policy_text']}
                      onChange={(e) => {
                        updateSetting('returns.policy_text', e.target.value);
                      }}
                      className="w-full rounded-lg border border-surface-border bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      disabled={!isManager}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="require_invoice"
                      checked={settings['returns.require_original_invoice']}
                      onChange={(e) => {
                        updateSetting('returns.require_original_invoice', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <label
                      htmlFor="require_invoice"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Strictly require original invoice lookup for customer returns
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allow_cash_refund"
                      checked={settings['returns.allow_cash_refund']}
                      onChange={(e) => {
                        updateSetting('returns.allow_cash_refund', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <label
                      htmlFor="allow_cash_refund"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Allow cash drawer refund disbursements for return transactions
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Hardware & Printing Tab */}
            {activeTab === 'printing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-surface-border pb-2 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Hardware Devices & Thermal Printing
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void loadPrinters();
                    }}
                    disabled={isLoadingPrinters}
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                    <span className="text-xs">Scan Printers</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Receipt Printer Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Thermal Receipt Printer
                    </label>
                    <select
                      value={settings['printing.receipt_printer_name']}
                      onChange={(e) => {
                        updateSetting('printing.receipt_printer_name', e.target.value);
                      }}
                      className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      disabled={!isManager}
                    >
                      <option value="">(Default System Spooler)</option>
                      {printersList.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.displayName || p.name} {p.isDefault ? '— (Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Target spooler for thermal invoices & return slips.
                    </p>
                  </div>

                  {/* Barcode Printer Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Barcode Label Printer
                    </label>
                    <select
                      value={settings['printing.label_printer_name']}
                      onChange={(e) => {
                        updateSetting('printing.label_printer_name', e.target.value);
                      }}
                      className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      disabled={!isManager}
                    >
                      <option value="">(Default System Spooler)</option>
                      {printersList.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.displayName || p.name} {p.isDefault ? '— (Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Target spooler for product barcode sticker rolls.
                    </p>
                  </div>

                  <Input
                    label="Default Print Copies"
                    type="number"
                    min="1"
                    max="5"
                    value={settings['printing.print_copies'].toString()}
                    onChange={(e) => {
                      updateSetting('printing.print_copies', parseInt(e.target.value, 10) || 1);
                    }}
                    disabled={!isManager}
                  />
                </div>

                {/* Hardware actions */}
                <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Hardware Diagnostic Tools
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Perform physical verification of ESC/POS thermal printers and RJ11 cash drawers.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void handleTestPrint();
                      }}
                      disabled={isTestingPrint}
                    >
                      <Printer className="h-4 w-4" />
                      <span>{isTestingPrint ? 'Printing Test Receipt...' : 'Send Test Print'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handlePulseDrawer();
                      }}
                    >
                      <HardDrive className="h-4 w-4" />
                      <span>Test Cash Drawer Pulse</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800">
                  Notification Triggers & Alert Policies
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-border bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                    <input
                      type="checkbox"
                      id="notif_stock"
                      checked={settings['notifications.enable_stock_alerts'] ?? true}
                      onChange={(e) => {
                        updateSetting('notifications.enable_stock_alerts', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <div>
                      <label
                        htmlFor="notif_stock"
                        className="font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Low Stock & Out of Stock Alerts
                      </label>
                      <p className="text-slate-500 dark:text-slate-400">
                        Automatically flag variants at or below minimum threshold in the notifications center.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-border bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                    <input
                      type="checkbox"
                      id="notif_cash"
                      checked={settings['notifications.enable_cash_alerts'] ?? true}
                      onChange={(e) => {
                        updateSetting('notifications.enable_cash_alerts', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <div>
                      <label
                        htmlFor="notif_cash"
                        className="font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Cash Drawer Shift Reminders
                      </label>
                      <p className="text-slate-500 dark:text-slate-400">
                        Notify cashiers when no cash register session is currently active.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-border bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                    <input
                      type="checkbox"
                      id="notif_credit"
                      checked={settings['notifications.enable_credit_alerts'] ?? true}
                      onChange={(e) => {
                        updateSetting('notifications.enable_credit_alerts', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <div>
                      <label
                        htmlFor="notif_credit"
                        className="font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Customer Khata Credit Limit Exceeded
                      </label>
                      <p className="text-slate-500 dark:text-slate-400">
                        Alert store manager when a credit balance exceeds the customer's allocated Khata limit.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-border bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                    <input
                      type="checkbox"
                      id="notif_supplier"
                      checked={settings['notifications.enable_supplier_alerts'] ?? true}
                      onChange={(e) => {
                        updateSetting('notifications.enable_supplier_alerts', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      disabled={!isManager}
                    />
                    <div>
                      <label
                        htmlFor="notif_supplier"
                        className="font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Pending Supplier Payables Reminders
                      </label>
                      <p className="text-slate-500 dark:text-slate-400">
                        Alert store manager of high cumulative outstanding supplier balances.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. Security Tab (Admin only) */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800">
                  Security & Access Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Session Inactivity Timeout (Minutes)"
                    type="number"
                    value={settings['security.session_timeout_minutes'].toString()}
                    onChange={(e) => {
                      updateSetting(
                        'security.session_timeout_minutes',
                        parseInt(e.target.value, 10) || 60,
                      );
                    }}
                  />
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="admin_discount"
                      checked={settings['security.require_admin_discount']}
                      onChange={(e) => {
                        updateSetting('security.require_admin_discount', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    />
                    <label
                      htmlFor="admin_discount"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Require manager authorization for custom cart discounts
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="admin_void"
                      checked={settings['security.require_admin_void']}
                      onChange={(e) => {
                        updateSetting('security.require_admin_void', e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    />
                    <label
                      htmlFor="admin_void"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Require manager authorization to void completed invoices
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 9. Backup & Restore Tab (Admin only) */}
            {activeTab === 'backup' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-brand-600" />
                    <span>Database Backup & Safe Restore</span>
                  </div>
                  {stats && (
                    <span className="text-xs font-mono font-normal text-slate-500">
                      DB Size: {(stats.size_bytes / (1024 * 1024)).toFixed(2)} MB ·{' '}
                      {stats.total_records} Records
                    </span>
                  )}
                </h3>

                {/* Admin Backup & Restore Buttons */}
                {isAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Download Backup Button */}
                    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <Download className="h-4 w-4 text-brand-600" />
                        Download Database Backup
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                        Download the complete SQLite database file to your local machine.
                      </p>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          void handleDownloadDb();
                        }}
                        disabled={isDownloading}
                        className="w-full"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{isDownloading ? 'Downloading...' : 'Download Database (.db)'}</span>
                      </Button>
                    </div>

                    {/* Restore Backup Button */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <Upload className="h-4 w-4 text-amber-600" />
                        Restore from Backup
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                        Upload and restore a previously downloaded database backup file.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          void selectAndValidateFile();
                        }}
                        className="w-full border-amber-300 hover:bg-amber-100 dark:border-amber-800"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Restore from File...</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Create Backup Box (For all managers) */}
                <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                    Create Instant Database Snapshot
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                    Exports a transactionally consistent, zero-downtime backup of all products,
                    sales, customers, suppliers, expenses, and ledger entries.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Optional backup note / reason"
                      value={backupNotes}
                      onChange={(e) => {
                        setBackupNotes(e.target.value);
                      }}
                      className="flex-1 rounded-lg border border-surface-border bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        void handleCreateBackup();
                      }}
                      disabled={isCreating}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{isCreating ? 'Backing up...' : 'Create Backup'}</span>
                    </Button>
                  </div>
                </div>

                {/* Backup History Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Available Backups ({backups.length})
                    </h4>
                    {isAdmin && backups.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void loadBackupsAndStats();
                        }}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span className="text-xs">Refresh</span>
                      </Button>
                    )}
                  </div>

                  {backups.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No backups created yet.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-surface-border dark:border-slate-800">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500 sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5">Backup File</th>
                            <th className="p-2.5">Date & Time</th>
                            <th className="p-2.5">Tables</th>
                            <th className="p-2.5">Size</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border dark:divide-slate-800">
                          {backups.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-2.5 font-mono text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[200px]">
                                {b.filename}
                                {b.is_automatic_safety && (
                                  <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800">
                                    Safety
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-500">
                                {new Date(b.created_at).toLocaleString()}
                              </td>
                              <td className="p-2.5 text-slate-700 dark:text-slate-300">
                                {b.tables_count} ({b.records_count} rows)
                              </td>
                              <td className="p-2.5 text-slate-500">
                                {(b.size_bytes / 1024).toFixed(1)} KB
                              </td>
                              <td className="p-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Download Button for each backup */}
                                  {isAdmin && (
                                    <Button
                                      type="button"
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        void downloadBackupFile(b.id as any);
                                      }}
                                      className="h-7 w-full p-0 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30"
                                      title="Download this backup"
                                    >
                                      <Download className="h-6 w-6" />
                                    </Button>
                                  )}
                                  {/* Restore Button for each backup */}
                                  {isAdmin && (
                                    <Button
                                      type="button"
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        void selectAndValidateFile(b.file_path);
                                      }}
                                      className="h-4 w-full p-0 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                      title="Restore this backup"
                                    >
                                      <Upload className="W-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 10. Software License Tab */}
            {activeTab === 'licensing' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-surface-border pb-2 dark:border-slate-800">
                  Software License & Machine Binding
                </h3>

                {/* Status card */}
                <div
                  className={`rounded-xl border p-4 ${
                    licenseStatus?.is_active
                      ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                      : 'border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {licenseStatus?.is_active ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Status: {licenseStatus?.status ?? 'UNLICENSED'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {licenseStatus?.message}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={licenseStatus?.is_active ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={openActivationModal}
                    >
                      {licenseStatus?.is_active ? 'Change License' : 'Activate Software'}
                    </Button>
                  </div>

                  {licenseStatus?.is_active && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-emerald-200/60 pt-3 dark:border-emerald-900/40 text-xs">
                      <div>
                        <span className="text-slate-500">Licensed To:</span>
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {licenseStatus.customer_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Business Name:</span>
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {licenseStatus.business_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">License ID:</span>
                        <p className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                          {licenseStatus.license_id}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Validity:</span>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {licenseStatus.expires_at
                            ? `${licenseStatus.days_remaining?.toString()} days remaining`
                            : 'Lifetime License'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Activated Features:</span>
                        <p className="font-semibold text-slate-900 dark:text-white capitalize">
                          {licenseStatus.features?.join(', ') || 'All Modules'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Machine Code Box */}
                <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    This Machine Code (Hardware Fingerprint):
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={machineCode}
                      className="flex-1 rounded-lg border border-surface-border bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 tracking-wider dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void handleCopyMachineCode();
                      }}
                    >
                      {copiedCode ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Provide this code to your software provider to generate a machine-bound license.
                  </p>
                </div>

                {licenseStatus?.is_active && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Are you sure you want to deactivate the license on this machine?',
                          )
                        ) {
                          void deactivate();
                        }
                      }}
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Deactivate License on this PC
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 11. About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-surface-border pb-4 dark:border-slate-800">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-md">
                    <Crown className="h-7 w-7 fill-slate-950 stroke-[1.75]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                      {settings['store.name'] || 'Mart POS'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Offline Mart Point of Sale & Inventory Management System · Version {appInfo?.version || '1.0.0'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* System & License Overview */}
                  <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-brand-600" />
                      <span>License & System Info</span>
                    </h4>
                    <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">License Status:</span>
                        <Badge
                          variant={licenseStatus?.status === 'VALID' ? 'success' : licenseStatus?.status === 'TRIAL' ? 'warning' : 'danger'}
                        >
                          {licenseStatus?.status === 'VALID'
                            ? 'Licensed (Active)'
                            : licenseStatus?.status === 'TRIAL'
                              ? `Trial (${String(licenseStatus.days_remaining)}d left)`
                              : 'Expired / Unlicensed'}
                        </Badge>
                      </div>
                      {licenseStatus?.customer_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Licensed To:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{licenseStatus.customer_name}</span>
                        </div>
                      )}
                      {licenseStatus?.business_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Business:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{licenseStatus.business_name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Total Backups:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{backups.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Last Backup:</span>
                        <span className="text-slate-900 dark:text-white">
                          {stats?.last_backup?.created_at
                            ? new Date(stats.last_backup.created_at).toLocaleString()
                            : backups.length > 0 && backups[0]?.created_at
                              ? new Date(backups[0].created_at).toLocaleString()
                              : 'No backups recorded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Machine Fingerprint Card */}
                  <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <HardDrive className="h-4 w-4 text-indigo-600" />
                      <span>Machine Fingerprint</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Hardware binding identifier for offline license activation.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={machineCode}
                        className="flex-1 rounded-lg border border-surface-border bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-slate-900 tracking-wider dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          void handleCopyMachineCode();
                        }}
                      >
                        {copiedCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Software Architecture */}
                  <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-brand-600" />
                      <span>Software Architecture</span>
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300">
                      Engineered with 100% offline-first SQLite, Electron, React, and TypeScript.
                      All financial records, ledger transactions, and stock movements are calculated
                      authoritatively with zero floating-point error.
                    </p>
                  </div>

                  {/* Developer & Support Contact */}
                  <div className="rounded-xl border border-surface-border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-amber-600" />
                      <span>Developer & Support Contact</span>
                    </h4>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Powered By ZENTHROPIC Technologies
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Website:{' '}
                      <a
                        href="https://www.zenthropic-technologies.vercel.app"
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        www.zenthropic-technologies.vercel.app
                      </a>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                      <span>+923123001579</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      {isConfirmRestoreOpen && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Restore Database Confirmation
              </h3>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/30 text-xs space-y-2 text-amber-900 dark:text-amber-200">
              <p className="font-bold">
                ⚠️ WARNING: Restoring this backup will replace all current business records.
              </p>
              <p>
                An automatic pre-restore safety backup will be created before replacement so you can
                roll back at any time.
              </p>
            </div>

            <div className="space-y-1.5 text-xs border border-surface-border rounded-xl p-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <p>
                <span className="text-slate-500">File:</span>{' '}
                <span className="font-mono font-semibold">
                  {validationResult.metadata?.filename || 'Selected File'}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Store:</span>{' '}
                <span className="font-semibold">
                  {validationResult.metadata?.store_name || 'Kings Mart'}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Integrity:</span>{' '}
                <span className="font-semibold text-emerald-600">
                  ✓ SQLite Verified & Schema Compatible
                </span>
              </p>
              <p>
                <span className="text-slate-500">Tables Found:</span>{' '}
                <span>{validationResult.tables_found.length} tables verified</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeRestoreConfirm}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  void restoreSelectedBackup();
                }}
                disabled={isRestoring}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isRestoring ? 'Restoring Database...' : 'Confirm & Restore'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
