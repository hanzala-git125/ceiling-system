import React from 'react';
import {
  TrendingUp,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Droplets,
  Sun,
  CheckSquare,
  DollarSign,
  AlertTriangle,
  Receipt,
  FileText
} from 'lucide-react';
import { db, getTodayStr } from '../utils/api';
import { AppLanguage, getLanguageText } from '../utils/i18n';

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  language?: AppLanguage;
}

export default function Dashboard({ setCurrentTab, onViewInvoice, language = 'en' }: DashboardProps) {
  // Fetch data
  const materials = db.getMaterials();
  const wetProd = db.getWetProduction();
  const dryProd = db.getDryProduction();
  const finalProd = db.getFinalProduction();
  const waste = db.getWasteRecords();
  const expenses = db.getExpenses();
  const sales = db.getSales();
  const tCrosses = db.getTCrosses ? db.getTCrosses() : [];
  const wallAngles = db.getWallAngles ? db.getWallAngles() : [];

  const todayStr = getTodayStr();

  // Calculations for TODAY
  const totalWetToday = wetProd
    .filter((w) => w.productionDate === todayStr)
    .reduce((sum, item) => sum + item.wetPlatesProduced, 0);

  const totalDryToday = dryProd
    .filter((d) => d.date === todayStr)
    .reduce((sum, item) => sum + item.dryPlatesProduced, 0);

  const totalFinalToday = finalProd
    .filter((f) => f.date === todayStr)
    .reduce((sum, item) => sum + item.finalPlatesProduced, 0);

  // Current Stock Value: Sum of (quantity * costPerUnit)
  const currentStockValue = materials.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0);

  const totalSalesToday = sales
    .filter((s) => s.date === todayStr)
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const totalExpensesToday = expenses
    .filter((e) => e.date === todayStr)
    .reduce((sum, item) => sum + item.amount, 0);

  const tCrossCostToday = sales.filter((sale) => sale.date === todayStr).reduce((sum, sale) => {
    const item = tCrosses.find((entry) => entry.id === sale.tCrossTypeId) || tCrosses.find((entry) => entry.name === sale.tCrossTypeName) || tCrosses[0];
    return sum + (sale.tCrossFeet || 0) * (item?.costPerUnit || 0);
  }, 0);
  const wallAngleCostToday = sales.filter((sale) => sale.date === todayStr).reduce((sum, sale) => {
    const item = wallAngles.find((entry) => entry.id === sale.wallAngleId) || wallAngles.find((entry) => entry.name === sale.wallAngleName) || wallAngles[0];
    return sum + (sale.wallAnglePieces || 0) * (item?.costPerUnit || 0);
  }, 0);

  const totalWasteToday = waste
    .filter((w) => w.date === todayStr)
    .reduce((sum, item) => sum + item.quantity, 0);

  const remainingWetStock = Math.max(0, wetProd.reduce((sum, item) => sum + item.wetPlatesProduced, 0) - dryProd.reduce((sum, item) => sum + item.wetPlatesReceived, 0));
  const remainingDryStock = Math.max(0, dryProd.reduce((sum, item) => sum + item.dryPlatesProduced, 0) - finalProd.reduce((sum, item) => sum + item.dryPlatesReceived, 0));
  const remainingFinalStock = Math.max(0, finalProd.reduce((sum, item) => sum + item.finalPlatesProduced, 0) - sales.reduce((sum, item) => sum + item.quantity, 0));

  // Profit / Loss Summary: (All-time or Today? Let's do today first, and show cumulative monthly summary too!)
  const netProfitToday = totalSalesToday - totalExpensesToday - tCrossCostToday - wallAngleCostToday;

  // Let's get past 7 days dates for trend charts
  const last7Days = Array.from({ length: 7 }, (_, i) => getTodayStr(-6 + i));

  // Build daily data sets for trend charts
  const productionTrends = last7Days.map((date) => {
    const wet = wetProd.filter((w) => w.productionDate === date).reduce((sum, item) => sum + item.wetPlatesProduced, 0);
    const dry = dryProd.filter((d) => d.date === date).reduce((sum, item) => sum + item.dryPlatesProduced, 0);
    const final = finalProd.filter((f) => f.date === date).reduce((sum, item) => sum + item.finalPlatesProduced, 0);
    return { date, wet, dry, final };
  });

  const salesTrends = last7Days.map((date) => {
    const total = sales.filter((s) => s.date === date).reduce((sum, item) => sum + item.totalAmount, 0);
    return { date, total };
  });

  const expenseTrends = last7Days.map((date) => {
    const total = expenses.filter((e) => e.date === date).reduce((sum, item) => sum + item.amount, 0);
    return { date, total };
  });

  // Compile a list of recent activities across all modules
  const activities: { id: string; type: string; title: string; subtitle: string; amount?: number; time: string; badgeColor: string; tabRef: string }[] = [];

  wetProd.forEach((w) => {
    activities.push({
      id: 'wet_' + w.id,
      type: 'Wet Production',
      title: `${w.wetPlatesProduced} Wet Plates Molded`,
      subtitle: `Plaster: ${w.plasterParisUsed} bags`,
      time: w.productionDate,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
      tabRef: 'wet-prod'
    });
  });

  dryProd.forEach((d) => {
    activities.push({
      id: 'dry_' + d.id,
      type: 'Dry Production',
      title: `${d.dryPlatesProduced} Dry Plates Ready`,
      subtitle: `Waste: ${d.wastePlates} plates reported`,
      time: d.date,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
      tabRef: 'dry-prod'
    });
  });

  finalProd.forEach((f) => {
    activities.push({
      id: 'final_' + f.id,
      type: 'Final Product',
      title: `${f.finalPlatesProduced} Final Plates Completed`,
      subtitle: 'Formulas deducted & stock adjusted',
      time: f.date,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      tabRef: 'final-prod'
    });
  });

  expenses.forEach((e) => {
    activities.push({
      id: 'exp_' + e.id,
      type: 'Expense',
      title: `Rs. ${e.amount.toLocaleString()} - ${e.category}`,
      subtitle: e.description,
      amount: e.amount,
      time: e.date,
      badgeColor: 'bg-red-50 text-red-700 border-red-100',
      tabRef: 'expenses'
    });
  });

  sales.forEach((s) => {
    activities.push({
      id: 'sale_' + s.id,
      type: 'Sale',
      title: `INV: ${s.invoiceNumber}`,
      subtitle: `${s.customerName} - ${s.quantity} plates`,
      amount: s.totalAmount,
      time: s.date,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      tabRef: 'sales'
    });
  });

  // Sort activities newest first
  const sortedActivities = activities
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  // Render simple beautiful SVG charts
  const maxProduction = Math.max(...productionTrends.map((p) => Math.max(p.wet, p.dry, p.final)), 1000);
  const maxSales = Math.max(...salesTrends.map((s) => s.total), 50000);
  const maxExpense = Math.max(...expenseTrends.map((e) => e.total), 20000);

  const formatShortDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${months[m]} ${d}`;
  };

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card: Wet Plates */}
        <div
          onClick={() => setCurrentTab('wet-prod')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getLanguageText(language, 'wetPlatesToday')}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Droplets size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-slate-900">{totalWetToday.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">pcs</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingUp size={12} className="text-emerald-500 shrink-0 animate-pulse" /> Molding Unit Log
          </p>
        </div>

        {/* Card: Dry Plates */}
        <div
          onClick={() => setCurrentTab('dry-prod')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getLanguageText(language, 'dryPlatesToday')}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <Sun size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-slate-900">{totalDryToday.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">pcs</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingUp size={12} className="text-emerald-500 shrink-0" /> Drying Oven Checkout
          </p>
        </div>

        {/* Card: Final Product */}
        <div
          onClick={() => setCurrentTab('final-prod')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getLanguageText(language, 'finalPlatesToday')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <CheckSquare size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-slate-900">{totalFinalToday.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">pcs</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingUp size={12} className="text-emerald-500 shrink-0" /> Warehouse Completed
          </p>
        </div>

        {/* Card: Current Stock Value */}
        <div
          onClick={() => setCurrentTab('inventory')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getLanguageText(language, 'rawStockValue')}</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
              <Package size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Rs.</span>
            <span className="text-2xl font-bold font-display text-slate-900">{Math.round(currentStockValue).toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
            Materials Ledger Valuation
          </p>
        </div>

        {/* Card: Sales Today */}
        <div
          onClick={() => setCurrentTab('sales')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales Today</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Rs.</span>
            <span className="text-2xl font-bold font-display text-slate-900">{totalSalesToday.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
            Dispatched Invoices Revenue
          </p>
        </div>

        {/* Card: Expenses Today */}
        <div
          onClick={() => setCurrentTab('expenses')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getLanguageText(language, 'expensesToday')}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <Receipt size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Rs.</span>
            <span className="text-2xl font-bold font-display text-slate-900">{totalExpensesToday.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
            Disbursements &amp; Wages
          </p>
        </div>

        {/* Card: Waste today */}
        <div
          onClick={() => setCurrentTab('waste')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waste Plates Today</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-slate-900">{totalWasteToday.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">pcs</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
            Breakage &amp; Quality Audit
          </p>
        </div>

        {/* Card: Profit/Loss */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getLanguageText(language, 'netProfitToday')}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
              netProfitToday >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              P/L
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Rs.</span>
            <span className={`text-2xl font-bold font-display ${
              netProfitToday >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}>{netProfitToday.toLocaleString()}</span>
          </div>
          <p className="text-[10px] mt-3 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
            {netProfitToday >= 0 ? (
              <>
                <ArrowUpRight size={12} className="text-emerald-500 shrink-0" />
                <span className="text-emerald-600">Surplus Net Flow</span>
              </>
            ) : (
              <>
                <ArrowDownRight size={12} className="text-red-500 shrink-0" />
                <span className="text-red-600 font-medium">Deficit Net Flow</span>
              </>
            )}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remaining Stock</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">#</div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-slate-500">Wet</span><span className="font-mono font-bold text-slate-800">{remainingWetStock.toLocaleString()} pcs</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Dry</span><span className="font-mono font-bold text-slate-800">{remainingDryStock.toLocaleString()} pcs</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Final</span><span className="font-mono font-bold text-slate-800">{remainingFinalStock.toLocaleString()} pcs</span></div>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Trends Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-slate-950 text-sm">7-Day Production Trends</h3>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Output correlation (Wet vs Dry vs Final)</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold font-sans">
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" /> Wet
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> Dry
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /> Final
              </span>
            </div>
          </div>

          {/* SVG Custom Line Chart */}
          <div className="relative h-56 w-full border-b border-slate-100 pb-2">
            <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="700" y2="0" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="50" x2="700" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="150" x2="700" y2="150" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="200" x2="700" y2="200" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Wet Production Polyline */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                points={productionTrends
                  .map((p, idx) => {
                    const x = (idx / 6) * 700;
                    const y = 200 - (p.wet / maxProduction) * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Dry Production Polyline */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                points={productionTrends
                  .map((p, idx) => {
                    const x = (idx / 6) * 700;
                    const y = 200 - (p.dry / maxProduction) * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Final Production Polyline */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points={productionTrends
                  .map((p, idx) => {
                    const x = (idx / 6) * 700;
                    const y = 200 - (p.final / maxProduction) * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Interaction dots */}
              {productionTrends.map((p, idx) => {
                const x = (idx / 6) * 700;
                const yWet = 200 - (p.wet / maxProduction) * 180;
                const yDry = 200 - (p.dry / maxProduction) * 180;
                const yFinal = 200 - (p.final / maxProduction) * 180;
                return (
                  <g key={idx}>
                    <circle cx={x} cy={yWet} r="4" fill="#3b82f6" stroke="white" strokeWidth="1" />
                    <circle cx={x} cy={yDry} r="4" fill="#f59e0b" stroke="white" strokeWidth="1" />
                    <circle cx={x} cy={yFinal} r="4" fill="#10b981" stroke="white" strokeWidth="1" />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between px-1 mt-2 text-[10px] font-semibold font-mono text-slate-400">
            {productionTrends.map((p, idx) => (
              <span key={idx}>{formatShortDate(p.date)}</span>
            ))}
          </div>
        </div>

        {/* Finance Trends (Sales & Expenses) Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-slate-950 text-sm">Sales vs. Expenses Performance</h3>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Profit flow mapping (Last 7 Days)</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold font-sans">
              <span className="flex items-center gap-1 text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block" /> Sales Revenue
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" /> Expenses
              </span>
            </div>
          </div>

          <div className="relative h-56 w-full border-b border-slate-100 pb-2">
            <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="700" y2="0" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="50" x2="700" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="150" x2="700" y2="150" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="200" x2="700" y2="200" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Sales Line */}
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                points={salesTrends
                  .map((s, idx) => {
                    const x = (idx / 6) * 700;
                    const y = 200 - (s.total / Math.max(maxSales, maxExpense)) * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Expense Line */}
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                points={expenseTrends
                  .map((e, idx) => {
                    const x = (idx / 6) * 700;
                    const y = 200 - (e.total / Math.max(maxSales, maxExpense)) * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Value Markers */}
              {salesTrends.map((s, idx) => {
                const x = (idx / 6) * 700;
                const yS = 200 - (s.total / Math.max(maxSales, maxExpense)) * 180;
                const yE = 200 - (expenseTrends[idx].total / Math.max(maxSales, maxExpense)) * 180;
                return (
                  <g key={idx}>
                    <circle cx={x} cy={yS} r="4.5" fill="#6366f1" stroke="white" strokeWidth="1.5" />
                    <circle cx={x} cy={yE} r="4" fill="#f43f5e" stroke="white" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between px-1 mt-2 text-[10px] font-semibold font-mono text-slate-400">
            {salesTrends.map((s, idx) => (
              <span key={idx}>{formatShortDate(s.date)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & Low Stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-slate-950 text-sm">Recent Activity Stream</h3>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Chronological view of warehouse logs</p>
              </div>
              <button
                onClick={() => setCurrentTab('reports')}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider bg-indigo-50 border border-indigo-100/50 px-3 py-1.5 rounded-lg transition-colors"
              >
                All Logs
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {sortedActivities.length > 0 ? (
                sortedActivities.map((act) => (
                  <div key={act.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border shrink-0 uppercase tracking-wider ${act.badgeColor}`}>
                        {act.type}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{act.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">{act.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <span className="text-[10px] font-bold font-mono text-slate-400 block">{act.time}</span>
                      <button
                        onClick={() => {
                          if (act.id.startsWith('sale_')) {
                            onViewInvoice(act.id.replace('sale_', ''));
                          } else {
                            setCurrentTab(act.tabRef);
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 hover:underline mt-0.5 inline-block"
                      >
                        {act.id.startsWith('sale_') ? 'View Invoice' : 'Manage'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-6">No production or sale logs recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Stock alerts and Active Formula stacked */}
        <div className="flex flex-col gap-6">
          {/* Low Stock Notifications */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-display font-bold text-slate-950 text-sm mb-1">Critical Stock Alerts</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-5">Minimum threshold notifications</p>

            <div className="space-y-3.5">
              {materials.slice(0, 4).map((mat) => {
                const isLow = mat.quantity <= mat.minThreshold;
                return (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-1.5 h-8 shrink-0 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500'}`}></div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{mat.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Current: {mat.quantity.toLocaleString()} {mat.unit}</div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0 pl-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isLow ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {isLow ? 'Low' : 'Normal'}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-mono">Limit: {mat.minThreshold}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Formula Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-white text-sm opacity-90">Active Formulas</h3>
                <button
                  onClick={() => setCurrentTab('formulas')}
                  className="text-[9px] font-bold text-indigo-200 hover:text-white uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-md transition-colors"
                >
                  View Settings
                </button>
              </div>
              <div className="space-y-3">
                {db.getFormulas().slice(0, 4).map((f) => (
                  <div key={f.id} className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-xs opacity-60 font-sans font-medium">{f.materialName}</span>
                    <span className="text-xs font-mono font-medium text-indigo-200">{f.amount} {f.unit} / pc</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-medium mt-4 uppercase tracking-widest text-center">
              AUTOMATICALLY DEDUCTED ON ASSEMBLY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
