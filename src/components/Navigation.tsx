import React from 'react';
import {
  LayoutDashboard,
  Building,
  Users,
  CreditCard,
  Receipt,
  Settings,
  Plus
} from 'lucide-react';

export type NavTab = 'dashboard' | 'rooms' | 'tenants' | 'payments' | 'expenses' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onQuickRecordPayment: () => void;
  arrearsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onQuickRecordPayment,
  arrearsCount = 0,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms', icon: Building },
    { id: 'tenants', label: 'Tenants', icon: Users, badge: arrearsCount > 0 ? arrearsCount : undefined },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Header / Nav */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-black via-zinc-900 to-emerald-700 flex items-center justify-center text-emerald-400 border border-emerald-800/40 shadow-md">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg font-heading text-zinc-900 leading-none block">
                CL LODGES & HOMES <span className="text-emerald-700 font-semibold text-xs sm:text-sm">/ APARTMENTS</span>
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                Rental Property Management System
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onQuickRecordPayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Sleek Black with Green Accents) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-zinc-800 shadow-2xl safe-area-pb"
      >
        <div className="grid grid-cols-6 h-16 items-center px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition relative min-h-[44px] ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-zinc-400 font-medium hover:text-zinc-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-400' : 'text-zinc-400'}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-none truncate max-w-full">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
