import React, { useState } from 'react';
import { Users, Search, Plus, Trash2, Edit2, AlertCircle, CheckCircle, FileText, Landmark, X, ArrowUpRight, ArrowDownRight, ClipboardList } from 'lucide-react';
import { db, getTodayStr, addLedgerEntry, getCustomerOutstandingBalance, deleteLedgerByReference, deleteCustomerLedgerEntry } from '../utils/api';
import { Customer, CustomerLedgerEntry, Payment } from '../types';
import { AppLanguage } from '../utils/i18n';

interface CustomersPageProps {
  language?: AppLanguage;
}

export default function CustomersPage({ language = 'en' }: CustomersPageProps) {
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>(db.getLedger());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Customer for Ledger Detail View
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Customer Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(getTodayStr());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (editingCustomer) {
      // Editing Customer
      const updated = customers.map((c) =>
        c.id === editingCustomer.id
          ? {
              ...c,
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
            }
          : c
      );
      db.saveCustomers(updated);
      setCustomers(updated);

      // Cascading update to Sales Customer Names
      const sales = db.getSales();
      const updatedSales = sales.map(s => s.customerId === editingCustomer.id ? { ...s, customerName: name.trim() } : s);
      db.saveSales(updatedSales);

      setEditingCustomer(null);
      triggerToast('Customer details updated.');
    } else {
      // Adding New
      const activeId = 'cust_' + Math.random().toString(36).substr(2, 9);
      const newCustomer: Customer = {
        id: activeId,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        openingBalance,
        createdAt: getTodayStr(),
      };

      const updated = [...customers, newCustomer];
      db.saveCustomers(updated);
      setCustomers(updated);

      // Seed Ledger entry for opening balance if any
      addLedgerEntry(
        activeId,
        getTodayStr(),
        'Opening Balance',
        'opening',
        openingBalance,
        0,
        'Account initialized with opening outstanding balance'
      );

      // Refresh Ledger State
      setLedger(db.getLedger());
      triggerToast('New customer folder initiated.');
    }

    // Reset Form
    setShowAddModal(false);
    setName('');
    setPhone('');
    setAddress('');
    setOpeningBalance(0);
  };

  const handleEditInit = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setAddress(cust.address);
    setOpeningBalance(cust.openingBalance);
    setShowAddModal(true);
  };

  const handleDelete = (id: string, customerName: string) => {
    if (
      confirm(
        `Are you sure you want to delete ${customerName}? Doing so will erase all invoices and payment logs permanently. Continue?`
      )
    ) {
      const updated = customers.filter((c) => c.id !== id);
      db.saveCustomers(updated);
      setCustomers(updated);

      // Clean ledger
      const updatedLedger = db.getLedger().filter((l) => l.customerId !== id);
      db.saveLedger(updatedLedger);
      setLedger(updatedLedger);

      // Clean Sales
      const updatedSales = db.getSales().filter((s) => s.customerId !== id);
      db.saveSales(updatedSales);

      if (selectedCustomerId === id) setSelectedCustomerId(null);
      triggerToast('Customer folder deleted.');
    }
  };

  const handleDeleteLedgerEntry = (entry: CustomerLedgerEntry) => {
    if (!window.confirm('Delete this customer ledger entry?')) return;
    deleteCustomerLedgerEntry(entry.id, entry.customerId);
    setLedger(db.getLedger());
    triggerToast('Ledger entry deleted.');
  };

  // Record a Customer Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId) return;
    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);

    // Save payment
    const newPayment: Payment = {
      id: paymentId,
      customerId: selectedCustomerId,
      customerName: customer.name,
      amount: paymentAmount,
      date: paymentDate,
      paymentMethod,
      notes: paymentNotes.trim() || `Manual ledger credit payment (${paymentMethod})`,
      createdAt: getTodayStr(),
    };

    const payments = db.getPayments();
    payments.push(newPayment);
    db.savePayments(payments);

    // Log to ledger (Credit decreases outstanding balance)
    addLedgerEntry(
      selectedCustomerId,
      paymentDate,
      'Payment',
      paymentId,
      0,
      paymentAmount,
      paymentNotes.trim() || `Payment received: Method: ${paymentMethod}`
    );

    // Refresh state
    setLedger(db.getLedger());
    setPaymentAmount(0);
    setPaymentNotes('');
    setShowPaymentModal(false);
    triggerToast(`Payment of Rs. ${paymentAmount.toLocaleString()} credited successfully.`);
  };

  // Filter Directory
  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  // Fetch ledger entries for active selection
  const selectedLedgerEntries = selectedCustomerId
    ? ledger
        .filter((l) => l.customerId === selectedCustomerId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];
  const customerOutstanding = selectedCustomer ? getCustomerOutstandingBalance(selectedCustomer.id) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-indigo-600 text-white rounded-xl border border-indigo-500 flex items-center gap-2 text-xs font-semibold shadow-lg">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Directory and Details view split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Directory Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800 text-sm">Customer Directory</h3>
            <button
              onClick={() => {
                setEditingCustomer(null);
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
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-800 focus:bg-white"
            />
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((cust) => {
                const outstanding = getCustomerOutstandingBalance(cust.id);
                const isSelected = selectedCustomerId === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm shadow-indigo-100/10'
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800">{cust.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditInit(cust);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cust.id, cust.name);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-white"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-400 font-medium text-[10px]">{cust.phone} • {cust.address}</p>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {outstanding > 0 ? 'Customer owes you' : 'Settled'}
                      </span>
                      <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${outstanding > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {outstanding > 0 ? <ArrowDownRight size={12} /> : <CheckCircle size={12} />}
                        <span className="font-mono">Rs. {Math.round(outstanding).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-slate-400 py-8">No customers recorded yet.</p>
            )}
          </div>
        </div>

        {/* Ledger and Statement View */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-5">
          {selectedCustomer ? (
            <>
              {/* Customer summary card */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-display font-extrabold text-slate-800 text-sm leading-tight">
                    {selectedCustomer.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Contact: {selectedCustomer.phone} | Address: {selectedCustomer.address}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`text-right rounded-xl border px-3 py-2 ${customerOutstanding > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${customerOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {customerOutstanding > 0 ? 'Customer still owes you' : 'Nothing pending'}
                    </p>
                    <p className={`font-mono font-extrabold text-base mt-0.5 ${customerOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      Rs. {Math.round(customerOutstanding).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {customerOutstanding > 0 ? 'Record payment when the customer settles their balance.' : 'This customer account is fully settled.'}
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
                    Receive Payment
                  </button>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div>
                <h4 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-3">
                  <ClipboardList size={14} className="text-indigo-600" /> Account Statement &amp; Ledger
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-2">Date</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2 text-right">Debit (Sales)</th>
                        <th className="py-2.5 px-2 text-right">Credit (Payments)</th>
                        <th className="py-2.5 px-2 text-right">Running Balance</th>
                        <th className="py-2.5 px-2">Description / Notes</th>
                        <th className="py-2.5 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {selectedLedgerEntries.length > 0 ? (
                        selectedLedgerEntries.map((ent) => {
                          const increasesBalance = ent.debit > 0 || ent.type === 'Opening Balance';
                          return (
                            <tr key={ent.id} className={`hover:bg-slate-50/40 ${increasesBalance ? 'bg-rose-50/20' : 'bg-emerald-50/20'}`}>
                              <td className="py-2.5 px-2 font-mono text-slate-400">{ent.date}</td>
                              <td className="py-2.5 px-2">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize w-fit ${
                                    ent.type === 'Opening Balance'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : ent.type === 'Sale'
                                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  }`}>
                                    {ent.type}
                                  </span>
                                  <span className={`text-[9px] font-semibold ${increasesBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {increasesBalance ? 'Adds to what they owe' : 'Reduces what they owe'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-semibold text-rose-600">
                                {ent.debit > 0 ? `Rs. ${ent.debit.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-semibold text-emerald-600">
                                {ent.credit > 0 ? `Rs. ${ent.credit.toLocaleString()}` : '—'}
                              </td>
                              <td className={`py-2.5 px-2 text-right font-mono font-bold ${ent.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                Rs. {Math.round(ent.balance).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-2 text-[11px] text-slate-400 max-w-[160px] truncate" title={ent.description}>
                                {ent.description}
                              </td>
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
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No ledger entries found.
                          </td>
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
              <p className="text-xs font-semibold">Select a customer from the directory to inspect ledgers and record payments.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Add/Edit Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">
                {editingCustomer ? 'Update Customer Profile' : 'Initiate Customer Folder'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-red-700 font-medium">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Customer / Agency Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chaudhary Plate Distributors"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Full Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Main G.T. Road, Gujranwala"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Opening Outstanding Balance (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    placeholder="Previous outstanding balance if any"
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">This seeds an Opening Balance ledger entry automatically.</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                {editingCustomer ? 'Update details' : 'Create folder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Receive Payment */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Landmark size={16} className="text-indigo-600" />
                Credit Customer Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl">
                <p className="text-slate-700 font-semibold">Crediting Account: <span className="text-slate-900 font-bold">{selectedCustomer.name}</span></p>
                <p className="text-slate-400 mt-1 font-semibold text-[10px] uppercase">Outstanding Due: <span className="font-mono text-indigo-700 font-bold">Rs. {Math.round(getCustomerOutstandingBalance(selectedCustomer.id)).toLocaleString()}</span></p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-red-700 font-medium">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Receipt Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="Cash">Cash Receipt</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Amount Received (Rs)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Payment Notes / Memo</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid in full via Allied Bank Online"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer shadow-sm"
              >
                Post Payment Credit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
