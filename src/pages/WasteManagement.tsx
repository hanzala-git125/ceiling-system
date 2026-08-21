import React, { useState } from 'react';
import { Trash2, AlertTriangle, Search, Filter, Calendar, BarChart3, Plus, X, ArrowDownRight, CheckCircle } from 'lucide-react';
import { db, getTodayStr } from '../utils/api';
import { LabourLedgerEntry, WasteRecord } from '../types';
import { AppLanguage } from '../utils/i18n';

interface WasteManagementPageProps {
  language?: AppLanguage;
}

export default function WasteManagement({ language = 'en' }: WasteManagementPageProps) {
  const [records, setRecords] = useState<WasteRecord[]>(db.getWasteRecords());

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Manual entry modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDate, setManualDate] = useState(getTodayStr());
  const [manualQty, setManualQty] = useState(5);
  const [manualSource, setManualSource] = useState<'wet' | 'dry' | 'manual'>('manual');
  const [manualOperatorId, setManualOperatorId] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const operators = db.getOperators().filter((operator) => operator.stage === 'waste');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Calculations for waste stats
  const todayStr = getTodayStr();
  const currentMonthPrefix = todayStr.substring(0, 7); // e.g. "2026-06"

  const totalWasteToday = records
    .filter((w) => w.date === todayStr)
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalWasteThisMonth = records
    .filter((w) => w.date.startsWith(currentMonthPrefix))
    .reduce((sum, item) => sum + item.quantity, 0);

  const wasteBySource = records.reduce(
    (acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + item.quantity;
      return acc;
    },
    { wet: 0, dry: 0, manual: 0 } as Record<string, number>
  );

  const totalWasteAllTime = records.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddManualWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualQty <= 0) return;

    const newRecord: WasteRecord = {
      id: 'waste_man_' + Math.random().toString(36).substr(2, 9),
      date: manualDate,
      source: manualSource,
      quantity: manualQty,
      notes: manualNotes.trim() || 'Manual adjustment log',
      createdAt: getTodayStr(),
    };

    if (manualOperatorId) {
      const operator = operators.find((item) => item.id === manualOperatorId);
      if (operator) {
        const labourAmount = manualQty * operator.ratePerPlate;
        const ledger = db.getLabourLedger();
        const entry: LabourLedgerEntry = {
          id: 'labour_' + Math.random().toString(36).substr(2, 9),
          operatorId: operator.id,
          operatorName: operator.name,
          date: manualDate,
          stage: 'waste',
          plates: manualQty,
          ratePerPlate: operator.ratePerPlate,
          amount: labourAmount,
          type: 'earning',
          referenceId: newRecord.id,
          notes: `Waste handling labour for ${manualQty} pieces`,
          createdAt: getTodayStr(),
        };
        const updatedLedger = [...ledger, entry];
        db.saveLabourLedger(updatedLedger);
        const updatedOperators = db.getOperators().map((item) => item.id === operator.id ? { ...item, balanceDue: item.balanceDue + labourAmount } : item);
        db.saveOperators(updatedOperators);
      }
    }

    const updated = [...records, newRecord];
    db.saveWasteRecords(updated);
    setRecords(updated);

    // Reset Form
    setManualQty(5);
    setManualOperatorId('');
    setManualNotes('');
    setShowManualModal(false);
    triggerToast('Manual waste log added successfully.');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this waste record? If this was auto-generated from drying, we recommend managing it in dry entry instead.')) {
      const updated = records.filter((r) => r.id !== id);
      db.saveWasteRecords(updated);
      setRecords(updated);
      triggerToast('Waste record deleted.');
    }
  };

  // Filter list
  const filteredRecords = records.filter((rec) => {
    const matchesSearch = rec.date.includes(searchQuery) || rec.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === 'all' ? true : rec.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-indigo-600 text-white rounded-xl border border-indigo-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Aggregate Statistics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat: Today's Total */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Breakage Today</p>
            <h3 className="font-display font-bold text-slate-800 text-lg leading-tight mt-0.5">
              {totalWasteToday.toLocaleString()} <span className="text-xs font-normal text-slate-400">pcs</span>
            </h3>
          </div>
        </div>

        {/* Stat: Month's Total */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Monthly Defect Sum</p>
            <h3 className="font-display font-bold text-slate-800 text-lg leading-tight mt-0.5">
              {totalWasteThisMonth.toLocaleString()} <span className="text-xs font-normal text-slate-400">pcs</span>
            </h3>
          </div>
        </div>

        {/* Stat: Cumulative Total */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <BarChart3 size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cumulative Defect Rate</p>
            <h3 className="font-display font-bold text-slate-800 text-lg leading-tight mt-0.5">
              {totalWasteAllTime.toLocaleString()} <span className="text-xs font-normal text-slate-400">pcs</span>
            </h3>
          </div>
        </div>

        {/* Breakdown Panel */}
        <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col justify-center text-[11px] text-slate-500 font-medium">
          <div className="flex items-center justify-between">
            <span>Wet Section Breakage:</span>
            <span className="font-mono font-bold text-slate-700">{wasteBySource.wet} pcs</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>Drying Chamber Losses:</span>
            <span className="font-mono font-bold text-slate-700">{wasteBySource.dry} pcs</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>Manual Corrections:</span>
            <span className="font-mono font-bold text-slate-700">{wasteBySource.manual} pcs</span>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-50 pb-4">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Defects &amp; Breakage Ledger</h3>
            <p className="text-[11px] text-slate-400 font-medium">Detailed tracking for audit compliance and process monitoring</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute inset-y-0 left-2.5 my-auto text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search by date/memo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-800 w-full sm:w-48 focus:bg-white transition-all"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-700"
            >
              <option value="all">All Breakage Sources</option>
              <option value="wet">Wet Molding Section</option>
              <option value="dry">Dry Chamber Section</option>
              <option value="manual">Manual Adjustments</option>
            </select>

            <button
              onClick={() => setShowManualModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus size={14} />
              Manual Correction Log
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Log Date</th>
                <th className="py-3 px-2">Damage Source</th>
                <th className="py-3 px-2 text-right">Quantity Defective</th>
                <th className="py-3 px-2">Damage Memo / Incident Detail</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.length > 0 ? (
                [...filteredRecords].reverse().map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-slate-800 font-mono">
                      {rec.date}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                        rec.source === 'wet'
                          ? 'bg-blue-50 border-blue-100 text-blue-700'
                          : rec.source === 'dry'
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        {rec.source}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-red-600">
                      {rec.quantity.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                    </td>
                    <td className="py-3 px-2 text-slate-500 max-w-sm truncate" title={rec.notes}>
                      {rec.notes}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete log entry"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No matching waste records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Manual Waste Adjust */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">Log Manual Defect Breakage</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddManualWaste} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Incident Date</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Quantity (pcs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={manualQty || ''}
                    onChange={(e) => setManualQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Source Section</label>
                  <select
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="wet">Wet Molding</option>
                    <option value="dry">Dry Chambers</option>
                    <option value="manual">Manual Adjustment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Damage Incident Notes</label>
                <textarea
                  rows={3}
                  required
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Broken during packing crate transport, or warehouse moisture leakage..."
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                Save Incident Log
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
