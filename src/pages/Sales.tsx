import React, { useState } from 'react';
import { ShoppingCart, Search, Plus, Trash2, Printer, AlertCircle, CheckCircle, FileText, X, Percent, DollarSign } from 'lucide-react';
import { db, getTodayStr, addLedgerEntry, deleteLedgerByReference } from '../utils/api';
import { Sale, Customer } from '../types';
import { AppLanguage, getLanguageText } from '../utils/i18n';

interface SalesPageProps {
  language?: AppLanguage;
}

export default function SalesPage({ language = 'en' }: SalesPageProps) {
  const [sales, setSales] = useState<Sale[]>(db.getSales());
  const [customers] = useState<Customer[]>(db.getCustomers());

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeInvoiceSale, setActiveInvoiceSale] = useState<Sale | null>(null);

  // Sale form state
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [plateType, setPlateType] = useState('Plate 2*2');
  const [customRate, setCustomRate] = useState<number>(15.30);
  const [quantity, setQuantity] = useState<number>(1000);
  const [discount, setDiscount] = useState<number>(0);
  const [tCrossFeet, setTCrossFeet] = useState<number>(0);
  const [tCrossRate, setTCrossRate] = useState<number>(0);
  const [tCrossTypeId, setTCrossTypeId] = useState('');
  const [wallAnglePieces, setWallAnglePieces] = useState<number>(0);
  const [wallAngleRate, setWallAngleRate] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Preset rates mapper
  const handlePlateTypeChange = (type: string) => {
    setPlateType(type);
    setCustomRate(15.30);
  };

  const calculatedTotalBill = customRate * quantity;
  const tCrossAmount = (tCrossFeet > 0 && tCrossRate > 0) ? tCrossFeet * tCrossRate : 0;
  const wallAngleAmount = (wallAnglePieces > 0 && wallAngleRate > 0) ? wallAnglePieces * wallAngleRate : 0;
  const calculatedTotalBillWithAccessories = calculatedTotalBill + tCrossAmount + wallAngleAmount;
  const calculatedGrandTotal = Math.max(0, calculatedTotalBillWithAccessories - discount);
  const tCrosses = db.getTCrosses ? db.getTCrosses() : [];
  const wallAngles = db.getWallAngles ? db.getWallAngles() : [];
  const selectedTCross = tCrosses.find((item) => item.id === tCrossTypeId);
  const selectedWallAngle = wallAngles[0];

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Please select a customer for this order.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity ordered must be greater than zero.');
      return;
    }
    if (customRate <= 0) {
      setError('Rate per plate must be greater than zero Rupees.');
      return;
    }
    if (tCrossFeet > 0 && (!selectedTCross || tCrossRate <= 0)) {
      setError('Select a T Cross type and enter a valid rate when selling T Cross.');
      return;
    }
    if (wallAnglePieces > 0 && (!selectedWallAngle || wallAngleRate <= 0)) {
      setError('Select a Wall Angle type and enter a valid rate when selling Wall Angle.');
      return;
    }

    const selectedCust = customers.find((c) => c.id === customerId);
    if (!selectedCust) return;

    const saleId = 'sale_' + Math.random().toString(36).substr(2, 9);
    const invoiceNumber = 'INV-' + (db.getSales().length + 1001);

    const newSale: Sale = {
      id: saleId,
      customerId,
      customerName: selectedCust.name,
      date,
      productName: plateType,
      rate: customRate,
      quantity,
      totalAmount: calculatedTotalBillWithAccessories,
      discount,
      grandTotal: calculatedGrandTotal,
      invoiceNumber,
      notes: notes.trim() || `Dispatched order for ${plateType}`,
      createdAt: getTodayStr(),
      tCrossFeet: tCrossFeet > 0 ? tCrossFeet : undefined,
      tCrossRate: tCrossRate > 0 ? tCrossRate : undefined,
      tCrossAmount: tCrossAmount > 0 ? tCrossAmount : undefined,
      tCrossTypeId: selectedTCross?.id,
      tCrossTypeName: selectedTCross?.name,
      tCrossUnit: selectedTCross?.unit,
      wallAnglePieces: wallAnglePieces > 0 ? wallAnglePieces : undefined,
      wallAngleRate: wallAngleRate > 0 ? wallAngleRate : undefined,
      wallAngleAmount: wallAngleAmount > 0 ? wallAngleAmount : undefined,
      wallAngleId: selectedWallAngle?.id,
      wallAngleName: selectedWallAngle?.name,
      wallAngleUnit: selectedWallAngle?.unit,
    };

    // Save Sale record
    const updatedSales = [...sales, newSale];
    db.saveSales(updatedSales);
    setSales(updatedSales);

    // If T Cross sold, deduct from T Cross inventory and record transaction
    if (tCrossFeet > 0) {
      const tcrosses = db.getTCrosses ? db.getTCrosses() : [];
      const tcross = tcrosses.find((item) => item.id === tCrossTypeId) || null;
      if (tcross) {
        const updated = tcrosses.map((t) => t.id === tcross.id ? { ...t, quantity: Math.max(0, t.quantity - tCrossFeet) } : t);
        db.saveTCrosses ? db.saveTCrosses(updated) : null;

        const txs = db.getTransactions();
        const newTx = {
          id: 'tx_' + Math.random().toString(36).substr(2, 9),
          materialId: tcross.id,
          materialName: tcross.name,
          type: 'out',
          quantity: tCrossFeet,
          cost: tCrossAmount,
          date,
          notes: `Sold ${tCrossFeet} ${tcross.unit} with ${invoiceNumber}`,
          unit: tcross.unit,
        };
        txs.push(newTx as any);
        db.saveTransactions(txs);
      }
    }

    if (wallAnglePieces > 0 && selectedWallAngle) {
      const updated = wallAngles.map((item) => item.id === selectedWallAngle.id ? { ...item, quantity: Math.max(0, item.quantity - wallAnglePieces) } : item);
      db.saveWallAngles(updated);
      const txs = db.getTransactions();
      txs.push({ id: 'tx_' + Math.random().toString(36).substr(2, 9), materialId: selectedWallAngle.id, materialName: selectedWallAngle.name, type: 'out', quantity: wallAnglePieces, cost: wallAngleAmount, date, notes: `Sold ${wallAnglePieces} ${selectedWallAngle.unit} with ${invoiceNumber}`, unit: selectedWallAngle.unit });
      db.saveTransactions(txs);
    }

    // Log to Customer Ledger (Debit increases account outstanding balance)
    addLedgerEntry(
      customerId,
      date,
      'Sale',
      saleId,
      calculatedGrandTotal, // debit amount
      0, // credit amount
      `Dispatched invoice: ${invoiceNumber} (${quantity} × Rs. ${customRate} ${plateType})${selectedTCross && tCrossFeet > 0 ? ` + ${selectedTCross.name}: ${tCrossFeet} ${selectedTCross.unit}` : ''}${selectedWallAngle && wallAnglePieces > 0 ? ` + ${selectedWallAngle.name}: ${wallAnglePieces} ${selectedWallAngle.unit}` : ''}`
    );

    // Reset Form
    setShowAddModal(false);
    setCustomerId('');
    setDate(getTodayStr());
    setPlateType('Double Panni Plate');
    setCustomRate(15.30);
    setQuantity(1000);
    setDiscount(0);
    setTCrossFeet(0);
    setTCrossRate(0);
    setTCrossTypeId('');
    setWallAnglePieces(0);
    setWallAngleRate(0);
    setNotes('');

    triggerToast(`Invoice ${invoiceNumber} created and dispatched.`);
  };

  const handleDeleteSale = (sale: Sale) => {
    if (confirm(`DANGER: Deleting invoice ${sale.invoiceNumber} will AUTOMATICALLY REVERT and REMOVE this debit from ${sale.customerName}'s account ledger. Continue?`)) {
      // 1. Delete sale record
      const updated = sales.filter((s) => s.id !== sale.id);
      db.saveSales(updated);
      setSales(updated);

      if (sale.tCrossFeet && sale.tCrossTypeId) {
        db.saveTCrosses((db.getTCrosses ? db.getTCrosses() : []).map((item) => item.id === sale.tCrossTypeId ? { ...item, quantity: item.quantity + sale.tCrossFeet! } : item));
      }
      if (sale.wallAnglePieces && sale.wallAngleId) {
        db.saveWallAngles((db.getWallAngles ? db.getWallAngles() : []).map((item) => item.id === sale.wallAngleId ? { ...item, quantity: item.quantity + sale.wallAnglePieces! } : item));
      }

      // 2. Cascading delete from customer ledger
      deleteLedgerByReference(sale.id, sale.customerId);

      triggerToast(`Invoice ${sale.invoiceNumber} removed from logs.`);
    }
  };

  // Triggers native browser print dialog
  const handlePrint = () => {
    window.print();
  };

  // Filter Sales list
  const filteredSales = sales.filter((s) => {
    return (
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.date.includes(searchQuery)
    );
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

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={14} />
          <input
            type="text"
            placeholder={getLanguageText(language, 'searchInvoices')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-800"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          {getLanguageText(language, 'generateInvoice')}
        </button>
      </div>

      {/* Sales Registry */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm no-print">
        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Dispatched Orders Registry</h3>
            <p className="text-[11px] text-slate-400 font-medium">Billed sales and customer receivable statements</p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded">
            Overall Dispatched: Rs. {Math.round(filteredSales.reduce((sum, s) => sum + s.grandTotal, 0)).toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Invoice No</th>
                <th className="py-3 px-2">Dispatch Date</th>
                <th className="py-3 px-2">Customer name</th>
                <th className="py-3 px-2">Manufactured Plate Type</th>
                <th className="py-3 px-2">Accessories</th>
                <th className="py-3 px-2 text-right">Quantity</th>
                <th className="py-3 px-2 text-right">Billed Rate</th>
                <th className="py-3 px-2 text-right">Grand Total</th>
                <th className="py-3 px-2 text-right">Invoice Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredSales.length > 0 ? (
                [...filteredSales].reverse().map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-indigo-600">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-400">{sale.date}</td>
                    <td className="py-3 px-2 font-semibold text-slate-800">{sale.customerName}</td>
                    <td className="py-3 px-2 text-slate-500">{sale.productName}</td>
                    <td className="py-3 px-2 text-slate-500">
                      {sale.tCrossTypeName && <div>{sale.tCrossTypeName}: {sale.tCrossFeet} {sale.tCrossUnit || 'feet'}</div>}
                      {sale.wallAngleName && <div>{sale.wallAngleName}: {sale.wallAnglePieces} {sale.wallAngleUnit || 'pieces'}</div>}
                      {!sale.tCrossTypeName && !sale.wallAngleName && '—'}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                      {sale.quantity.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-500">
                      Rs. {sale.rate}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-extrabold text-slate-800">
                      Rs. {Math.round(sale.grandTotal).toLocaleString()}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveInvoiceSale(sale)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                          title="Preview invoice statement"
                        >
                          <FileText size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Void dispatch invoice"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No orders dispatched yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH SALE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">Log Order Dispatch</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateSale} className="p-5 space-y-4 text-xs overflow-y-auto min-h-0">
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-red-700 font-medium">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Select Customer</label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Manufactured Plate Type</label>
                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-bold">
                  Plate 2*2 (Only System Product)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Billed Rate (Rs)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={customRate || ''}
                    onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Quantity (pcs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">T Cross (optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">T Cross type</label>
                    <select value={tCrossTypeId} onChange={(e) => setTCrossTypeId(e.target.value)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800">
                      <option value="">No T Cross</option>
                      {tCrosses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">Length (ft)</label>
                    <input
                      type="number"
                      min="0"
                      value={tCrossFeet || ''}
                      disabled={!tCrossTypeId}
                      onChange={(e) => setTCrossFeet(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                      placeholder="Feet"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">Rate per ft (Rs)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tCrossRate || ''}
                      disabled={!tCrossTypeId}
                      onChange={(e) => setTCrossRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                      placeholder="Rate / ft"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">Amount (Rs)</label>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center">
                      <span className="font-mono font-extrabold text-indigo-700">Rs. {(tCrossFeet * tCrossRate).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Wall Angle (optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">Quantity (pcs)</label>
                        <input type="number" min="0" step="any" value={wallAnglePieces || ''} onChange={(e) => setWallAnglePieces(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono" placeholder="Pieces" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">Rate per piece (Rs)</label>
                    <input type="number" min="0" step="any" value={wallAngleRate || ''} onChange={(e) => setWallAngleRate(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono" placeholder="Rate / piece" />
                  </div>
                  <div className="col-span-3 p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-end"><span className="font-mono font-extrabold text-orange-700">Wall Angle Amount: Rs. {wallAngleAmount.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Discount Amount (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex flex-col justify-center">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">Grand Bill Sum:</span>
                  <span className="font-mono font-extrabold text-sm text-indigo-700">Rs. {Math.round(calculatedGrandTotal).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Order Dispatch Memo</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sent via Chaudhary Goods Transport"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer shadow-sm"
              >
                Dispatch Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FULL INVOICE PRINT VIEW MODAL */}
      {activeInvoiceSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print-fullscreen">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col h-[90vh] print-modal-wrapper">
            {/* Header toolbar - hidden when printing */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 no-print shrink-0">
              <span className="text-xs font-bold text-slate-700">Dispatch Invoice Statement</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={13} />
                  Print Statement (PDF)
                </button>
                <button onClick={() => setActiveInvoiceSale(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Print-Ready Invoice Sheet */}
            <div className="p-8 flex-1 overflow-y-auto invoice-print-sheet text-xs font-sans text-slate-700 space-y-6">
              {/* Top Banner */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <h1 className="font-display font-black text-slate-900 text-lg uppercase tracking-tight">Prime Plate Factory Ltd</h1>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Premium Industrial Manufactured Plates</p>
                  <p className="text-slate-500 font-medium mt-2 leading-relaxed">
                    Sargodha Road, Gujranwala, Pakistan<br />
                    Phone: +92 55 1234567 • Email: billing@primeplates.com
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="font-display font-black text-slate-300 text-3xl uppercase tracking-wider">INVOICE</h2>
                  <p className="font-mono text-slate-700 font-bold mt-1 text-xs">NO: {activeInvoiceSale.invoiceNumber}</p>
                  <p className="font-mono text-slate-400 mt-0.5 font-medium text-[10px]">Date: {activeInvoiceSale.date}</p>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Billed To:</p>
                  <h3 className="font-display font-black text-slate-800 text-xs mt-1.5 leading-tight">{activeInvoiceSale.customerName}</h3>
                  <p className="text-slate-500 mt-1 font-medium leading-relaxed">
                    {customers.find(c => c.id === activeInvoiceSale.customerId)?.address || 'Address logged on directory'}<br />
                    Phone: {customers.find(c => c.id === activeInvoiceSale.customerId)?.phone || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Payment Status:</p>
                  <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-3 py-1 rounded-lg uppercase mt-2">
                    Charged to ledger
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium mt-2 leading-relaxed">This amount has been securely debited to the customer's credit account ledger statement.</p>
                </div>
              </div>

              {/* Products Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-right">Quantity</th>
                    <th className="py-2 text-right">Unit Rate</th>
                    <th className="py-2 text-right">Total Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr>
                    <td className="py-3 font-semibold text-slate-800">
                      {activeInvoiceSale.productName}<br />
                      <span className="text-[9px] text-slate-400 font-medium font-sans">Manufactured and packed industrial grade plate products.</span>
                    </td>
                    <td className="py-3 text-right font-mono">{activeInvoiceSale.quantity.toLocaleString()} pcs</td>
                    <td className="py-3 text-right font-mono">Rs. {activeInvoiceSale.rate}</td>
                    <td className="py-3 text-right font-mono">Rs. {activeInvoiceSale.totalAmount.toLocaleString()}</td>
                  </tr>
                  {activeInvoiceSale.tCrossAmount && activeInvoiceSale.tCrossFeet ? (
                    <tr>
                      <td className="py-3 font-semibold text-slate-800">{activeInvoiceSale.tCrossTypeName || 'T Cross'}</td>
                      <td className="py-3 text-right font-mono">{activeInvoiceSale.tCrossFeet.toLocaleString()} ft</td>
                      <td className="py-3 text-right font-mono">Rs. {activeInvoiceSale.tCrossRate}</td>
                      <td className="py-3 text-right font-mono">Rs. {activeInvoiceSale.tCrossAmount?.toLocaleString()}</td>
                    </tr>
                  ) : null}
                  {activeInvoiceSale.wallAngleAmount && activeInvoiceSale.wallAnglePieces ? (
                    <tr>
                      <td className="py-3 font-semibold text-slate-800">{activeInvoiceSale.wallAngleName || 'Wall Angle'}</td>
                      <td className="py-3 text-right font-mono">{activeInvoiceSale.wallAnglePieces.toLocaleString()} {activeInvoiceSale.wallAngleUnit || 'pieces'}</td>
                      <td className="py-3 text-right font-mono">Rs. {activeInvoiceSale.wallAngleRate}</td>
                      <td className="py-3 text-right font-mono">Rs. {activeInvoiceSale.wallAngleAmount.toLocaleString()}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              {/* Ledger Summary */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-64 space-y-2 text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {activeInvoiceSale.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount applied:</span>
                    <span className="font-mono">-Rs. {activeInvoiceSale.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-800">
                    <span>Grand Total:</span>
                    <span className="font-mono text-xs">Rs. {Math.round(activeInvoiceSale.grandTotal).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Terms and conditions */}
              <div className="pt-8 border-t border-slate-100/60 text-[9px] text-slate-400 leading-relaxed font-medium">
                <h4 className="font-extrabold uppercase tracking-widest text-slate-600 mb-1.5">Authorized Factory Notice</h4>
                <p>
                  1. This is a computer-generated dispatch receipt ledger entry statement.<br />
                  2. All manufactured plate goods are thoroughly checked before logistics transit.<br />
                  3. Please report any shipping transit issues within 48 hours of dispatch delivery.
                </p>
                <div className="mt-8 flex justify-between items-center text-[10px] pt-4 border-t border-slate-100">
                  <span>Prepared by: **ERP Operations System**</span>
                  <span className="border-t border-slate-300 w-36 text-center pt-1 font-bold text-slate-500">Receiver's Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
