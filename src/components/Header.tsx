import React from 'react';
import { Menu, Calendar, Languages } from 'lucide-react';
import { User } from '../types';
import { AppLanguage, getLanguageText } from '../utils/i18n';

interface HeaderProps {
  currentTab: string;
  currentUser: User | null;
  onMenuToggle: () => void;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
}

export default function Header({ currentTab, currentUser, onMenuToggle, language, onLanguageChange }: HeaderProps) {
  // Format tab title beautifully
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return getLanguageText(language, 'overviewDashboard');
      case 'inventory':
        return getLanguageText(language, 'rawMaterialsInventory');
      case 'formulas':
        return getLanguageText(language, 'formulaSettings');
      case 'wet-prod':
        return getLanguageText(language, 'wetProductionEntry');
      case 'dry-prod':
        return getLanguageText(language, 'dryProductionEntry');
      case 'final-prod':
        return getLanguageText(language, 'finalProductAssembly');
      case 'waste':
        return getLanguageText(language, 'wasteTrackingAndLogs');
      case 'expenses':
        return getLanguageText(language, 'expenseManagement');
      case 'labour':
        return getLanguageText(language, 'labourAndOperatorManagement');
      case 'customers':
        return getLanguageText(language, 'customerLedgersAndDirectory');
      case 'sales':
        return getLanguageText(language, 'salesInvoices');
      case 'invoices':
        return getLanguageText(language, 'salesInvoices');
      case 'reports':
        return getLanguageText(language, 'analyticsAndProductionReports');
      default:
        return getLanguageText(language, 'factoryErp');
    }
  };

  const getTodayFormatted = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-30 no-print">
      {/* Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 lg:hidden focus:outline-none"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="font-display font-bold text-slate-900 text-lg tracking-tight leading-tight">
            {getTabTitle(currentTab)}
          </h2>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold tracking-wider uppercase mt-0.5">
            <span>{getLanguageText(language, 'productionHub')}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">{currentTab.replace('-', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Date, Time, and Status */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onLanguageChange(language === 'en' ? 'ur' : 'en')}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-100"
        >
          <Languages size={14} className="text-indigo-600" />
          <span>{language === 'en' ? 'اردو' : 'EN'}</span>
        </button>

        <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-xs font-semibold font-sans">{getTodayFormatted()}</span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100/50 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 font-mono">{getLanguageText(language, 'systemOnline')}</span>
        </div>
      </div>
    </header>
  );
}
