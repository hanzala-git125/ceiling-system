import React from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  Package,
  Settings,
  Droplets,
  Sun,
  CheckSquare,
  Trash2,
  Receipt,
  Users,
  ShoppingCart,
  BarChart3,
  Landmark,
  LogOut,
  X
} from 'lucide-react';
import { User } from '../types';
import { AppLanguage, getLanguageText } from '../utils/i18n';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  language: AppLanguage;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  isOpen,
  setIsOpen,
  language
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', nameKey: 'dashboard', icon: LayoutDashboard },
    { id: 'inventory', nameKey: 'inventory', icon: Package },
    { id: 'formulas', nameKey: 'formulas', icon: Settings },
    { id: 'wet-prod', nameKey: 'wetProd', icon: Droplets },
    { id: 'dry-prod', nameKey: 'dryProd', icon: Sun },
    { id: 'final-prod', nameKey: 'finalProd', icon: CheckSquare },
    { id: 'waste', nameKey: 'waste', icon: Trash2 },
    { id: 'expenses', nameKey: 'expenses', icon: Receipt },
    { id: 'labour', nameKey: 'labour', icon: Users },
    { id: 'customers', nameKey: 'customers', icon: Users },
    { id: 'suppliers', nameKey: 'suppliers', icon: Landmark },
    { id: 'sales', nameKey: 'salesInvoices', icon: ShoppingCart },
    { id: 'reports', nameKey: 'reports', icon: BarChart3 },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-50 flex flex-col w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header logo */}
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="relative w-12 h-12 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
              <Image src="/logo.png" alt="PlatePro logo" width={48} height={48} className="object-contain mt-2" />
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-900 text-sm tracking-tight leading-tight">Alif Traders</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">{getLanguageText(language, 'productionHub')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Info card */}
        <div className="p-4 mx-3 my-4 bg-slate-50/75 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm uppercase shadow-sm">
              {currentUser?.name?.slice(0, 2) || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-800 truncate">{currentUser?.name || 'Administrator'}</h4>
              <p className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider">{currentUser?.role === 'staff' ? getLanguageText(language, 'staff') : getLanguageText(language, 'admin')}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {getLanguageText(language, item.nameKey as any)}
              </button>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={16} />
            {getLanguageText(language, 'signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}
