import React, { useEffect, useState } from 'react';
import { Sun, ArrowRight, Search, Trash2, Edit2, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import { db, getTodayStr, convertFormulaAmountToStock, refreshPanniTypesFromApi } from '../utils/api';
import { DryProduction, LabourLedgerEntry, PanniType, RawMaterial, WasteRecord } from '../types';
import { AppLanguage } from '../utils/i18n';

interface DryProductionPageProps {
  language?: AppLanguage;
}

export default function DryProductionPage({ language = 'en' }: DryProductionPageProps) {
  const [records, setRecords] = useState<DryProduction[]>(db.getDryProduction());
  const [formulas] = useState(db.getFormulas());
  const [panniTypes, setPanniTypes] = useState<PanniType[]>(db.getPanniTypes());
  const [selectedPanniTypeId, setSelectedPanniTypeId] = useState('');
  const latestWetProduction = [...db.getWetProduction()]
    .sort((a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime())[0];

  // Form states
  const [date, setDate] = useState(getTodayStr());
  const [received, setReceived] = useState<number>(latestWetProduction?.wetPlatesProduced ?? 1000);
  const [produced, setProduced] = useState<number>(980);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');

  useEffect(() => {
    if (latestWetProduction) {
      setReceived(latestWetProduction.wetPlatesProduced);
    }
  }, [latestWetProduction?.id]);

  useEffect(() => {
    void refreshPanniTypesFromApi().then((existingPanniTypes) => {
      setPanniTypes(existingPanniTypes);
      if (existingPanniTypes.length > 0) {
        setSelectedPanniTypeId((currentId) => currentId || existingPanniTypes[0].id);
      }
    });
  }, []);

  const [notes, setNotes] = useState('');

  // Editing state
  const [editingRecord, setEditingRecord] = useState<DryProduction | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const operators = db.getOperators().filter((operator) => operator.stage === 'dry');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Dry entry math helper
  const wastePlatesCalculated = Math.max(0, received - produced);

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (received <= 0) {
      setError('Wet plates received must be greater than zero.');
      return;
    }
    if (produced <= 0) {
      setError('Dry plates produced must be greater than zero.');
      return;
    }
    if (produced > received) {
      setError('Dry plates produced cannot exceed the number of wet plates received.');
      return;
    }

    const panniFormulas = formulas.filter((form) => form.materialName.toLowerCase().includes('panni'));
    const updatedPanniTypes = db.getPanniTypes().map((item) => ({ ...item }));
    (editingRecord?.panniConsumptions || []).forEach((consumption) => {
      const previousType = updatedPanniTypes.find((item) => item.id === consumption.panniTypeId);
      if (previousType) previousType.quantity += consumption.calculatedAmount;
    });

    const selectedPanniType = updatedPanniTypes.find((item) => item.id === selectedPanniTypeId);
    if (panniFormulas.length > 0 && !selectedPanniType) {
      setError('Please select a panni type before saving this dry production batch.');
      return;
    }

    const panniConsumptions = selectedPanniType
      ? panniFormulas.map((form) => {
          const amountNeeded = form.amount * produced;
          const panniMaterial: RawMaterial = {
            id: selectedPanniType.id,
            name: selectedPanniType.name,
            quantity: selectedPanniType.quantity,
            unit: selectedPanniType.unit,
            costPerUnit: selectedPanniType.costPerUnit,
            minThreshold: selectedPanniType.minThreshold,
            conversionFactor: selectedPanniType.conversionFactor,
            updatedAt: getTodayStr(),
          };
          const converted = convertFormulaAmountToStock(amountNeeded, form.unit, panniMaterial);
          return {
            materialName: form.materialName,
            calculatedAmount: Math.round(converted.amount * 1000) / 1000,
            unit: converted.unit,
            panniTypeId: selectedPanniType.id,
          };
        })
      : [];

    const requiredPanniStock = panniConsumptions.reduce((sum, consumption) => sum + consumption.calculatedAmount, 0);
    if (selectedPanniType && selectedPanniType.quantity < requiredPanniStock) {
      setError(`Insufficient ${selectedPanniType.name} stock. Need ${requiredPanniStock.toLocaleString()} ${selectedPanniType.unit}, have ${selectedPanniType.quantity.toLocaleString()} ${selectedPanniType.unit}.`);
      return;
    }
    if (selectedPanniType) selectedPanniType.quantity -= requiredPanniStock;

    const calculatedWaste = received - produced;
    const activeId = editingRecord ? editingRecord.id : 'dry_' + Math.random().toString(36).substr(2, 9);

    const updatedRecord: DryProduction = {
      id: activeId,
      date,
      wetPlatesReceived: received,
      dryPlatesProduced: produced,
      wastePlates: calculatedWaste,
      notes: notes.trim(),
      panniTypeId: selectedPanniType?.id,
      panniType: selectedPanniType?.name,
      panniConsumptions,
      createdAt: editingRecord ? editingRecord.createdAt : getTodayStr(),
    };

    if (editingRecord?.panniConsumptions?.length || panniConsumptions.length > 0) {
      db.savePanniTypes(updatedPanniTypes);
      setPanniTypes(updatedPanniTypes);
    }

    // Save Dry production
    let newDryRecords: DryProduction[];
    if (editingRecord) {
      newDryRecords = records.map((r) => (r.id === activeId ? updatedRecord : r));
    } else {
      newDryRecords = [...records, updatedRecord];
    }
    db.saveDryProduction(newDryRecords);
    setRecords(newDryRecords);

    // Cascading updates to waste record
    const wasteRecords = db.getWasteRecords();
    const existingWasteIndex = wasteRecords.findIndex((w) => w.id === 'waste_' + activeId);

    if (calculatedWaste > 0) {
      const updatedWaste: WasteRecord = {
        id: 'waste_' + activeId,
        date,
        source: 'dry',
        quantity: calculatedWaste,
        notes: `Breakage during drying. Dry Entry Ref: ${activeId}. ${notes.trim()}`,
        createdAt: getTodayStr(),
      };

      if (existingWasteIndex !== -1) {
        wasteRecords[existingWasteIndex] = updatedWaste;
      } else {
        wasteRecords.push(updatedWaste);
      }
    } else {
      // If waste became 0, delete any existing corresponding waste record
      if (existingWasteIndex !== -1) {
        wasteRecords.splice(existingWasteIndex, 1);
      }
    }
    db.saveWasteRecords(wasteRecords);

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
          stage: 'dry',
          plates: produced,
          ratePerPlate: operator.ratePerPlate,
          amount: labourAmount,
          type: 'earning',
          referenceId: activeId,
          notes: `Dry production labour for ${produced} plates`,
          createdAt: getTodayStr(),
        };
        const updatedLedger = [...ledger, entry];
        db.saveLabourLedger(updatedLedger);
        const updatedOperators = db.getOperators().map((item) => item.id === operator.id ? { ...item, balanceDue: item.balanceDue + labourAmount } : item);
        db.saveOperators(updatedOperators);
      }
    }

    // Reset Form
    setReceived(1000);
    setProduced(980);
    setNotes('');
    setEditingRecord(null);
    triggerToast(editingRecord ? 'Dry production record updated.' : 'Dry production record committed.');
  };

  const handleEditInit = (rec: DryProduction) => {
    setEditingRecord(rec);
    setDate(rec.date);
    setReceived(rec.wetPlatesReceived);
    setProduced(rec.dryPlatesProduced);
    setSelectedPanniTypeId(rec.panniTypeId || '');
    setNotes(rec.notes || '');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this dry production run? Associated waste tracking will also be cleaned.')) {
      const deletedRecord = records.find((record) => record.id === id);
      const updatedPanniTypes = db.getPanniTypes().map((item) => ({ ...item }));
      (deletedRecord?.panniConsumptions || []).forEach((consumption) => {
        const panniType = updatedPanniTypes.find((item) => item.id === consumption.panniTypeId);
        if (panniType) panniType.quantity += consumption.calculatedAmount;
      });
      if (deletedRecord?.panniConsumptions?.length) {
        db.savePanniTypes(updatedPanniTypes);
        setPanniTypes(updatedPanniTypes);
      }

      const updatedDry = records.filter((r) => r.id !== id);
      db.saveDryProduction(updatedDry);
      setRecords(updatedDry);

      // Cascading waste delete
      const updatedWaste = db.getWasteRecords().filter((w) => w.id !== 'waste_' + id);
      db.saveWasteRecords(updatedWaste);

      triggerToast('Dry production and related waste record deleted.');
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setReceived(1000);
    setProduced(980);
    setNotes('');
  };

  // Filter records
  const filteredRecords = records.filter((rec) => {
    return rec.date.includes(searchQuery) || (rec.notes && rec.notes.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dry Plates Produced</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.reduce((sum, item) => sum + item.dryPlatesProduced, 0).toLocaleString()} pcs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wet Plates Received</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.reduce((sum, item) => sum + item.wetPlatesReceived, 0).toLocaleString()} pcs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waste Recorded</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.reduce((sum, item) => sum + item.wastePlates, 0).toLocaleString()} pcs</p>
        </div>
      </div> */}
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-emerald-600 text-white rounded-xl border border-emerald-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <FileSpreadsheet size={16} />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-slate-800 text-sm mb-1">
            {editingRecord ? 'Modify Dry Plate Entry' : 'Log Dry Chamber Batch'}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mb-5">
            Log transfer of wet plates into hot drying chambers and record final outputs
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs font-medium">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSaveEntry} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Processing Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Wet Received (pcs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={received}
                  onChange={(e) => setReceived(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Dry Produced (pcs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={produced}
                  onChange={(e) => setProduced(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                />
              </div>
            </div>

            {/* Live calculated waste display */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100/60 flex items-center justify-between font-sans">
              <span className="font-semibold text-slate-500">Auto calculated Waste:</span>
              <span className={`font-mono font-extrabold text-sm ${wastePlatesCalculated > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {wastePlatesCalculated} pieces
              </span>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Panni Type</label>
              <select
                value={selectedPanniTypeId}
                onChange={(e) => setSelectedPanniTypeId(e.target.value)}
                required={formulas.some((form) => form.materialName.toLowerCase().includes('panni'))}
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
              >
                <option value="">-- Select panni type --</option>
                {panniTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Panni stock is recorded against dry output using the active formula.</p>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Operator</label>
              <select value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800">
                <option value="">-- Select dry operator --</option>
                {operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Chamber / Operational Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Heaters temperature, air-flow issues or breakage notes..."
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                {editingRecord ? 'Update Dry Record' : 'Commit Dry Record'}
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

        {/* History Stream */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Dry Chamber Batch History</h3>
              <p className="text-[11px] text-slate-400 font-medium">Monitoring of hot drying results and shrinkage breakage</p>
            </div>
            {/* Search Date */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search by date (YYYY-MM-DD)..."
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
                  <th className="py-3 px-2">Processing Date</th>
                  <th className="py-3 px-2 text-right">Wet Received</th>
                  <th className="py-3 px-2 text-right">Dry Produced</th>
                  <th className="py-3 px-2 text-right">Breakage Waste</th>
                  <th className="py-3 px-2">Panni Type</th>
                  <th className="py-3 px-2">Operator Notes</th>
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
                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-600">
                        {rec.wetPlatesReceived.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                        {rec.dryPlatesProduced.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        <span className={`font-extrabold ${rec.wastePlates > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {rec.wastePlates.toLocaleString()}
                        </span>{' '}
                        <span className="text-[10px] font-normal text-slate-400">pcs</span>
                      </td>
                      <td className="py-3 px-2 text-slate-600">
                        {rec.panniType || '—'}
                        {rec.panniConsumptions?.map((consumption, index) => (
                          <span key={`${consumption.panniTypeId}-${index}`} className="block text-[10px] text-slate-400">
                            {consumption.calculatedAmount.toLocaleString()} {consumption.unit}
                          </span>
                        ))}
                      </td>
                      <td className="py-3 px-2 text-slate-500 max-w-37.5 truncate" title={rec.notes}>
                        {rec.notes || '—'}
                      </td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No drying records found for selected filter.
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
