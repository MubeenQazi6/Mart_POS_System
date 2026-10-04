import { type ReactNode, type ElementType } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Clock, Shield, Sparkles } from 'lucide-react';

export interface ModulePlaceholderProps {
  title: string;
  description: string;
  phase: number;
  icon?: ElementType;
  plannedFeatures?: string[];
  extraContent?: ReactNode;
}

export function ModulePlaceholder({
  title,
  description,
  phase,
  icon: Icon = Clock,
  plannedFeatures = [],
  extraContent,
}: ModulePlaceholderProps): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={title}
        description={description}
        phase={phase}
        actions={
          <Badge variant="warning" className="px-3 py-1 text-xs">
            Coming in Phase {phase}
          </Badge>
        }
      />

      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
              <Icon className="h-8 w-8" aria-hidden="true" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">{title} Module</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md">
              {description}. This module is part of Phase {phase} in the MARTPOS implementation roadmap.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-surface-border px-3 py-1.5 rounded-lg">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Zero mock data — connects directly to local SQLite in Phase {phase}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {plannedFeatures.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">Planned Capabilities for Phase {phase}</h3>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
              {plannedFeatures.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 bg-slate-50/70 p-3 rounded-lg border border-surface-border/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {extraContent}
    </div>
  );
}
