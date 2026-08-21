import React, { useEffect, useState, useRef } from 'react';
import { Users, Search, Plus, Trash2, Edit2, AlertCircle, CheckCircle, Landmark, X, ClipboardList, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { db, getTodayStr, addSupplierLedgerEntry, getSupplierOutstandingBalance, deleteSupplierLedgerByReference, deleteSupplierLedgerEntry, refreshSuppliersFromApi, refreshSupplierLedgerFromApi } from '../utils/api';
import { Supplier, SupplierLedgerEntry, Payment } from '../types';
import { AppLanguage } from '../utils/i18n';

interface SuppliersPageProps {
  language?: AppLanguage;
}

export default function SuppliersPage({ language = 'en' }: SuppliersPageProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(db.getSuppliers());
  const [ledger, setLedger] = useState<SupplierLedgerEntry[]>(db.getSupplierLedger());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [selectedMaterialNames, setSelectedMaterialNames] = useState<string[]>([]);

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(getTodayStr());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const inventoryMaterialNames = Array.from(
    new Set(
      db.getMaterials()
        .map((material) => material.name)
        .filter(Boolean)
    )
  );

  useEffect(() => {
    void Promise.all([
      refreshSuppliersFromApi(),
      refreshSupplierLedgerFromApi(),
    ]).then(([supplierItems, ledgerItems]) => {
      setSuppliers(supplierItems);
      setLedger(ledgerItems);
    });
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    const materialList = Array.from(new Set(selectedMaterialNames.filter(Boolean)));

    if (editingSupplier) {
      const updated = suppliers.map((s) =>
        s.id === editingSupplier.id
          ? {
            ...s,
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            supplierMaterials: materialList,
          }
          : s
      );
      db.saveSuppliers(updated);
      setSuppliers(updated);
      setEditingSupplier(null);
      triggerToast('Supplier details updated.');
    } else {
      const activeId = 'supp_' + Math.random().toString(36).substr(2, 9);
      const newSupplier: Supplier = {
        id: activeId,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        openingBalance,
        supplierMaterials: materialList,
        createdAt: getTodayStr(),
      };

      const updated = [...suppliers, newSupplier];
      db.saveSuppliers(updated);
      setSuppliers(updated);

      if (openingBalance !== 0) {
        addSupplierLedgerEntry(
          activeId,
          getTodayStr(),
          'Opening Balance',
          'opening',
          openingBalance,
          0,
          'Initial supplier opening balance'
        );
        setLedger(db.getSupplierLedger());
      }

      triggerToast('New supplier created.');
    }

    setShowAddModal(false);
    setName('');
    setPhone('');
    setAddress('');
    setOpeningBalance(0);
    setSelectedMaterialNames([]);
  };

  const handleEditInit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setPhone(supplier.phone);
    setAddress(supplier.address);
    setOpeningBalance(supplier.openingBalance);
    setSelectedMaterialNames(supplier.supplierMaterials);
    setShowAddModal(true);
  };

  const handleDelete = (id: string, supplierName: string) => {
    if (
      confirm(
        `Are you sure you want to delete ${supplierName}? This will remove supplier records and ledger entries permanently.`
      )
    ) {
      const updated = suppliers.filter((s) => s.id !== id);
      db.saveSuppliers(updated);
      setSuppliers(updated);

      const updatedLedger = db.getSupplierLedger().filter((l) => l.supplierId !== id);
      db.saveSupplierLedger(updatedLedger);
      setLedger(updatedLedger);

      if (selectedSupplierId === id) setSelectedSupplierId(null);
      triggerToast('Supplier deleted.');
    }
  };

  const handleDeleteLedgerEntry = (entry: SupplierLedgerEntry) => {
    if (!window.confirm('Delete this supplier ledger entry?')) return;
    deleteSupplierLedgerEntry(entry.id, entry.supplierId);
    setLedger(db.getSupplierLedger());
    triggerToast('Ledger entry deleted.');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedSupplierId) return;
    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;

    const paymentId = 'supp_pay_' + Math.random().toString(36).substr(2, 9);

    addSupplierLedgerEntry(
      selectedSupplierId,
      paymentDate,
      'Payment',
      paymentId,
      0,
      paymentAmount,
      paymentNotes.trim() || `Payment made to supplier via ${paymentMethod}`
    );

    setLedger(db.getSupplierLedger());
    setPaymentAmount(0);
    setPaymentNotes('');
    setShowPaymentModal(false);
    triggerToast(`Payment of Rs. ${paymentAmount.toLocaleString()} recorded.`);
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery) ||
    s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const selectedLedgerEntries = selectedSupplierId
    ? ledger.filter((l) => l.supplierId === selectedSupplierId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];
  const supplierOutstanding = selectedSupplier ? getSupplierOutstandingBalance(selectedSupplier.id) : 0;

  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const materialsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        materialsRef.current &&
        !materialsRef.current.contains(event.target as Node)
      ) {
        setIsMaterialsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-indigo-600 text-white rounded-xl border border-indigo-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800 text-sm">Supplier Directory</h3>
            <button
              onClick={() => {
                setEditingSupplier(null);
                setShowAddModal(true);
              }}
              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="relative">
            <Search className="absolute inset-y-0 left-2.5 my-auto text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-800 focus:bg-white"
            />
          </div>

          <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 500 }}>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => {
                const outstanding = getSupplierOutstandingBalance(supplier.id);
                const isSelected = selectedSupplierId === supplier.id;
                return (
                  <div
                    key={supplier.id}
                    onClick={() => setSelectedSupplierId(supplier.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${isSelected
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm shadow-indigo-100/10'
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800">{supplier.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditInit(supplier);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.id, supplier.name);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-white"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">{supplier.phone} • {supplier.address}</p>
                    <p className="text-[10px] text-slate-400 mt-2">Materials: {supplier.supplierMaterials.join(', ') || 'None listed'}</p>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {outstanding > 0 ? 'You owe them' : 'Settled'}
                      </span>
                      <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${outstanding > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {outstanding > 0 ? <ArrowUpRight size={12} /> : <CheckCircle size={12} />}
                        <span className="font-mono">Rs. {Math.round(outstanding).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-slate-400 py-8">No suppliers recorded yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-5">
          {selectedSupplier ? (
            <>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-display font-extrabold text-slate-800 text-sm leading-tight">{selectedSupplier.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Contact: {selectedSupplier.phone} | Address: {selectedSupplier.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-right rounded-xl border px-3 py-2 ${supplierOutstanding > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${supplierOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {supplierOutstanding > 0 ? 'You need to pay' : 'Nothing pending'}
                    </p>
                    <p className={`font-mono font-extrabold text-base mt-0.5 ${supplierOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      Rs. {Math.round(supplierOutstanding).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {supplierOutstanding > 0 ? 'Pay this amount to clear the supplier balance.' : 'This supplier account is fully settled.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPaymentAmount(0);
                      setPaymentNotes('');
                      setShowPaymentModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Landmark size={13} />
                    Pay Supplier
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-3">
                  <ClipboardList size={14} className="text-indigo-600" /> Supplier Ledger
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-2">Date</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2 text-right">Debit</th>
                        <th className="py-2.5 px-2 text-right">Credit</th>
                        <th className="py-2.5 px-2 text-right">Balance</th>
                        <th className="py-2.5 px-2">Description</th>
                        <th className="py-2.5 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {selectedLedgerEntries.length > 0 ? (
                        selectedLedgerEntries.map((ent) => {
                          const increasesWhatYouOwe = ent.debit > 0 || ent.type === 'Opening Balance';
                          return (
                            <tr key={ent.id} className={`hover:bg-slate-50/40 ${increasesWhatYouOwe ? 'bg-rose-50/20' : 'bg-emerald-50/20'}`}>
                              <td className="py-2.5 px-2 font-mono text-slate-400">{ent.date}</td>
                              <td className="py-2.5 px-2">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize w-fit ${ent.type === 'Opening Balance'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : ent.type === 'Purchase'
                                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    }`}>
                                    {ent.type}
                                  </span>
                                  <span className={`text-[9px] font-semibold ${increasesWhatYouOwe ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {increasesWhatYouOwe ? 'Adds to what you owe' : 'Reduces what you owe'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-semibold text-rose-600">
                                {ent.debit > 0 ? `Rs. ${ent.debit.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-semibold text-emerald-600">
                                {ent.credit > 0 ? `Rs. ${ent.credit.toLocaleString()}` : '—'}
                              </td>
                              <td className={`py-2.5 px-2 text-right font-mono font-bold ${ent.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>Rs. {Math.round(ent.balance).toLocaleString()}</td>
                              <td className="py-2.5 px-2 text-[11px] text-slate-400 truncate" title={ent.description} style={{ maxWidth: 160 }}>{ent.description}</td>
                              <td className="py-2.5 px-2">
                                <button onClick={() => handleDeleteLedgerEntry(ent)} className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-600">
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">No ledger entries found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-xl">
              <Users size={32} className="text-slate-200" />
              <p className="text-xs font-semibold">Select a supplier to inspect ledger entries and record payments.</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">{editingSupplier ? 'Update Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 text-xs">
              {error && <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-rose-700 text-[10px] font-semibold">{error}</div>}
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Supplier Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Phone</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800" />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Opening Balance</label>
                  <input type="number" step="any" value={openingBalance} onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800" />
              </div>
              <div ref={materialsRef} className="space-y-2">
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">
                  Materials Supplied
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMaterialsOpen(!isMaterialsOpen)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-left flex flex-wrap gap-2 items-center hover:border-indigo-400 transition"
                    style={{ minHeight: 48 }}
                  >
                    {selectedMaterialNames.length === 0 ? (
                      <span className="text-slate-400">Select materials...</span>
                    ) : (
                      selectedMaterialNames.map((material) => (
                        <span
                          key={material}
                          className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm font-medium"
                        >
                          {material}
                        </span>
                      ))
                    )}

                    <span className="ml-auto text-slate-500">
                      {isMaterialsOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {isMaterialsOpen && (
                    <div className="relative z-10 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {inventoryMaterialNames.length > 0 ? (
                        inventoryMaterialNames.map((material) => {
                          const selected = selectedMaterialNames.includes(material);

                          return (
                            <button
                              key={material}
                              type="button"
                              onClick={() => {
                                if (selected) {
                                  setSelectedMaterialNames(
                                    selectedMaterialNames.filter((m) => m !== material)
                                  );
                                } else {
                                  setSelectedMaterialNames([
                                    ...selectedMaterialNames,
                                    material,
                                  ]);
                                }
                              }}
                              className={`w-full px-4 py-3 flex justify-between items-center hover:bg-slate-50 transition ${selected ? "bg-indigo-50 text-indigo-700 font-medium" : ""}`}
                            >
                              <span>{material}</span>

                              {selected && (
                                <span className="text-lg font-bold text-indigo-600">✓</span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-3 text-slate-400">
                          No inventory materials yet
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Click materials to select or deselect them.
                </p>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs uppercase tracking-wider mt-2">Save Supplier</button>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">Record Payment to {selectedSupplier.name}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              {error && <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-rose-700 text-[10px] font-semibold">{error}</div>}
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Payment Amount</label>
                <input type="number" step="any" min="0" required value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono" />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Payment Date</label>
                <input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono" />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Payment Method</label>
                <input type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800" />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Notes</label>
                <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800" rows={3} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs uppercase tracking-wider">Record Payment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
