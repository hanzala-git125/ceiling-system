import React, { useMemo, useState } from 'react';
import { Users, Trash2, Edit2, CheckCircle, Wallet, Search, X, AlertTriangle } from 'lucide-react';
import { db, getTodayStr } from '../utils/api';
import { LabourLedgerEntry, Operator } from '../types';
import { AppLanguage } from '../utils/i18n';

const stageOptions: Array<{ value: Operator['stage']; label: string }> = [
  { value: 'wet', label: 'Wet Production' },
  { value: 'dry', label: 'Dry Production' },
  { value: 'final', label: 'Final Production' },
  { value: 'waste', label: 'Waste Handling' },
];

interface LabourPageProps {
  language?: AppLanguage;
}

export default function LabourPage({ language = 'en' }: LabourPageProps) {
  const [operators, setOperators] = useState<Operator[]>(db.getOperators());
  const [ledger, setLedger] = useState<LabourLedgerEntry[]>(db.getLabourLedger());
  const [name, setName] = useState('');
  const [stage, setStage] = useState<Operator['stage']>('wet');
  const [ratePerPlate, setRatePerPlate] = useState(18);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentOperator, setPaymentOperator] = useState<Operator | null>(null);
  const [deleteOperator, setDeleteOperator] = useState<Operator | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const filteredOperators = useMemo(() => {
    const q = search.toLowerCase();
    return operators.filter((operator) => {
      return !q || operator.name.toLowerCase().includes(q) || operator.stage.toLowerCase().includes(q);
    });
  }, [operators, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      const updated = operators.map((operator) =>
        operator.id === editingId
          ? { ...operator, name: name.trim(), stage, ratePerPlate, updatedAt: getTodayStr() }
          : operator
      );
      db.saveOperators(updated);
      setOperators(updated);
      triggerToast('Operator updated.');
      setEditingId(null);
    } else {
      const newOperator: Operator = {
        id: 'op_' + Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        stage,
        ratePerPlate,
        balanceDue: 0,
        status: 'active',
        createdAt: getTodayStr(),
      };
      const updated = [...operators, newOperator];
      db.saveOperators(updated);
      setOperators(updated);
      triggerToast('Operator added.');
    }

    setName('');
    setStage('wet');
    setRatePerPlate(18);
  };

  const handleEdit = (operator: Operator) => {
    setEditingId(operator.id);
    setName(operator.name);
    setStage(operator.stage);
    setRatePerPlate(operator.ratePerPlate);
  };

  const handleDelete = (operator: Operator) => {
    setDeleteOperator(operator);
    setShowDeleteModal(true);
  };

  const handleDeleteLedgerEntry = (entry: LabourLedgerEntry) => {
    if (!window.confirm('Delete this labour entry?')) return;

    const updatedLedger = ledger.filter((item) => item.id !== entry.id);
    db.saveLabourLedger(updatedLedger);
    setLedger(updatedLedger);

    const updatedOperators = operators.map((item) => {
      if (item.id !== entry.operatorId) return item;
      if (entry.type === 'earning') {
        return { ...item, balanceDue: Math.max(0, item.balanceDue - entry.amount) };
      }
      return item;
    });
    db.saveOperators(updatedOperators);
    setOperators(updatedOperators);
    triggerToast('Labour entry deleted.');
  };

  const confirmDelete = () => {
    if (!deleteOperator) return;

    const updated = operators.filter((operator) => operator.id !== deleteOperator.id);
    const remainingLedger = ledger.filter((entry) => entry.operatorId !== deleteOperator.id);

    db.saveOperators(updated);
    db.saveLabourLedger(remainingLedger);
    setOperators(updated);
    setLedger(remainingLedger);
    setShowDeleteModal(false);
    setDeleteOperator(null);
    triggerToast('Operator removed.');
  };

  const handlePayment = (operator: Operator) => {
    setPaymentOperator(operator);
    setPaymentAmount(0);
    setShowPaymentModal(true);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOperator) return;

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      triggerToast('Enter a valid payment amount.');
      return;
    }

    const entry: LabourLedgerEntry = {
      id: 'labour_' + Math.random().toString(36).substr(2, 9),
      operatorId: paymentOperator.id,
      operatorName: paymentOperator.name,
      date: getTodayStr(),
      stage: paymentOperator.stage,
      plates: 0,
      ratePerPlate: paymentOperator.ratePerPlate,
      amount,
      type: 'payment',
      referenceId: 'manual_payment',
      notes: 'Manual payment recorded',
      createdAt: getTodayStr(),
    };

    const updatedLedger = [...ledger, entry];
    const updatedOperators = operators.map((item) =>
      item.id === paymentOperator.id ? { ...item, balanceDue: Math.max(0, item.balanceDue - amount) } : item
    );

    db.saveLabourLedger(updatedLedger);
    db.saveOperators(updatedOperators);
    setLedger(updatedLedger);
    setOperators(updatedOperators);
    setShowPaymentModal(false);
    setPaymentOperator(null);
    setPaymentAmount(0);
    triggerToast('Payment recorded.');
  };

  // Calculate total plates per operator across all stages regardless of when they were created
  const getOperatorPlatesTotals = useMemo(() => {
    const totals: Record<string, { totalPlates: number; stageCounts: Record<string, number> }> = {};
    operators.forEach((op) => {
      totals[op.id] = { totalPlates: 0, stageCounts: { wet: 0, dry: 0, final: 0, waste: 0 } };
    });
    ledger.forEach((entry) => {
      if (entry.type === 'earning' && totals[entry.operatorId]) {
        totals[entry.operatorId].totalPlates += entry.plates;
        totals[entry.operatorId].stageCounts[entry.stage] = (totals[entry.operatorId].stageCounts[entry.stage] || 0) + entry.plates;
      }
    });
    return totals;
  }, [ledger, operators]);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-emerald-600 text-white rounded-xl border border-emerald-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-slate-800 text-sm mb-1">Operator Directory</h3>
          <p className="text-[11px] text-slate-400 font-medium mb-5">Manage wet, dry, final, and waste operators with simple labour rates.</p>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Operator Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800" />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value as Operator['stage'])} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800">
                {stageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Rate per Plate (Rs)</label>
              <input type="number" step="any" min="0" value={ratePerPlate || ''} onChange={(e) => setRatePerPlate(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all">
              {editingId ? 'Save Operator' : 'Add Operator'}
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Operators & Labour Balances</h3>
              <p className="text-[11px] text-slate-400 font-medium">Track who works each stage and the amount still outstanding.</p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search operator" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-100 bg-slate-50" />
            </div>
          </div>

          <div className="space-y-3">
            {filteredOperators.map((operator) => (
              <div key={operator.id} className="border border-slate-100 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-indigo-600" />
                    <p className="font-semibold text-slate-800">{operator.name}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Stage: {stageOptions.find((item) => item.value === operator.stage)?.label}</p>
                  <p className="text-[10px] text-slate-500">Rate: Rs {operator.ratePerPlate} / plate • Balance: Rs {operator.balanceDue}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">Total Plates Created: {getOperatorPlatesTotals[operator.id]?.totalPlates.toLocaleString() || 0}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(operator)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-50"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(operator)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-50"><Trash2 size={14} /></button>
                  <button onClick={() => handlePayment(operator)} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                    <Wallet size={14} /> Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Operator Production Summary</h3>
            <p className="text-[11px] text-slate-400 font-medium">Total plates created by each operator across all production stages; profit reports use the effective final-plate labour basis of Rs. 18 per plate.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Operator Name</th>
                <th className="py-3 px-2">Stage</th>
                <th className="py-3 px-2 text-right">Wet Plates</th>
                <th className="py-3 px-2 text-right">Dry Plates</th>
                <th className="py-3 px-2 text-right">Final Plates</th>
                <th className="py-3 px-2 text-right">Total Plates</th>
                <th className="py-3 px-2 text-right">Total Labour Cost (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {operators.length > 0 ? operators.map((operator) => {
                const totals = getOperatorPlatesTotals[operator.id] || { totalPlates: 0, stageCounts: { wet: 0, dry: 0, final: 0, waste: 0 } };
                const totalCost = totals.totalPlates * operator.ratePerPlate;
                return (
                  <tr key={operator.id} className="border-b border-slate-50">
                    <td className="py-3 px-2 font-semibold text-slate-800">{operator.name}</td>
                    <td className="py-3 px-2 text-slate-600">{stageOptions.find((item) => item.value === operator.stage)?.label}</td>
                    <td className="py-3 px-2 text-right font-mono text-slate-600">{(totals.stageCounts.wet || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-mono text-slate-600">{(totals.stageCounts.dry || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-mono text-slate-600">{(totals.stageCounts.final || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-mono font-semibold text-slate-800">{totals.totalPlates.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-mono font-semibold text-emerald-700">{totalCost.toLocaleString()}</td>
                  </tr>
                );
              }) : <tr><td colSpan={7} className="py-6 text-center text-slate-400">No operators registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Labour Ledger</h3>
            <p className="text-[11px] text-slate-400 font-medium">Earnings and payment entries for each operator.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Operator</th>
                <th className="py-3 px-2">Stage</th>
                <th className="py-3 px-2 text-right">Plates</th>
                <th className="py-3 px-2 text-right">Amount</th>
                <th className="py-3 px-2">Type</th>
                <th className="py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length > 0 ? [...ledger].reverse().map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50">
                  <td className="py-3 px-2 font-mono text-slate-600">{entry.date}</td>
                  <td className="py-3 px-2 font-semibold text-slate-800">{entry.operatorName}</td>
                  <td className="py-3 px-2 text-slate-600">{entry.stage}</td>
                  <td className="py-3 px-2 text-right font-mono">{entry.plates}</td>
                  <td className="py-3 px-2 text-right font-mono">Rs {entry.amount}</td>
                  <td className="py-3 px-2 capitalize text-slate-600">{entry.type}</td>
                  <td className="py-3 px-2">
                    <button onClick={() => handleDeleteLedgerEntry(entry)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )) : <tr><td colSpan={7} className="py-6 text-center text-slate-400">No labour entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && paymentOperator && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Wallet size={16} className="text-emerald-600" />
                  Record Payment
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">{paymentOperator.name}</p>
              </div>
              <button type="button" onClick={() => { setShowPaymentModal(false); setPaymentOperator(null); setPaymentAmount(0); }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Amount (Rs)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setShowPaymentModal(false); setPaymentOperator(null); setPaymentAmount(0); }} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deleteOperator && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h3 className="font-display font-bold text-slate-800 text-sm">Delete Operator</h3>
              </div>
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteOperator(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p>Delete <span className="font-semibold text-slate-800">{deleteOperator.name}</span> and remove their labour ledger entries?</p>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteOperator(null); }} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold">
                  Cancel
                </button>
                <button type="button" onClick={confirmDelete} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold">
                  Delete Operator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
