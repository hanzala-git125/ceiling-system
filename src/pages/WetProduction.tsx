import React, { useState } from 'react';
import { Search, Trash2, Edit2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { db, getTodayStr, adjustMaterialStock, convertFormulaAmountToStock } from '../utils/api';
import { LabourLedgerEntry, Operator, WetProduction } from '../types';
import { AppLanguage } from '../utils/i18n';

interface WetProductionPageProps {
  language?: AppLanguage;
}

export default function WetProductionPage({ language = 'en' }: WetProductionPageProps) {
  const [records, setRecords] = useState<WetProduction[]>(db.getWetProduction());

  const [date, setDate] = useState(getTodayStr());
  const [produced, setProduced] = useState<number>(1000);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [notes, setNotes] = useState('');
  const [editingRecord, setEditingRecord] = useState<WetProduction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const operators = db.getOperators().filter((operator) => operator.stage === 'wet');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const getPlasterDeduction = (wetPlatesQty: number) => {
    const formulas = db.getFormulas();
    const plasterFormula = formulas.find((f) => f.materialName.toLowerCase().includes('plaster'));
    if (!plasterFormula) return null;

    const materials = db.getMaterials();
    const material = materials.find((m) => m.name.toLowerCase() === plasterFormula.materialName.toLowerCase());
    if (!material) return null;

    const converted = convertFormulaAmountToStock(plasterFormula.amount * wetPlatesQty, plasterFormula.unit, material);
    return {
      material,
      formulaName: plasterFormula.materialName,
      formulaAmount: plasterFormula.amount,
      formulaUnit: plasterFormula.unit,
      amount: Math.round(converted.amount * 1000) / 1000,
      unit: converted.unit,
    };
  };

  const restorePlasterDeduction = (record: WetProduction) => {
    if (!record.plasterParisUsed || record.plasterParisUsed <= 0) return;

    const deduction = getPlasterDeduction(record.wetPlatesProduced);
    if (!deduction) return;

    adjustMaterialStock(
      deduction.material.id,
      record.plasterParisUsed,
      'in',
      0,
      record.productionDate,
      `Restored wet production plaster deduction for record ${record.id}`
    );
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (produced <= 0) {
      setError('Molded plates count must be greater than zero.');
      return;
    }

    const deduction = getPlasterDeduction(produced);
    if (!deduction) {
      setError('Please define a Plaster Paris formula in Formula Settings and add matching stock in Inventory.');
      return;
    }

    // Check if we have sufficient plaster paris stock
    if (deduction.material.quantity < deduction.amount) {
      setError(`⚠️ Insufficient stock! This operation requires more stock. Need ${deduction.amount.toLocaleString()} ${deduction.unit} of ${deduction.formulaName}, but only ${deduction.material.quantity.toLocaleString()} ${deduction.unit} available. Stock is finished or not enough.`);
      return;
    }

    let newRecord: WetProduction;

    const referenceId = editingRecord ? editingRecord.id : 'wet_' + Math.random().toString(36).substr(2, 9);

    if (editingRecord) {
      restorePlasterDeduction(editingRecord);
      const updated = records.map((r) =>
        r.id === editingRecord.id
          ? {
              ...r,
              productionDate: date,
              wetPlatesProduced: produced,
              plasterParisUsed: deduction.amount,
              notes,
            }
          : r
      );
      db.saveWetProduction(updated);
      setRecords(updated);
      setEditingRecord(null);
      triggerToast('Wet batch record updated successfully.');
    } else {
      newRecord = {
        id: referenceId,
        productionDate: date,
        wetPlatesProduced: produced,
        plasterParisUsed: deduction.amount,
        notes: notes.trim(),
        createdAt: getTodayStr(),
      };
      const updated = [...records, newRecord];
      db.saveWetProduction(updated);
      setRecords(updated);
      triggerToast('Wet batch record created and logged.');
    }

    adjustMaterialStock(
      deduction.material.id,
      deduction.amount,
      'out',
      0,
      date,
      `Automated plaster deduction for wet production batch: ${produced} plates`
    );

    if (selectedOperatorId) {
      const operator = operators.find((item) => item.id === selectedOperatorId);
      if (operator) {
        const labourAmount = produced * operator.ratePerPlate;
        const ledger = db.getLabourLedger();
        const entry: LabourLedgerEntry = {
          id: 'labour_' + Math.random().toString(36).substr(2, 9),
          operatorId: operator.id,
          operatorName: operator.name,
          date,
          stage: 'wet',
          plates: produced,
          ratePerPlate: operator.ratePerPlate,
          amount: labourAmount,
          type: 'earning',
          referenceId,
          notes: `Wet production labour for ${produced} plates`,
          createdAt: getTodayStr(),
        };
        const updatedLedger = [...ledger, entry];
        db.saveLabourLedger(updatedLedger);
        const updatedOperators = db.getOperators().map((item) => item.id === operator.id ? { ...item, balanceDue: item.balanceDue + labourAmount } : item);
        db.saveOperators(updatedOperators);
      }
    }

    setProduced(1000);
    setNotes('');
  };

  const handleEditInit = (rec: WetProduction) => {
    setEditingRecord(rec);
    setDate(rec.productionDate);
    setProduced(rec.wetPlatesProduced);
    setNotes(rec.notes);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this wet production record?')) {
      const record = records.find((r) => r.id === id);
      if (record) {
        restorePlasterDeduction(record);
      }
      const updated = records.filter((r) => r.id !== id);
      db.saveWetProduction(updated);
      setRecords(updated);
      triggerToast('Wet production record deleted.');
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setProduced(1000);
    setNotes('');
  };

  const filteredRecords = records.filter((rec) => {
    return rec.productionDate.includes(searchQuery) || rec.notes.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const plasterPreview = getPlasterDeduction(produced);

  return (
    <div className="space-y-6">
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wet Plates Logged</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.reduce((sum, item) => sum + item.wetPlatesProduced, 0).toLocaleString()} pcs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plaster Used</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.reduce((sum, item) => sum + item.plasterParisUsed, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Batches Recorded</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.length}</p>
        </div>
      </div> */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-emerald-600 text-white rounded-xl border border-emerald-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <FileSpreadsheet size={16} />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-slate-800 text-sm mb-1">
            {editingRecord ? 'Modify Wet Plate Entry' : 'Log New Wet Plate Batch'}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mb-5">
            Record physical wet molding completions and direct bulk mix weights
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs font-medium">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSaveEntry} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Production Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Wet Plates Produced (pcs)</label>
              <input
                type="number"
                min="1"
                required
                  value={produced}
                  onChange={(e) => setProduced(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100/60 text-[11px] text-slate-600">
              <p className-="font-semibold uppercase tracking-wider text-[10px] text-slate-500 mb-1">Plaster deduction preview</p>
              {plasterPreview ? (
                <>
                  <p className="font-semibold text-slate-700">
                    Estimated deduction: {plasterPreview.amount.toLocaleString()} {plasterPreview.unit}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Formula source: {plasterPreview.formulaName} • {plasterPreview.formulaAmount} {plasterPreview.formulaUnit} / plate
                  </p>
                </>
              ) : (
                <p>No plaster formula or stock entry has been configured yet.</p>
              )}
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Operator</label>
              <select value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800">
                <option value="">-- Select wet operator --</option>
                {operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Operational Batch Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shift information, temperature fluctuations or general operational notes..."
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                {editingRecord ? 'Update Wet Batch' : 'Commit Wet Batch'}
              </button>
              {editingRecord && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Wet Molding Batch History</h3>
              <p className="text-[11px] text-slate-400 font-medium">Daily plaster molding logs and automatic stock deductions</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search by date (YYYY-MM-DD) or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Production Date</th>
                  <th className="py-3 px-2 text-right">Wet Plates Produced</th>
                  <th className="py-3 px-2 text-right">Plaster Deducted</th>
                  <th className="py-3 px-2">Batch Notes</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRecords.length > 0 ? (
                  [...filteredRecords].reverse().map((rec) => {
                    const recordPreview = getPlasterDeduction(rec.wetPlatesProduced);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 font-semibold text-slate-800 font-mono">{rec.productionDate}</td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                          {rec.wetPlatesProduced.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-600">
                          <div>
                            {rec.plasterParisUsed.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">bags</span>
                          </div>
                          {recordPreview && (
                            <div className="text-[9px] text-slate-400 mt-1">
                              Formula: {recordPreview.formulaAmount} {recordPreview.formulaUnit}/plate
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-500 max-w-37.5 truncate" title={rec.notes}>{rec.notes || '—'}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditInit(rec)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                              title="Edit entry"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete entry"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No wet production runs logged for selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
