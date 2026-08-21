import React, { useEffect, useState } from 'react';
import { CheckSquare, ArrowRight, Eye, Clipboard, Trash2, Edit2, AlertCircle, RefreshCw, CheckCircle, HelpCircle } from 'lucide-react';
import { db, getTodayStr, adjustMaterialStock, convertFormulaAmountToStock } from '../utils/api';
import { FinalProduction, Formula, LabourLedgerEntry, RawMaterial, InventoryTransaction, PanniType, HdPaperType } from '../types';
import { AppLanguage } from '../utils/i18n';

interface FinalProductionPageProps {
  language?: AppLanguage;
}

export default function FinalProductionPage({ language = 'en' }: FinalProductionPageProps) {
  const [records, setRecords] = useState<FinalProduction[]>(db.getFinalProduction());
  const [formulas] = useState<Formula[]>(db.getFormulas());
  const [materials, setMaterials] = useState<RawMaterial[]>(db.getMaterials());
  const [panniTypes, setPanniTypes] = useState<PanniType[]>(db.getPanniTypes());
  const [hdPaperTypes, setHdPaperTypes] = useState<HdPaperType[]>(db.getHdPaperTypes());
  const [selectedPanniTypeId, setSelectedPanniTypeId] = useState('');
  const [selectedHdPaperTypeId, setSelectedHdPaperTypeId] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const latestDryProduction = [...db.getDryProduction()]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Form states
  const [date, setDate] = useState(getTodayStr());
  const [dryReceived, setDryReceived] = useState<number>(latestDryProduction?.dryPlatesProduced ?? 1000);
  const [finalProduced, setFinalProduced] = useState<number>(950);

  useEffect(() => {
    if (latestDryProduction) {
      setDryReceived(latestDryProduction.dryPlatesProduced);
    }
  }, [latestDryProduction?.id]);

  useEffect(() => {
    const existingPanniTypes = db.getPanniTypes();
    setPanniTypes(existingPanniTypes);
    if (existingPanniTypes.length > 0 && !selectedPanniTypeId) {
      setSelectedPanniTypeId(existingPanniTypes[0].id);
    }

    const existingHdPaperTypes = db.getHdPaperTypes();
    setHdPaperTypes(existingHdPaperTypes);
    if (existingHdPaperTypes.length > 0 && !selectedHdPaperTypeId) {
      setSelectedHdPaperTypeId(existingHdPaperTypes[0].id);
    }
  }, []);

  const [notes, setNotes] = useState('');

  // Selected Record details view
  const [selectedRecord, setSelectedRecord] = useState<FinalProduction | null>(null);

  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const selectedPanniType = panniTypes.find((item) => item.id === selectedPanniTypeId) ?? null;
  const selectedHdPaperType = hdPaperTypes.find((item) => item.id === selectedHdPaperTypeId) ?? null;

  const operators = db.getOperators().filter((operator) => operator.stage === 'final');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Live Formula Consumption Preview Generator
  const getFormulaMaterial = (form: Formula) => {
    const normalizedName = form.materialName.toLowerCase();
    return materials.find((m) => m.name.toLowerCase() === normalizedName);
  };

  const getConsumptionPreview = (quantity: number) => {
    return formulas
      .filter((form) => !form.materialName.toLowerCase().includes('plaster'))
      .map((form) => {
        let amountNeeded = form.amount * quantity;
        let unitUsed = form.unit;
        let availableStock = 0;
        let hasEnough = false;
        let displayName = form.materialName;
        let panniTypeId: string | undefined;
        let hdPaperTypeId: string | undefined;

        const normalizedName = form.materialName.toLowerCase();
        if (normalizedName.includes('panni')) {
          const panniStock = selectedPanniType;
          if (panniStock) {
            const panniMaterial: RawMaterial = {
              id: panniStock.id,
              name: form.materialName,
              quantity: panniStock.quantity,
              unit: panniStock.unit,
              costPerUnit: panniStock.costPerUnit,
              minThreshold: panniStock.minThreshold,
              conversionFactor: panniStock.conversionFactor,
              updatedAt: getTodayStr(),
            };
            const converted = convertFormulaAmountToStock(amountNeeded, form.unit, panniMaterial);
            amountNeeded = converted.amount;
            unitUsed = converted.unit;
            availableStock = panniStock.quantity;
            hasEnough = panniStock.quantity >= amountNeeded;
            displayName = panniStock.name;
            panniTypeId = panniStock.id;
          }
        } else if (normalizedName.includes('hd paper')) {
          const hdPaperStock = selectedHdPaperType;
          if (hdPaperStock) {
            const hdPaperMaterial: RawMaterial = {
              id: hdPaperStock.id,
              name: form.materialName,
              quantity: hdPaperStock.quantity,
              unit: hdPaperStock.unit,
              costPerUnit: hdPaperStock.costPerUnit,
              minThreshold: hdPaperStock.minThreshold,
              conversionFactor: hdPaperStock.conversionFactor,
              updatedAt: getTodayStr(),
            };
            const converted = convertFormulaAmountToStock(amountNeeded, form.unit, hdPaperMaterial);
            amountNeeded = converted.amount;
            unitUsed = converted.unit;
            availableStock = hdPaperStock.quantity;
            hasEnough = hdPaperStock.quantity >= amountNeeded;
            displayName = hdPaperStock.name;
            hdPaperTypeId = hdPaperStock.id;
          }
        } else {
          const mat = getFormulaMaterial(form);
          if (mat) {
            const converted = convertFormulaAmountToStock(amountNeeded, form.unit, mat);
            amountNeeded = converted.amount;
            unitUsed = converted.unit;
            availableStock = mat.quantity;
            hasEnough = mat.quantity >= amountNeeded;
          }
        }

        amountNeeded = Math.round(amountNeeded * 1000) / 1000;

        return {
          materialName: displayName,
          calculatedAmount: amountNeeded,
          unit: unitUsed,
          availableStock,
          hasEnough,
          panniTypeId,
          hdPaperTypeId,
          formulaAmountPerPlate: form.amount,
          formulaUnitPerPlate: form.unit,
        };
      });
  };

  const previewList = getConsumptionPreview(finalProduced);

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (dryReceived <= 0) {
      setError('Dry plates received must be greater than zero.');
      return;
    }
    if (finalProduced <= 0) {
      setError('Final plates produced must be greater than zero.');
      return;
    }
    if (finalProduced > dryReceived) {
      setError('Final plates produced cannot exceed dry plates received.');
      return;
    }
    if (formulas.some((form) => form.materialName.toLowerCase().includes('panni')) && !selectedPanniType) {
      setError('Please select a panni type before saving this production batch.');
      return;
    }
    if (formulas.some((form) => form.materialName.toLowerCase().includes('hd paper')) && !selectedHdPaperType) {
      setError('Please select an HD paper type before saving this production batch.');
      return;
    }

    // Check if we have sufficient stock for all materials
    const previewList = getConsumptionPreview(finalProduced);
    const insufficientMaterials = previewList.filter((p) => !p.hasEnough);
    if (insufficientMaterials.length > 0) {
      const materialsList = insufficientMaterials.map((m) => `${m.materialName} (need ${m.calculatedAmount.toLocaleString()} ${m.unit}, have ${m.availableStock.toLocaleString()} ${m.unit})`).join(', ');
      setError(`⚠️ Insufficient stock! Required operation needs more stock: ${materialsList}`);
      return;
    }

    // Check if we have critically low materials or if user wants to bypass (we deduct anyway but let's notify)
    const activeId = 'final_' + Math.random().toString(36).substr(2, 9);

    // Compute consumptions array for saving
    const finalConsumptions = previewList.map((p) => ({
      materialName: p.materialName,
      calculatedAmount: p.calculatedAmount,
      unit: p.unit,
      panniTypeId: p.panniTypeId,
      hdPaperTypeId: p.hdPaperTypeId,
    }));

    const newRecord: FinalProduction = {
      id: activeId,
      date,
      dryPlatesReceived: dryReceived,
      finalPlatesProduced: finalProduced,
      notes: notes.trim(),
      panniType: selectedPanniType?.name,
      hdPaperType: selectedHdPaperType?.name,
      createdAt: getTodayStr(),
      consumptions: finalConsumptions,
    };

    // Deduct raw materials from stock list & log in 'InventoryTransaction'
    materials.forEach((mat) => {
      const consumption = finalConsumptions.find((c) => c.materialName.toLowerCase() === mat.name.toLowerCase());
      if (!consumption || mat.name.toLowerCase().includes('plaster')) return;

      // Log transaction of type 'out'
      adjustMaterialStock(
        mat.id,
        consumption.calculatedAmount,
        'out',
        0, // 0 procurement cost for production usage
        date,
        `Automated deduction for final production run: ${finalProduced} plates (Ref: ${activeId})`
      );
    });

    const updatedPanniTypes = [...panniTypes];
    previewList
      .filter((item) => item.panniTypeId)
      .forEach((item) => {
        const target = updatedPanniTypes.find((panniType) => panniType.id === item.panniTypeId);
        if (target) {
          target.quantity -= item.calculatedAmount;
        }
      });
    db.savePanniTypes(updatedPanniTypes);
    setPanniTypes(updatedPanniTypes);

    const updatedHdPaperTypes = [...hdPaperTypes];
    previewList
      .filter((item) => item.hdPaperTypeId)
      .forEach((item) => {
        const target = updatedHdPaperTypes.find((hdPaperType) => hdPaperType.id === item.hdPaperTypeId);
        if (target) {
          target.quantity -= item.calculatedAmount;
        }
      });
    db.saveHdPaperTypes(updatedHdPaperTypes);
    setHdPaperTypes(updatedHdPaperTypes);

    const wasteQuantity = Math.max(0, dryReceived - finalProduced);
    if (wasteQuantity > 0) {
      const wasteRecords = db.getWasteRecords();
      wasteRecords.push({
        id: 'waste_final_' + Math.random().toString(36).substr(2, 9),
        date,
        source: 'dry',
        quantity: wasteQuantity,
        notes: `Final packaging loss from batch (${dryReceived} dry received, ${finalProduced} final produced)`,
        createdAt: getTodayStr(),
      });
      db.saveWasteRecords(wasteRecords);
    }

    if (selectedOperatorId) {
      const operator = operators.find((item) => item.id === selectedOperatorId);
      if (operator) {
        const labourAmount = finalProduced * operator.ratePerPlate;
        const ledger = db.getLabourLedger();
        const entry: LabourLedgerEntry = {
          id: 'labour_' + Math.random().toString(36).substr(2, 9),
          operatorId: operator.id,
          operatorName: operator.name,
          date,
          stage: 'final',
          plates: finalProduced,
          ratePerPlate: operator.ratePerPlate,
          amount: labourAmount,
          type: 'earning',
          referenceId: activeId,
          notes: `Final production labour for ${finalProduced} plates`,
          createdAt: getTodayStr(),
        };
        const updatedLedger = [...ledger, entry];
        db.saveLabourLedger(updatedLedger);
        const updatedOperators = db.getOperators().map((item) => item.id === operator.id ? { ...item, balanceDue: item.balanceDue + labourAmount } : item);
        db.saveOperators(updatedOperators);
      }
    }

    const updatedRecords = [...records, newRecord];
    db.saveFinalProduction(updatedRecords);
    setRecords(updatedRecords);

    // Refresh materials state
    setMaterials(db.getMaterials());

    // Reset Form
    setDryReceived(1000);
    setFinalProduced(950);
    setNotes('');
    triggerToast(`Final production of ${finalProduced} plates committed. Materials deducted from stock.`);
  };

  // Deleting a final production run reverts the material deduction!
  const handleDelete = (rec: FinalProduction) => {
    if (
      confirm(
        `DANGER: Deleting this production run will AUTOMATICALLY REVERT and RESTORE the consumed raw materials back to stock. Continue?`
      )
    ) {
      // 1. Restore stock and clean related transaction logs
      const rawMaterials = db.getMaterials();
      const panniStock = db.getPanniTypes();
      const hdPaperStock = db.getHdPaperTypes();
      rec.consumptions.forEach((cons) => {
        if (cons.panniTypeId) {
          const panniType = panniStock.find((item) => item.id === cons.panniTypeId);
          if (panniType) {
            panniType.quantity += cons.calculatedAmount;
          }
        } else if (cons.hdPaperTypeId) {
          const hdPaperType = hdPaperStock.find((item) => item.id === cons.hdPaperTypeId);
          if (hdPaperType) {
            hdPaperType.quantity += cons.calculatedAmount;
          }
        } else {
          const mat = rawMaterials.find((m) => m.name.toLowerCase() === cons.materialName.toLowerCase());
          if (mat) {
            mat.quantity += cons.calculatedAmount; // Add back
            mat.updatedAt = getTodayStr();
          }
        }
      });
      db.saveMaterials(rawMaterials);
      db.savePanniTypes(panniStock);
      db.saveHdPaperTypes(hdPaperStock);

      // Refresh local state after restore
      setMaterials(db.getMaterials());
      setPanniTypes(db.getPanniTypes());
      setHdPaperTypes(db.getHdPaperTypes());

      // Clean transactions matching this production run ref ID
      const txs = db.getTransactions().filter((t) => !t.notes.includes(rec.id));
      db.saveTransactions(txs);

      // 2. Remove final production record
      const updated = records.filter((r) => r.id !== rec.id);
      db.saveFinalProduction(updated);
      setRecords(updated);

      // Refresh states
      setMaterials(db.getMaterials());
      setPanniTypes(db.getPanniTypes());
      if (selectedRecord?.id === rec.id) setSelectedRecord(null);

      triggerToast('Production run reversed. Consumed materials restored to stock.');
    }
  };

  return (
    <div className="space-y-6">
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final Plates Packed</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.reduce((sum, item) => sum + item.finalPlatesProduced, 0).toLocaleString()} pcs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dry Plates Received</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.reduce((sum, item) => sum + item.dryPlatesReceived, 0).toLocaleString()} pcs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Batches Logged</p>
          <p className="mt-2 text-xl font-display font-bold text-slate-900">{records.length}</p>
        </div>
      </div> */}
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-indigo-600 text-white rounded-xl border border-indigo-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Final Assembly Entry Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-slate-800 text-sm mb-1">
            Log Final Production Batch
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mb-4">
            Pack completed plates and trigger automatic formula-based stock deductions
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs font-medium">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSaveEntry} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Assembly Date</label>
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
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Dry Received (pcs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={dryReceived}
                  onChange={(e) => setDryReceived(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Final Produced (pcs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={finalProduced}
                  onChange={(e) => setFinalProduced(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Operator</label>
              <select value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800">
                <option value="">-- Select final operator --</option>
                {operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Operational Batch Memo</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shift summary, quality check, loader names..."
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Panni Type for This Batch</label>
              <select
                value={selectedPanniTypeId}
                onChange={(e) => setSelectedPanniTypeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
              >
                <option value="">-- Select panni type --</option>
                {panniTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Choose the panni stock type that should be deducted for this run.</p>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">HD Paper Type for This Batch</label>
              <select
                value={selectedHdPaperTypeId}
                onChange={(e) => setSelectedHdPaperTypeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
              >
                <option value="">-- Select HD paper type --</option>
                {hdPaperTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Choose the HD paper stock type that should be deducted for this run.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-sm shadow-indigo-100 cursor-pointer"
            >
              Pack &amp; Deduct Material Stock
            </button>
          </form>

          {/* Formula preview pane */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h4 className="font-display font-bold text-slate-800 text-xs flex items-center justify-between mb-3">
              <span>Required Formulas Preview</span>
              <span className="text-[10px] text-slate-400 font-normal">Based on active formulas</span>
            </h4>
            <div className="space-y-2 max-h-55 overflow-y-auto pr-1">
              {previewList.map((prev, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                  <div>
                    <p className="font-bold text-slate-700">{prev.materialName}</p>
                    <p className="text-[9px] text-slate-400 font-medium">Available: {prev.availableStock.toLocaleString()} {prev.unit}</p>
                    <p className="text-[10px] text-slate-600 mt-1 font-semibold">
                      Estimated deduction: {prev.calculatedAmount.toLocaleString()} {prev.unit}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Formula source: {prev.materialName} • {prev.formulaAmountPerPlate} {prev.formulaUnitPerPlate} / plate
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-800">
                      {prev.calculatedAmount.toLocaleString()} {prev.unit}
                    </p>
                    <span className={`inline-block text-[8px] font-bold px-1 rounded uppercase mt-0.5 ${
                      prev.hasEnough ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {prev.hasEnough ? 'Stock OK' : 'Stock Low'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final Production Log */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Packed Plate Assembly Registry</h3>
            <p className="text-[11px] text-slate-400 font-medium">Completed manufactured plate runs and automatically calculated deductions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Completion Date</th>
                  <th className="py-3 px-2 text-right">Dry Recd</th>
                  <th className="py-3 px-2 text-right">Final Packaged</th>
                  <th className="py-3 px-2 text-right">Defect Waste</th>
                  <th className="py-3 px-2 text-center">Material Usage</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.length > 0 ? (
                  [...records].reverse().map((rec) => {
                    const defects = Math.max(0, rec.dryPlatesReceived - rec.finalPlatesProduced);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 font-semibold text-slate-800 font-mono">
                          {rec.date}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-500">
                          {rec.dryPlatesReceived.toLocaleString()} <span className="text-[10px] font-normal">pcs</span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-indigo-700">
                          {rec.finalPlatesProduced.toLocaleString()} <span className="text-[10px] font-normal">pcs</span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          <span className={defects > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                            {defects.toLocaleString()}
                          </span>{' '}
                          <span className="text-[10px] font-normal text-slate-400">pcs</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] px-2.5 py-1 rounded-md transition-all cursor-pointer"
                          >
                            View Materials ({rec.consumptions?.length || 0})
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleDelete(rec)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Revert & delete production run"
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
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No final production runs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detailed consumption side panel if selected */}
          {selectedRecord && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100/60 pb-2">
                <h4 className="font-display font-bold text-slate-800 text-xs">
                  Material Consumption Ledger (Run ID: <span className="font-mono text-indigo-600 uppercase font-semibold">{selectedRecord.id.slice(0, 8)}</span>)
                </h4>
                <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                  Close Detail
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mb-3 font-semibold uppercase tracking-wider">
                Total Output: <span className="text-slate-800 font-bold font-mono">{selectedRecord.finalPlatesProduced.toLocaleString()} plates</span> | Date: <span className="text-slate-800 font-bold font-mono">{selectedRecord.date}</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedRecord.consumptions?.map((cons, i) => {
                  const matchingFormula = formulas.find((f) => f.materialName.toLowerCase() === cons.materialName.toLowerCase());
                  return (
                    <div key={i} className="p-2.5 bg-white border border-slate-100 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-semibold truncate">{cons.materialName}</p>
                      <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                        {cons.calculatedAmount.toLocaleString()} {cons.unit}
                      </p>
                      {matchingFormula && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Formula: {matchingFormula.amount} {matchingFormula.unit}/plate
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
