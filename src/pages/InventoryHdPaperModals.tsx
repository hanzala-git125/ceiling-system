import React from 'react';
import { Plus, X, Boxes } from 'lucide-react';
import { HdPaperType } from '../types';

interface InventoryHdPaperModalsProps {
  showHdPaperTypeModal: boolean;
  setShowHdPaperTypeModal: (show: boolean) => void;
  showHdPaperRestockModal: boolean;
  setShowHdPaperRestockModal: (show: boolean) => void;
  selectedHdPaperType: HdPaperType | null;
  setSelectedHdPaperType: (type: HdPaperType | null) => void;
  newHdPaperTypeName: string;
  setNewHdPaperTypeName: (value: string) => void;
  newHdPaperTypeUnit: string;
  setNewHdPaperTypeUnit: (value: string) => void;
  newHdPaperTypeConversionFactor: number;
  setNewHdPaperTypeConversionFactor: (value: number) => void;
  newHdPaperTypeQuantity: number;
  setNewHdPaperTypeQuantity: (value: number) => void;
  newHdPaperTypeCost: number;
  setNewHdPaperTypeCost: (value: number) => void;
  newHdPaperTypeThreshold: number;
  setNewHdPaperTypeThreshold: (value: number) => void;
  editingHdPaperType: HdPaperType | null;
  resetHdPaperForm: () => void;
  handleCreateOrUpdateHdPaperType: (e: React.FormEvent) => void;
  hdPaperTypes: HdPaperType[];
  setEditingHdPaperType: (type: HdPaperType | null) => void;
  hdPaperRestockQty: number;
  setHdPaperRestockQty: (value: number) => void;
  hdPaperRestockCost: number;
  setHdPaperRestockCost: (value: number) => void;
  hdPaperRestockDate: string;
  setHdPaperRestockDate: (value: string) => void;
  hdPaperRestockNotes: string;
  setHdPaperRestockNotes: (value: string) => void;
  handleRestockHdPaperType: (e: React.FormEvent) => void;
}

export default function InventoryHdPaperModals({
  showHdPaperTypeModal,
  setShowHdPaperTypeModal,
  showHdPaperRestockModal,
  setShowHdPaperRestockModal,
  selectedHdPaperType,
  setSelectedHdPaperType,
  newHdPaperTypeName,
  setNewHdPaperTypeName,
  newHdPaperTypeUnit,
  setNewHdPaperTypeUnit,
  newHdPaperTypeConversionFactor,
  setNewHdPaperTypeConversionFactor,
  newHdPaperTypeQuantity,
  setNewHdPaperTypeQuantity,
  newHdPaperTypeCost,
  setNewHdPaperTypeCost,
  newHdPaperTypeThreshold,
  setNewHdPaperTypeThreshold,
  editingHdPaperType,
  resetHdPaperForm,
  handleCreateOrUpdateHdPaperType,
  hdPaperTypes,
  setEditingHdPaperType,
  hdPaperRestockQty,
  setHdPaperRestockQty,
  hdPaperRestockCost,
  setHdPaperRestockCost,
  hdPaperRestockDate,
  setHdPaperRestockDate,
  hdPaperRestockNotes,
  setHdPaperRestockNotes,
  handleRestockHdPaperType,
}: InventoryHdPaperModalsProps) {
  return (
    <>
      {showHdPaperTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                <Boxes size={16} className="text-slate-700" />
                Manage HD Paper Types
              </h3>
              <button onClick={() => { setShowHdPaperTypeModal(false); resetHdPaperForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <form onSubmit={handleCreateOrUpdateHdPaperType} className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-700">{editingHdPaperType ? 'Update HD paper type' : 'Add new HD paper type'}</h4>
                  {editingHdPaperType && (
                    <button type="button" onClick={resetHdPaperForm} className="text-[10px] font-semibold text-slate-500">Cancel edit</button>
                  )}
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">HD Paper Type Name</label>
                  <input
                    type="text"
                    required
                    value={newHdPaperTypeName}
                    onChange={(e) => setNewHdPaperTypeName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Stock Unit</label>
                    <select
                      value={newHdPaperTypeUnit}
                      onChange={(e) => setNewHdPaperTypeUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800"
                    >
                      <option value="pieces">pieces</option>
                      <option value="kg">kg</option>
                      <option value="rolls">rolls</option>
                      <option value="rims">rims</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Min. Alert Threshold</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newHdPaperTypeThreshold}
                      onChange={(e) => setNewHdPaperTypeThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Conversion Factor</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={newHdPaperTypeConversionFactor}
                      onChange={(e) => setNewHdPaperTypeConversionFactor(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Opening Stock Qty</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newHdPaperTypeQuantity}
                      onChange={(e) => setNewHdPaperTypeQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Cost Per Unit (Rs)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={newHdPaperTypeCost}
                    onChange={(e) => setNewHdPaperTypeCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                  />
                </div>
                <button type="submit" className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer">
                  {editingHdPaperType ? 'Save HD Paper Type' : 'Create HD Paper Type'}
                </button>
              </form>

              <div className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700">Existing HD Paper Types</h4>
                  <span className="text-[10px] text-slate-400">{hdPaperTypes.length} listed</span>
                </div>
                <div className="space-y-2">
                  {hdPaperTypes.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.quantity.toLocaleString()} {item.unit} • Min {item.minThreshold} {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedHdPaperType(item);
                            setHdPaperRestockQty(0);
                            setHdPaperRestockCost(0);
                            setShowHdPaperRestockModal(true);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                        >
                          Add Stock
                        </button>
                        <button
                          onClick={() => {
                            setEditingHdPaperType(item);
                            setNewHdPaperTypeName(item.name);
                            setNewHdPaperTypeUnit(item.unit);
                            setNewHdPaperTypeConversionFactor(item.conversionFactor);
                            setNewHdPaperTypeQuantity(0);
                            setNewHdPaperTypeCost(item.costPerUnit);
                            setNewHdPaperTypeThreshold(item.minThreshold);
                            setShowHdPaperTypeModal(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                          title="Edit"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHdPaperRestockModal && selectedHdPaperType && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus size={16} className="text-slate-700" />
                Add HD Paper Stock
              </h3>
              <button onClick={() => { setShowHdPaperRestockModal(false); setSelectedHdPaperType(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRestockHdPaperType} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-700 font-medium">Selected HD Paper Type: <span className="font-bold text-slate-900">{selectedHdPaperType.name}</span></p>
                <p className="text-slate-400 mt-1 font-semibold uppercase text-[10px]">Current Quantity: <span className="font-mono text-slate-700 font-bold">{selectedHdPaperType.quantity} {selectedHdPaperType.unit}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Qty ({selectedHdPaperType.unit})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={hdPaperRestockQty}
                    onChange={(e) => setHdPaperRestockQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Inward Date</label>
                  <input
                    type="date"
                    required
                    value={hdPaperRestockDate}
                    onChange={(e) => setHdPaperRestockDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Procurement Cost (Rs)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={hdPaperRestockCost}
                  onChange={(e) => setHdPaperRestockCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Notes / Memo</label>
                <input
                  type="text"
                  value={hdPaperRestockNotes}
                  onChange={(e) => setHdPaperRestockNotes(e.target.value)}
                  placeholder="e.g. Purchased paper batch"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>
              <button type="submit" className="w-full mt-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer">
                Add Stock
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
