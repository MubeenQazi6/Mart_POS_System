import { type ElementType } from 'react';
import { NavLink } from 'react-router-dom';
import { APP_NAME, NAV_SECTIONS } from '@shared/constants/app';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { useAuthStore } from '@renderer/stores/authStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Building2,
  Users,
  RotateCcw,
  Receipt,
  Wallet,
  BarChart3,
  Barcode,
  ShieldCheck,
  Settings,
  Activity,
  Crown,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const iconMap: Record<string, ElementType> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Building2,
  Users,
  RotateCcw,
  Receipt,
  Wallet,
  BarChart3,
  Barcode,
  ShieldCheck,
  Settings,
  Activity,
  Bell,
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps): React.JSX.Element {
  const { canAccessModule, currentUser } = useAuthStore();
  const { settings } = useSettingsStore();

  const storeName = settings['store.name'] || APP_NAME;
  const storeLogo = settings['store.logo'];

  // Pre-filter sections — hide entire section if no items are accessible
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessModule(item.id)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      aria-label="Application Sidebar"
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800 px-3.5">
        <div className="flex items-center gap-3 overflow-hidden">
          {storeLogo ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-md overflow-hidden">
              <img src={storeLogo} alt={storeName} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md">
              <Crown className="h-5 w-5 fill-slate-950 stroke-[1.75]" aria-hidden="true" />
            </div>
          )}
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-white uppercase">
                {storeName}
              </p>
              <p className="truncate text-[10px] font-medium text-amber-400/90 tracking-wide">
                Retail POS & Inventory
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Sections with Hidden Visual Scrollbar */}
      <nav className="flex-1 sidebar-scroll space-y-4 p-2.5" aria-label="Main navigation">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = iconMap[item.iconName] ?? LayoutDashboard;

              const navLink = (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`
                  }
                >
                  <Icon
                    className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105"
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.id} content={item.label} side="right">
                    {navLink}
                  </Tooltip>
                );
              }

              return navLink;
            })}
          </div>
        ))}
      </nav>

      {/* Footer / System Status */}
      <div className="border-t border-slate-800 p-3">
        {/* Role badge */}
        {currentUser && !isCollapsed && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-900 px-2.5 py-1.5 border border-slate-800">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-slate-200">
                {currentUser.full_name}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {currentUser.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
        {/* <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-slate-200"> </p>
              <p className="text-[10px] text-slate-400">Local SQLite DB</p>
            </div>
          )}
        </div> */}
      </div>
    </aside>
  );
}
