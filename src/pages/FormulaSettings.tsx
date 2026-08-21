import React, { useState } from 'react';
import { Settings, Save, RotateCcw, HelpCircle, FileText, CheckCircle, Plus, X } from 'lucide-react';
import { db, getTodayStr } from '../utils/api';
import { Formula, FormulaHistory } from '../types';
import { AppLanguage, getLanguageText } from '../utils/i18n';

interface FormulaSettingsProps {
  language?: AppLanguage;
}

export default function FormulaSettings({ language = 'en' }: FormulaSettingsProps) {
  const [formulas, setFormulas] = useState<Formula[]>(db.getFormulas());
  const [history, setHistory] = useState<FormulaHistory[]>(db.getFormulaHistory());

  // Editing state for inline list
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number>(0);

  // New Formula creation state
  const [showAddFormula, setShowAddFormula] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newAmount, setNewAmount] = useState(1);
  const [newUnit, setNewUnit] = useState('g');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Update a specific material's formula amount
  const handleSaveFormula = (formula: Formula) => {
    if (editingAmount <= 0) {
      triggerToast('Consumption amount must be greater than zero.');
      return;
    }

    const oldAmount = formula.amount;
    const newFormulas = formulas.map((f) =>
      f.id === formula.id ? { ...f, amount: editingAmount, updatedAt: getTodayStr() } : f
    );

    db.saveFormulas(newFormulas);
    setFormulas(newFormulas);

    // Save history log
    const hist = db.getFormulaHistory();
    const log: FormulaHistory = {
      id: 'fh_' + Math.random().toString(36).substr(2, 9),
      formulaId: formula.id,
      materialName: formula.materialName,
      oldAmount,
      newAmount: editingAmount,
      unit: formula.unit,
      changedBy: 'Admin',
      date: getTodayStr()
    };
    hist.push(log);
    db.saveFormulaHistory(hist);
    setHistory(hist);

    setEditingFormulaId(null);
    triggerToast(`Formula for ${formula.materialName} updated successfully.`);
  };

  // Add a brand new material formula
  const handleAddFormulaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;

    if (formulas.some((f) => f.materialName.toLowerCase() === newMaterialName.trim().toLowerCase())) {
      triggerToast('A formula for this material already exists.');
      return;
    }

    const newFormula: Formula = {
      id: 'f_' + Math.random().toString(36).substr(2, 9),
      materialName: newMaterialName.trim(),
      amount: newAmount,
      unit: newUnit,
      updatedAt: getTodayStr()
    };

    const updated = [...formulas, newFormula];
    db.saveFormulas(updated);
    setFormulas(updated);

    // Log to history
    const hist = db.getFormulaHistory();
    const log: FormulaHistory = {
      id: 'fh_' + Math.random().toString(36).substr(2, 9),
      formulaId: newFormula.id,
      materialName: newFormula.materialName,
      oldAmount: 0,
      newAmount,
      unit: newUnit,
      changedBy: 'Admin',
      date: getTodayStr()
    };
    hist.push(log);
    db.saveFormulaHistory(hist);
    setHistory(hist);

    // Reset
    setNewMaterialName('');
    setNewAmount(1);
    setNewUnit('g');
    setShowAddFormula(false);
    triggerToast(`Formula for ${newFormula.materialName} added.`);
  };

  // Reset all formulas to standard default
  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to restore default factory formulas? This will overwrite your current settings.')) {
      const defaultFormulas: Formula[] = [
        { id: '1', materialName: 'Plaster Paris', amount: 25, unit: 'kg', updatedAt: getTodayStr() },
        { id: '2', materialName: 'Maia', amount: 84.0, unit: 'g', updatedAt: getTodayStr() },
        { id: '3', materialName: 'PVC Glue', amount: 2.0, unit: 'g', updatedAt: getTodayStr() },
        { id: '4', materialName: 'PVA Glue', amount: 0.33, unit: 'g', updatedAt: getTodayStr() },
        { id: '5', materialName: 'Tape', amount: 8.5, unit: 'feet', updatedAt: getTodayStr() },
        { id: '6', materialName: 'Brown Paper', amount: 1.0, unit: 'pieces', updatedAt: getTodayStr() },
        { id: '7', materialName: 'HD Paper', amount: 1.0, unit: 'pieces', updatedAt: getTodayStr() },
        { id: '8', materialName: 'Panni', amount: 1.0, unit: 'pieces', updatedAt: getTodayStr() },
        { id: '9', materialName: 'Packing Shopper', amount: 0.1, unit: 'pieces', updatedAt: getTodayStr() },
      ];
      db.saveFormulas(defaultFormulas);
      setFormulas(defaultFormulas);
      triggerToast('Factory default formulas restored.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-indigo-600 text-white rounded-xl border border-indigo-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-xl p-4 flex gap-3 text-xs text-indigo-900">
        <HelpCircle className="text-indigo-600 mt-0.5 shrink-0" size={16} />
        <div>
          <h4 className="font-bold text-slate-800">Dynamic Production Calculations</h4>
          <p className="text-indigo-600 mt-1 font-medium leading-relaxed">
            The formulas below determine the exact amount of raw materials required to produce **one single final manufactured plate**. 
            When Final Production is recorded, the system will dynamically query these values to calculate total consumption, deduct stock, and log audit details automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulas List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Active Material Formulas</h3>
              <p className="text-[11px] text-slate-400 font-medium">Consumption formula per 1 unit plate produced</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddFormula(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={12} />
                {getLanguageText(language, 'addFormula')}
              </button>
              <button
                onClick={handleResetToDefaults}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={12} />
                {getLanguageText(language, 'resetDefaults')}
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {formulas.map((f) => {
              const isEditing = editingFormulaId === f.id;
              return (
                <div key={f.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800">{f.materialName}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Last updated: {f.updatedAt}</p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={editingAmount || ''}
                          onChange={(e) => setEditingAmount(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 text-xs border border-indigo-200 rounded-lg bg-indigo-50/20 text-slate-800 font-mono font-bold"
                        />
                        <span className="text-xs font-bold text-slate-400">{f.unit}</span>
                        <button
                          onClick={() => handleSaveFormula(f)}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingFormulaId(null)}
                          className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold font-mono text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                          {f.amount} {f.unit} <span className="text-[10px] font-normal text-slate-400">/ plate</span>
                        </span>
                        <button
                          onClick={() => {
                            setEditingFormulaId(f.id);
                            setEditingAmount(f.amount);
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Modify
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Change Log History */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-indigo-600" />
            <h3 className="font-display font-bold text-slate-800 text-sm">Formula Change Audit</h3>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {history.length > 0 ? (
              [...history]
                .reverse()
                .map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-800">{log.materialName}</span>
                      <span className="font-mono text-slate-400">{log.date}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-slate-500">
                      <span>Was: <span className="font-mono text-slate-700">{log.oldAmount} {log.unit}</span></span>
                      <span className="text-slate-300">→</span>
                      <span>Now: <span className="font-mono text-indigo-700 font-bold">{log.newAmount} {log.unit}</span></span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium mt-1">Authorized by: {log.changedBy}</p>
                  </div>
                ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-8">No formula changes logged yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Add New Formula */}
      {showAddFormula && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">Add Material Formula</h3>
              <button onClick={() => setShowAddFormula(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddFormulaSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Material Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemical Binder X"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Amount per Plate</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={newAmount || ''}
                    onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                  >
                    <option value="g">grams (g)</option>
                    <option value="pieces">pieces (pcs)</option>
                    <option value="feet">feet (ft)</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs uppercase tracking-wider cursor-pointer"
              >
                Add Formula Configuration
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
