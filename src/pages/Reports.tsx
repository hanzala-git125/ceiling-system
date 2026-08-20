import React, { useMemo, useState } from 'react';
import {
  Printer,
  Search,
  Landmark,
  Receipt,
  AlertTriangle,
  Droplets,
  Sun,
  CheckSquare,
  Layers,
  FileBarChart2,
  CheckCircle,
} from 'lucide-react';
import { db, getTodayStr, getCustomerOutstandingBalance } from '../utils/api';
import { AppLanguage, getLanguageText } from '../utils/i18n';

type ReportScope = 'daily' | 'weekly' | 'monthly' | 'custom';

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + diff);
  return formatDateInput(date);
}

function endOfWeek(dateString: string) {
  const start = startOfWeek(dateString);
  const [year, month, day] = start.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 6);
  return formatDateInput(date);
}

function startOfMonth(dateString: string) {
  return dateString.substring(0, 8) + '01';
}

function endOfMonth(dateString: string) {
  const [year, month] = dateString.split('-').map(Number);
  const nextMonth = new Date(year, month, 1);
  const lastDay = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

interface ReportsPageProps {
  language?: AppLanguage;
}

export default function ReportsPage({ language = 'en' }: ReportsPageProps) {
  const today = getTodayStr();
  const defaultStart = today.substring(0, 8) + '01';
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [reportScope, setReportScope] = useState<ReportScope>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const sales = db.getSales();
  const expenses = db.getExpenses();
  const waste = db.getWasteRecords();
  const wet = db.getWetProduction();
  const dry = db.getDryProduction();
  const final = db.getFinalProduction();
  const customers = db.getCustomers();
  const suppliers = db.getSuppliers();
  const txs = db.getTransactions();
  const materials = db.getMaterials();
  const tCrosses = db.getTCrosses ? db.getTCrosses() : [];
  const wallAngles = db.getWallAngles ? db.getWallAngles() : [];

  const reportRange = useMemo(() => {
    if (reportScope === 'daily') {
      return { start: today, end: today, label: 'Daily Report' };
    }
    if (reportScope === 'weekly') {
      return { start: startOfWeek(today), end: today, label: 'Current Week Report' };
    }
    if (reportScope === 'monthly') {
      return { start: startOfMonth(today), end: today, label: 'Current Month Report' };
    }
    return { start: startDate, end: endDate, label: 'Custom Range Report' };
  }, [reportScope, startDate, endDate, today]);

  const isWithinRange = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr >= reportRange.start && dateStr <= reportRange.end;
  };

  const matchesSearch = (value: string) => {
    if (!searchQuery.trim()) return true;
    return value.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const filteredSales = sales.filter((s) => isWithinRange(s.date) && matchesSearch(`${s.customerName} ${s.invoiceNumber} ${s.productName}`));
  const filteredExpenses = expenses.filter((e) => isWithinRange(e.date) && matchesSearch(`${e.category} ${e.description}`));
  const filteredWaste = waste.filter((w) => isWithinRange(w.date) && matchesSearch(w.notes));
  const filteredWet = wet.filter((w) => isWithinRange(w.productionDate));
  const filteredDry = dry.filter((d) => isWithinRange(d.date));
  const filteredFinal = final.filter((f) => isWithinRange(f.date));
  const filteredCustomers = customers.filter((c) => matchesSearch(`${c.name} ${c.phone} ${c.address}`));
  const filteredTxs = txs.filter((t) => isWithinRange(t.date) && matchesSearch(`${t.materialName} ${t.notes}`));
  const filteredLabour = db.getLabourLedger().filter((entry) => isWithinRange(entry.date) && matchesSearch(`${entry.operatorName} ${entry.notes}`));

  const salesQty = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
  const salesGross = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const discounts = filteredSales.reduce((sum, s) => sum + s.discount, 0);
  const netRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseByCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const totalWasteQty = filteredWaste.reduce((sum, w) => sum + w.quantity, 0);
  const wetLoss = filteredWaste.filter((w) => w.source === 'wet').reduce((sum, w) => sum + w.quantity, 0);
  const dryLoss = filteredWaste.filter((w) => w.source === 'dry').reduce((sum, w) => sum + w.quantity, 0);

  const totalWetProduced = filteredWet.reduce((sum, r) => sum + r.wetPlatesProduced, 0);
  const totalDryProduced = filteredDry.reduce((sum, r) => sum + r.dryPlatesProduced, 0);
  const totalFinalProduced = filteredFinal.reduce((sum, r) => sum + r.finalPlatesProduced, 0);
  const totalWetReceivedToDry = filteredDry.reduce((sum, r) => sum + r.wetPlatesReceived, 0);
  const totalDryReceivedToFinal = filteredFinal.reduce((sum, r) => sum + r.dryPlatesReceived, 0);
  const soldQty = filteredSales.reduce((sum, s) => sum + s.quantity, 0);

  const effectiveBaseUnits = Math.max(totalFinalProduced, soldQty, 1);
  const standardLabourRatePerPlate = 18;
  const rawLabourCost = filteredLabour.filter((entry) => entry.type === 'earning').reduce((sum, entry) => {
    const labourValue = entry.plates > 0 ? entry.plates * (entry.ratePerPlate || 0) : entry.amount;
    return sum + labourValue;
  }, 0);

  // Labour cost breakdown by stage
  const labourCostWet = filteredLabour.filter((entry) => entry.type === 'earning' && entry.stage === 'wet').reduce((sum, entry) => {
    const labourValue = entry.plates > 0 ? entry.plates * (entry.ratePerPlate || 0) : entry.amount;
    return sum + labourValue;
  }, 0);
  const labourCostDry = filteredLabour.filter((entry) => entry.type === 'earning' && entry.stage === 'dry').reduce((sum, entry) => {
    const labourValue = entry.plates > 0 ? entry.plates * (entry.ratePerPlate || 0) : entry.amount;
    return sum + labourValue;
  }, 0);
  const labourCostFinal = filteredLabour.filter((entry) => entry.type === 'earning' && entry.stage === 'final').reduce((sum, entry) => {
    const labourValue = entry.plates > 0 ? entry.plates * (entry.ratePerPlate || 0) : entry.amount;
    return sum + labourValue;
  }, 0);
  const labourCost = Math.min(rawLabourCost, effectiveBaseUnits * standardLabourRatePerPlate);

  const stockUsedCost = filteredWet.reduce((sum, record) => {
    const material = materials.find((item) => item.name.toLowerCase().includes('plaster'));
    if (!material || record.plasterParisUsed <= 0) return sum;
    return sum + record.plasterParisUsed * material.costPerUnit;
  }, 0) + filteredFinal.reduce((sum, record) => {
    return sum + (record.consumptions || []).reduce((consumptionSum, cons) => {
      const material = materials.find((item) => item.name.toLowerCase() === cons.materialName.toLowerCase());
      if (!material || !cons.calculatedAmount) return consumptionSum;
      return consumptionSum + Number(cons.calculatedAmount) * material.costPerUnit;
    }, 0);
  }, 0);

  // T Cross metrics
  const tCrossRemaining = tCrosses.reduce((s, t) => s + t.quantity, 0);
  const tCrossSalesFeet = filteredSales.reduce((s, sale) => s + (sale.tCrossFeet || 0), 0);
  const tCrossRevenue = filteredSales.reduce((s, sale) => s + (sale.tCrossAmount || 0), 0);
  const getTCrossQuantity = (sale: typeof filteredSales[number]) => sale.tCrossFeet || 0;
  const getTCrossItem = (sale: typeof filteredSales[number]) => tCrosses.find((item) => item.id === sale.tCrossTypeId) || tCrosses.find((item) => item.name.toLowerCase() === (sale.tCrossTypeName || '').toLowerCase()) || tCrosses[0];
  const tCrossStockUsedCost = filteredSales.reduce((sum, sale) => sum + getTCrossQuantity(sale) * (getTCrossItem(sale)?.costPerUnit || 0), 0);
  const tCrossProfit = tCrossRevenue - tCrossStockUsedCost;
  const tCrossByType = tCrosses.map((item) => ({
    ...item,
    sold: filteredSales.reduce((sum, sale) => sum + (sale.tCrossTypeId === item.id || sale.tCrossTypeName === item.name ? getTCrossQuantity(sale) : 0), 0),
    revenue: filteredSales.reduce((sum, sale) => sum + (sale.tCrossTypeId === item.id || sale.tCrossTypeName === item.name ? sale.tCrossAmount || 0 : 0), 0),
  }));
  const wallAngleRemaining = wallAngles.reduce((sum, item) => sum + item.quantity, 0);
  const wallAngleSales = filteredSales.reduce((sum, sale) => sum + (sale.wallAnglePieces || 0), 0);
  const wallAngleRevenue = filteredSales.reduce((sum, sale) => sum + (sale.wallAngleAmount || 0), 0);
  const wallAngleStockUsedCost = filteredSales.reduce((sum, sale) => {
    const item = wallAngles.find((entry) => entry.id === sale.wallAngleId) || wallAngles.find((entry) => entry.name === sale.wallAngleName) || wallAngles[0];
    return sum + (sale.wallAnglePieces || 0) * (item?.costPerUnit || 0);
  }, 0);

  // include T Cross stock used into overall stockUsedCost
  const accessoryStockUsedCost = tCrossStockUsedCost + wallAngleStockUsedCost;
  const totalStockUsedCost = stockUsedCost + accessoryStockUsedCost;

  const remainingWet = Math.max(0, totalWetProduced - totalWetReceivedToDry);
  const remainingDry = Math.max(0, totalDryProduced - totalDryReceivedToFinal);
  const remainingFinal = Math.max(0, totalFinalProduced - soldQty);

  const revenue = netRevenue;
  const netProfit = revenue - totalStockUsedCost - totalExpenses - labourCost;
  const labourCostPerPlate = effectiveBaseUnits > 0 ? labourCost / effectiveBaseUnits : 0;
  const profitPerPlate = effectiveBaseUnits > 0 ? (netProfit + accessoryStockUsedCost) / effectiveBaseUnits : 0;
  const totalReceivables = filteredCustomers.reduce((sum, c) => sum + getCustomerOutstandingBalance(c.id), 0);
  const procurementCost = filteredTxs.filter((t) => t.type === 'in').reduce((sum, t) => sum + t.cost, 0);

  const handlePrintReport = () => {
    window.print();
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const scopeOptions: { value: ReportScope; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-emerald-600 text-white rounded-xl border border-emerald-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h3 className="font-display font-black text-slate-800 text-sm">ERP Reporting Center</h3>
            <p className="text-[11px] text-slate-400 font-medium">One printable report with profit, expenses, waste, production status, receivables and sales.</p>
          </div>
          <button
            onClick={() => {
              handlePrintReport();
              triggerToast('Printable report generated.');
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer size={14} /> {getLanguageText(language, 'printReport')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={reportScope !== 'custom'}
              className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-semibold mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={reportScope !== 'custom'}
              className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Report Scope</label>
            <select
              value={reportScope}
              onChange={(e) => setReportScope(e.target.value as ReportScope)}
              className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Search</label>
            <div className="relative">
              <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={14} />
              <input
                type="text"
                placeholder={getLanguageText(language, 'searchEntries')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm print-report-wrapper font-sans text-slate-700">
        <div className="hidden print:flex print-header-logo justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
          <div>
            <h1 className="font-display font-black text-slate-900 text-base uppercase tracking-tight">Prime Plate Factory ERP</h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sargodha Road, Gujranwala, Pakistan</p>
          </div>
          <div className="text-right">
            <h2 className="font-display font-extrabold text-slate-800 text-xs">OFFICIAL ERP STATEMENT</h2>
            <p className="text-[9px] text-slate-400 font-mono mt-1">Generated: {today}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display font-black text-slate-800 text-base uppercase tracking-wider">Factory Executive Report</h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {reportRange.label}: <span className="font-mono text-slate-700">{reportRange.start}</span> to <span className="font-mono text-slate-700">{reportRange.end}</span>
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
            Export Code: ERP-FULL
          </span>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">Revenue</p>
            <p className="font-mono text-sm font-extrabold text-emerald-700 mt-1">{formatCurrency(revenue)}</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">Net Profit</p>
            <p className="font-mono text-sm font-extrabold text-emerald-700 mt-1">{formatCurrency(netProfit)}</p>
          </div>
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-lg">
            <p className="text-[9px] text-violet-800 font-bold uppercase tracking-wider">Profit per Plate</p>
            <p className="font-mono text-sm font-extrabold text-violet-700 mt-1">{formatCurrency(profitPerPlate)}</p>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
            <p className="text-[9px] text-rose-800 font-bold uppercase tracking-wider">Stock Cost Used</p>
            <p className="font-mono text-sm font-extrabold text-rose-700 mt-1">{formatCurrency(totalStockUsedCost)}</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-[9px] text-amber-800 font-bold uppercase tracking-wider">Total Expenses</p>
            <p className="font-mono text-sm font-extrabold text-amber-700 mt-1">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-[9px] text-indigo-800 font-bold uppercase tracking-wider">Labour Cost</p>
            <p className="font-mono text-sm font-extrabold text-indigo-700 mt-1">{formatCurrency(labourCost)}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-[9px] text-blue-800 font-bold uppercase tracking-wider">Labour / Plate</p>
            <p className="font-mono text-sm font-extrabold text-blue-700 mt-1">{formatCurrency(labourCostPerPlate)}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <p className="text-[9px] text-slate-800 font-bold uppercase tracking-wider">Waste & Defects</p>
            <p className="font-mono text-sm font-extrabold text-slate-700 mt-1">{totalWasteQty.toLocaleString()} pcs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={16} className="text-emerald-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">T Cross Summary</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {tCrossByType.map((item) => <div key={item.id} className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400 uppercase">{item.name} Remaining</p><p className="font-mono font-bold text-slate-800 mt-1">{item.quantity.toLocaleString()} {item.unit}</p><p className="text-slate-400 mt-1">Sold: {item.sold.toLocaleString()} {item.unit}</p><p className="text-slate-700 mt-1">Revenue: {formatCurrency(item.revenue)}</p></div>)}
              <div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400 uppercase">T Cross Total</p><p className="font-mono font-bold text-slate-800 mt-1">{tCrossRemaining.toLocaleString()} ft remaining</p><p className="text-slate-400 mt-1">Sold: {tCrossSalesFeet.toLocaleString()} ft</p><p className="text-slate-700 mt-1">Revenue: {formatCurrency(tCrossRevenue)}</p><p className="text-slate-700 mt-1">Profit: {formatCurrency(tCrossProfit)}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3"><Layers size={16} className="text-orange-600" /><h3 className="font-display font-bold text-slate-800 text-sm">Wall Angle Summary</h3></div>
            <div className="grid grid-cols-2 gap-3 text-xs"><div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400 uppercase">Remaining Wall Angle</p><p className="font-mono font-bold text-slate-800 mt-1">{wallAngleRemaining.toLocaleString()} pieces</p></div><div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400 uppercase">Pieces Sold</p><p className="font-mono font-bold text-slate-800 mt-1">{wallAngleSales.toLocaleString()} pieces</p></div><div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400 uppercase">Revenue</p><p className="font-mono font-bold text-slate-800 mt-1">{formatCurrency(wallAngleRevenue)}</p></div><div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400 uppercase">Stock Cost Used</p><p className="font-mono font-bold text-slate-800 mt-1">{formatCurrency(wallAngleStockUsedCost)}</p></div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileBarChart2 size={16} className="text-indigo-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Sales & Revenue</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Units Sold</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{salesQty.toLocaleString()} pcs</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Gross Sales</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{formatCurrency(salesGross)}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Discounts</p>
                <p className="font-mono font-bold text-red-600 mt-1">{formatCurrency(discounts)}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Revenue</p>
                <p className="font-mono font-bold text-emerald-700 mt-1">{formatCurrency(revenue)}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Net Revenue</p>
                <p className="font-mono font-bold text-emerald-700 mt-1">{formatCurrency(netRevenue)}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Profit / Plate</p>
                <p className="font-mono font-bold text-emerald-700 mt-1">{formatCurrency(profitPerPlate)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={16} className="text-indigo-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Labour Cost Breakdown</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Wet Production (18 Rs/plate)</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(labourCostWet)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Dry Production (18 Rs/plate)</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(labourCostDry)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Final Production (18 Rs/plate)</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(labourCostFinal)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 border border-indigo-100 mt-2">
                <span className="font-semibold text-indigo-700">Total Labour Cost</span>
                <span className="font-mono font-bold text-indigo-700">{formatCurrency(labourCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 border border-blue-100">
                <span className="font-semibold text-blue-700">Labour Cost per Plate</span>
                <span className="font-mono font-bold text-blue-700">{formatCurrency(labourCostPerPlate)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={16} className="text-emerald-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Production Cost Summary</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Stock/Material Used</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(totalStockUsedCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Labour (Wet+Dry+Final)</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(labourCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Operational Expenses</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-200 mt-2">
                <span className="font-semibold text-slate-700">Total Cost</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(totalStockUsedCost + labourCost + totalExpenses)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={16} className="text-rose-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Expense Ledger</h3>
            </div>
            <div className="space-y-2 text-xs">
              {Object.entries(expenseByCategory).length > 0 ? Object.entries(expenseByCategory).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{category}</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(amount)}</span>
                </div>
              )) : <p className="text-slate-400 text-center py-2">No expenses found.</p>}
              <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 border border-rose-100 mt-2">
                <span className="font-semibold text-rose-700">Total Expenses</span>
                <span className="font-mono font-bold text-rose-700">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Waste & Defects</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Total Waste</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{totalWasteQty.toLocaleString()} pcs</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Wet Stage Loss</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{wetLoss.toLocaleString()} pcs</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Dry Stage Loss</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{dryLoss.toLocaleString()} pcs</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Droplets size={16} className="text-blue-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Production Runs</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Wet</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{totalWetProduced.toLocaleString()} pcs</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Dry</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{totalDryProduced.toLocaleString()} pcs</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <p className="text-slate-400 uppercase">Final</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{totalFinalProduced.toLocaleString()} pcs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={16} className="text-red-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Accounts Receivables</h3>
            </div>
            <div className="space-y-2 text-xs">
              {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{customer.name}</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(getCustomerOutstandingBalance(customer.id))}</span>
                </div>
              )) : <p className="text-slate-400">No customer balances available.</p>}
              <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 mt-2">
                <span className="font-semibold text-red-700">Total Receivables</span>
                <span className="font-mono font-bold text-red-700">{formatCurrency(totalReceivables)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={16} className="text-violet-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Material Ledger</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Procurement Cost</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(procurementCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Stock Entries</span>
                <span className="font-mono font-bold text-slate-800">{filteredTxs.filter((t) => t.type === 'in').length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Material Deductions</span>
                <span className="font-mono font-bold text-slate-800">{filteredTxs.filter((t) => t.type === 'out').length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100 pt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2 text-right">Value</th>
                <th className="py-3 px-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {[...filteredSales.map((s) => ({ date: s.date, category: `Sale • ${s.invoiceNumber}`, value: s.grandTotal, notes: `${s.customerName} • ${s.quantity} pcs` })),
                ...filteredExpenses.map((e) => ({ date: e.date, category: `Expense • ${e.category}`, value: e.amount, notes: e.description })),
                ...filteredWaste.map((w) => ({ date: w.date, category: `Waste • ${w.source}`, value: w.quantity, notes: w.notes }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map((row, index) => (
                  <tr key={`${row.category}-${index}`} className="hover:bg-slate-50/20">
                    <td className="py-3 px-2 font-mono">{row.date}</td>
                    <td className="py-3 px-2">{row.category}</td>
                    <td className="py-3 px-2 text-right font-mono">{typeof row.value === 'number' && row.category.includes('Expense') ? formatCurrency(row.value) : typeof row.value === 'number' && row.category.includes('Sale') ? formatCurrency(row.value) : `${row.value.toLocaleString()} pcs`}</td>
                    <td className="py-3 px-2">{row.notes}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hidden print:flex print-footer-log pt-10 border-t border-slate-100 mt-12 justify-between items-center text-[9px] text-slate-400">
          <span>Printed from Prime Plate ERP System securely.</span>
          <span>Authorized signature: ______________________</span>
        </div>
      </div>
    </div>
  );
}
