import type { AppInfo } from '@shared/types/app';
import { APP_NAME, APP_TAGLINE } from '@shared/constants/app';
import { CheckCircle2, Database, Shield, Zap } from 'lucide-react';

interface WelcomePanelProps {
  appInfo: AppInfo;
}

const FOUNDATION_ITEMS = [
  {
    icon: Shield,
    title: 'Secure Architecture',
    description: 'Context isolation, sandboxed renderer, and typed IPC channels.',
  },
  {
    icon: Database,
    title: 'Local Database Ready',
    description: 'SQLite + Drizzle ORM with local migration support.',
  },
  {
    icon: Zap,
    title: 'POS-Optimized',
    description: 'Architecture designed for fast barcode scanning and checkout flows.',
  },
  {
    icon: CheckCircle2,
    title: 'Production Path',
    description: 'Windows installer packaging via electron-builder (NSIS).',
  },
] as const;

export function WelcomePanel({ appInfo }: WelcomePanelProps): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">System Ready</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          Welcome to {APP_NAME}
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">{APP_TAGLINE}</p>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          The core POS, inventory, finance, reporting, and staff workflows are ready for daily store
          operations.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FOUNDATION_ITEMS.map((item) => (
          <article key={item.title} className="card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white">System Information</h3>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Version</dt>
            <dd className="font-medium text-slate-900 dark:text-white">{appInfo.version}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Platform</dt>
            <dd className="font-medium capitalize text-slate-900 dark:text-white">
              {appInfo.platform}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Packaged</dt>
            <dd className="font-medium text-slate-900 dark:text-white">
              {appInfo.isPackaged ? 'Yes' : 'No'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">User Data Path</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
              {appInfo.userDataPath}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
