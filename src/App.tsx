import React, { useState, useEffect } from 'react';
import { db, getCurrentUser, setCurrentUser as setStoredUser } from './utils/api';
import { User } from './types';
import { AppLanguage, getStoredLanguage, setStoredLanguage } from './utils/i18n';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import FormulaSettings from './pages/FormulaSettings';
import WetProduction from './pages/WetProduction';
import DryProduction from './pages/DryProduction';
import FinalProduction from './pages/FinalProduction';
import WasteManagement from './pages/WasteManagement';
import Expenses from './pages/Expenses';
import Labour from './pages/Labour';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Sales from './pages/Sales';
import Reports from './pages/Reports';

// Import Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [language, setLanguage] = useState<AppLanguage>(getStoredLanguage());

  useEffect(() => {
    const storage = window.localStorage;
    const lastBootstrapSync = storage.getItem('factory_erp_bootstrap_synced_at');
    const hasLocalSeedData = Boolean(
      storage.getItem('factory_erp_materials') ||
      storage.getItem('factory_erp_suppliers') ||
      storage.getItem('factory_erp_customers')
    );

    if (hasLocalSeedData && lastBootstrapSync) {
      const ageMs = Date.now() - Number(lastBootstrapSync);
      if (ageMs < 30_000) {
        setCurrentUser(getCurrentUser());
        setIsSyncing(false);
        return;
      }
    }

    fetch('/api/bootstrap', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([key, val]) => {
            if (key !== 'factory_erp_user') {
              localStorage.setItem(key, JSON.stringify(val));
            }
          });
        }
        storage.setItem('factory_erp_bootstrap_synced_at', Date.now().toString());
        setCurrentUser(getCurrentUser());
        setIsSyncing(false);
      })
      .catch(err => {
        console.error("Failed to sync with MongoDB. Running in cached offline mode.", err);
        setCurrentUser(getCurrentUser());
        setIsSyncing(false);
      });
  }, []);

  // Synchronize authentication status
  const handleLoginSuccess = (user: User) => {
    setStoredUser(user);
    setCurrentUser(user);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setStoredUser(null);
    setCurrentUser(null);
  };

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setStoredLanguage(nextLanguage);
  };

  if (isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing with MongoDB Database...</p>
      </div>
    );
  }

  // If user is not logged in, render the clean login screen
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} language={language} />;
  }

  // Active page renderer mapping
  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            setCurrentTab={setCurrentTab}
            onViewInvoice={(id) => {
              setCurrentTab('sales');
            }}
            language={language}
          />
        );
      case 'inventory':
        return <Inventory language={language} />;
      case 'formulas':
        return <FormulaSettings language={language} />;
      case 'wet-prod':
        return <WetProduction language={language} />;
      case 'dry-prod':
        return <DryProduction language={language} />;
      case 'final-prod':
        return <FinalProduction language={language} />;
      case 'waste':
        return <WasteManagement language={language} />;
      case 'expenses':
        return <Expenses language={language} />;
      case 'labour':
        return <Labour language={language} />;
      case 'customers':
        return <Customers language={language} />;
      case 'suppliers':
        return <Suppliers language={language} />;
      case 'sales':
      case 'invoices': // Both map to our full sales and invoicing operations suite
        return <Sales language={language} />;
      case 'reports':
        return <Reports language={language} />;
      default:
        return (
          <Dashboard
            setCurrentTab={setCurrentTab}
            onViewInvoice={(id) => {
              setCurrentTab('sales');
            }}
            language={language}
          />
        );
    }
  };

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        language={language}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* App Topbar Header */}
        <Header
          currentTab={currentTab}
          currentUser={currentUser}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          language={language}
          onLanguageChange={handleLanguageChange}
        />

        {/* Dynamic Page Stage */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
