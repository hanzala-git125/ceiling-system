import React, { useState } from 'react';
import { Receipt, Search, Plus, Trash2, Edit2, AlertCircle, CheckCircle, Calculator, X } from 'lucide-react';
import { db, getTodayStr } from '../utils/api';
import { Expense, FinalProduction } from '../types';
import { AppLanguage } from '../utils/i18n';

interface ExpensesPageProps {
  language?: AppLanguage;
}

export default function ExpensesPage({ language = 'en' }: ExpensesPageProps) {
  const [expenses, setExpenses] = useState<Expense[]>(db.getExpenses());
  const [finalProd] = useState<FinalProduction[]>(db.getFinalProduction());

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal and form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [date, setDate] = useState(getTodayStr());
  const [category, setCategory] = useState<Expense['category']>('Other');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  // Special Labour Formula state
  const [isLabourFormula, setIsLabourFormula] = useState(false);
  const [selectedProductionId, setSelectedProductionId] = useState('');
  const [customPlatesCount, setCustomPlatesCount] = useState<number>(1000);

  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Run labour cost calculator
  const applyLabourFormula = (plates: number) => {
    const computedAmount = plates * 18;
    setAmount(computedAmount);
    setDescription(`Labour Cost for production of ${plates} plates @ Rs.18 per plate.`);
  };

  const handleCategoryChange = (cat: Expense['category']) => {
    setCategory(cat);
    if (cat === 'Labour') {
      setIsLabourFormula(true);
      // Auto-select latest final production if available
      if (finalProd.length > 0) {
        const latest = [...finalProd].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        setSelectedProductionId(latest.id);
        applyLabourFormula(latest.finalPlatesProduced);
      } else {
        applyLabourFormula(customPlatesCount);
      }
    } else {
      setIsLabourFormula(false);
    }
  };

  const handleProductionSelect = (prodId: string) => {
    setSelectedProductionId(prodId);
    if (prodId === 'custom') {
      applyLabourFormula(customPlatesCount);
    } else {
      const prod = finalProd.find((f) => f.id === prodId);
      if (prod) {
        applyLabourFormula(prod.finalPlatesProduced);
      }
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (amount <= 0) {
      setError('Expense amount must be greater than zero Rupees.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide an expense description.');
      return;
    }

    if (editingExpense) {
      // Editing
      const updated = expenses.map((exp) =>
        exp.id === editingExpense.id
          ? {
              ...exp,
              date,
              category,
              amount,
              description: description.trim(),
            }
          : exp
      );
      db.saveExpenses(updated);
      setExpenses(updated);
      setEditingExpense(null);
      triggerToast('Expense item modified.');
    } else {
      // Adding new
      const newExp: Expense = {
        id: 'exp_' + Math.random().toString(36).substr(2, 9),
        date,
        category,
        amount,
        description: description.trim(),
        isLabourFormula: category === 'Labour' && isLabourFormula,
        finalPlatesCount: category === 'Labour' ? (selectedProductionId === 'custom' ? customPlatesCount : finalProd.find(f => f.id === selectedProductionId)?.finalPlatesProduced) : undefined,
        createdAt: getTodayStr(),
      };

      const updated = [...expenses, newExp];
      db.saveExpenses(updated);
      setExpenses(updated);
      triggerToast('Expense item successfully recorded.');
    }

    // Reset Form
    setShowAddModal(false);
    setDate(getTodayStr());
    setCategory('Other');
    setAmount(0);
    setDescription('');
    setIsLabourFormula(false);
  };

  const handleEditInit = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDescription(exp.description);
    setIsLabourFormula(exp.isLabourFormula || false);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      const updated = expenses.filter((e) => e.id !== id);
      db.saveExpenses(updated);
      setExpenses(updated);
      triggerToast('Expense item deleted.');
    }
  };

  // Filter list
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || exp.date.includes(searchQuery);
    const matchesCategory = categoryFilter === 'all' ? true : exp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-indigo-600 text-white rounded-xl border border-indigo-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Expense Controls Panel */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search expenses by memo or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-800 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-700"
          >
            <option value="all">All Expense Categories</option>
            <option value="Gas">Gas Utilities</option>
            <option value="Electricity">Electricity Utilities</option>
            <option value="Labour">Labour Payroll</option>
            <option value="Transport">Transport Freight</option>
            <option value="Other">Other Expenses</option>
          </select>
        </div>

        <button
          onClick={() => {
            setEditingExpense(null);
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          Record New Expense
        </button>
      </div>

      {/* Expenses History List */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Disbursements &amp; Expense Ledger</h3>
            <p className="text-[11px] text-slate-400 font-medium">Record of operational bills, freights and factory wages</p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded">
            Total recorded: Rs. {Math.round(filteredExpenses.reduce((sum, item) => sum + item.amount, 0)).toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Disbursement Date</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Amount Paid</th>
                <th className="py-3 px-2">Expense Description Memo</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredExpenses.length > 0 ? (
                [...filteredExpenses].reverse().map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-slate-800 font-mono">
                      {exp.date}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        exp.category === 'Labour'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : exp.category === 'Gas' || exp.category === 'Electricity'
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : exp.category === 'Transport'
                          ? 'bg-blue-50 border-blue-100 text-blue-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono font-bold text-slate-800">
                      Rs. {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-slate-500 max-w-sm truncate" title={exp.description}>
                      {exp.description}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditInit(exp)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No expense records found matching selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXPENSE LOG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">
                {editingExpense ? 'Modify Expense Item' : 'Record New Expense Item'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs font-medium">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="Electricity">Electricity Utility</option>
                    <option value="Gas">Gas Utility</option>
                    <option value="Labour">Labour Wages</option>
                    <option value="Transport">Transport Freight</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>
              </div>

              {/* Special Labour formula helper */}
              {category === 'Labour' && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <Calculator size={14} /> Labour Wages Calculator
                    </span>
                    <label className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={isLabourFormula}
                        onChange={(e) => {
                          setIsLabourFormula(e.target.checked);
                          if (!e.target.checked) setAmount(0);
                        }}
                      />
                      Use Production Formula
                    </label>
                  </div>

                  {isLabourFormula && (
                    <div className="space-y-2 text-[11px]">
                      <div>
                        <label className="block text-emerald-700 font-semibold mb-1">Select Final Production Run</label>
                        <select
                          value={selectedProductionId}
                          onChange={(e) => handleProductionSelect(e.target.value)}
                          className="w-full px-2 py-1.5 border border-emerald-200 rounded-md bg-white text-slate-700"
                        >
                          {finalProd.map((fp) => (
                            <option key={fp.id} value={fp.id}>
                              Date: {fp.date} ({fp.finalPlatesProduced} plates assembled)
                            </option>
                          ))}
                          <option value="custom">Enter manual plates count...</option>
                        </select>
                      </div>

                      {selectedProductionId === 'custom' && (
                        <div>
                          <label className="block text-emerald-700 font-semibold mb-1">Manually Entered Plates Count</label>
                          <input
                            type="number"
                            min="1"
                            value={customPlatesCount}
                            onChange={(e) => {
                              const count = parseFloat(e.target.value) || 0;
                              setCustomPlatesCount(count);
                              applyLabourFormula(count);
                            }}
                            className="w-full px-2.5 py-1 border border-emerald-200 rounded-md bg-white font-mono font-bold text-slate-800"
                          />
                        </div>
                      )}
                      <p className="text-[10px] text-emerald-600 font-semibold">
                        Formula applied: <span className="font-bold">Total Plates × Rs. 18</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Amount (Rupees / Rs)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Expense Description / Notes</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Electric meter bill month of June 2026"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer shadow-sm"
              >
                {editingExpense ? 'Save Changes' : 'Record Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
