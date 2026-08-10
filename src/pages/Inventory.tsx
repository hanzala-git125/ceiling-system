import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Trash2,
  Edit2,
  History,
  AlertTriangle,
  X,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Boxes
} from 'lucide-react';
import { db, adjustMaterialStock, getConversionLabel, addSupplierLedgerEntry, refreshSuppliersFromApi, refreshHdPaperTypesFromApi, refreshTCrossesFromApi, ensureSupplierMaterialAssociation, getTodayStr } from '../utils/api';
import { RawMaterial, InventoryTransaction, Supplier, PanniType, HdPaperType, TCross } from '../types';
import { AppLanguage, getLanguageText } from '../utils/i18n';
import InventoryHdPaperModals from './InventoryHdPaperModals';

interface InventoryProps {
  language?: AppLanguage;
}

export default function Inventory({ language = 'en' }: InventoryProps) {
  const [materials, setMaterials] = useState<RawMaterial[]>(db.getMaterials());
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(db.getTransactions());

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modal and Form States
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showPanniTypeModal, setShowPanniTypeModal] = useState(false);
  const [showTCrossTypeModal, setShowTCrossTypeModal] = useState(false);
  const [showPanniRestockModal, setShowPanniRestockModal] = useState(false);
  const [showTCrossRestockModal, setShowTCrossRestockModal] = useState(false);
  const [showHdPaperTypeModal, setShowHdPaperTypeModal] = useState(false);
  const [showHdPaperRestockModal, setShowHdPaperRestockModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [selectedPanniType, setSelectedPanniType] = useState<PanniType | null>(null);
  const [selectedHdPaperType, setSelectedHdPaperType] = useState<HdPaperType | null>(null);
  const [selectedTCross, setSelectedTCross] = useState<TCross | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>(db.getSuppliers());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [panniTypes, setPanniTypes] = useState<PanniType[]>(db.getPanniTypes());
  const [hdPaperTypes, setHdPaperTypes] = useState<HdPaperType[]>(db.getHdPaperTypes());
  const [tCrossTypes, setTCrossTypes] = useState<TCross[]>(db.getTCrosses ? db.getTCrosses() : []);
  const [expandedPanni, setExpandedPanni] = useState(true);
  const [expandedHdPaper, setExpandedHdPaper] = useState(true);
  const [expandedTCross, setExpandedTCross] = useState(true);

  // New Material form state
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('kg');
  const [newMatConversionFactor, setNewMatConversionFactor] = useState(1);
  const [newMatQuantity, setNewMatQuantity] = useState(0);
  const [newMatCost, setNewMatCost] = useState(0);
  const [newMatThreshold, setNewMatThreshold] = useState(100);

  // Restock form state
  const [restockQty, setRestockQty] = useState(0);
  const [restockCost, setRestockCost] = useState(0);
  const [restockNotes, setRestockNotes] = useState('');
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Material state
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  // Panni type form state
  const [newPanniTypeName, setNewPanniTypeName] = useState('Panni Type 1');
  const [newPanniTypeUnit, setNewPanniTypeUnit] = useState('pieces');
  const [newPanniTypeConversionFactor, setNewPanniTypeConversionFactor] = useState(1);
  const [newPanniTypeQuantity, setNewPanniTypeQuantity] = useState(0);
  const [newPanniTypeCost, setNewPanniTypeCost] = useState(0);
  const [newPanniTypeThreshold, setNewPanniTypeThreshold] = useState(100);
  const [editingPanniType, setEditingPanniType] = useState<PanniType | null>(null);
  const [panniRestockQty, setPanniRestockQty] = useState(0);
  const [panniRestockCost, setPanniRestockCost] = useState(0);
  const [panniRestockDate, setPanniRestockDate] = useState(getTodayStr());
  const [panniRestockNotes, setPanniRestockNotes] = useState('');

  const [newHdPaperTypeName, setNewHdPaperTypeName] = useState('HD Paper Type 1');
  const [newHdPaperTypeUnit, setNewHdPaperTypeUnit] = useState('pieces');
  const [newHdPaperTypeConversionFactor, setNewHdPaperTypeConversionFactor] = useState(1);
  const [newHdPaperTypeQuantity, setNewHdPaperTypeQuantity] = useState(0);
  const [newHdPaperTypeCost, setNewHdPaperTypeCost] = useState(0);
  const [newHdPaperTypeThreshold, setNewHdPaperTypeThreshold] = useState(100);
  const [editingHdPaperType, setEditingHdPaperType] = useState<HdPaperType | null>(null);
  const [hdPaperRestockQty, setHdPaperRestockQty] = useState(0);
  const [hdPaperRestockCost, setHdPaperRestockCost] = useState(0);
  const [hdPaperRestockDate, setHdPaperRestockDate] = useState(getTodayStr());
  const [hdPaperRestockNotes, setHdPaperRestockNotes] = useState('');

  // T Cross form state
  const [newTCrossName, setNewTCrossName] = useState('T Cross');
  const [newTCrossUnit, setNewTCrossUnit] = useState('feet');
  const [newTCrossConversionFactor, setNewTCrossConversionFactor] = useState(1);
  const [newTCrossQuantity, setNewTCrossQuantity] = useState(0);
  const [newTCrossCost, setNewTCrossCost] = useState(0);
  const [newTCrossThreshold, setNewTCrossThreshold] = useState(0);
  const [editingTCross, setEditingTCross] = useState<TCross | null>(null);
  const [tCrossRestockQty, setTCrossRestockQty] = useState(0);
  const [tCrossRestockCost, setTCrossRestockCost] = useState(0);
  const [tCrossRestockDate, setTCrossRestockDate] = useState(getTodayStr());
  const [tCrossRestockNotes, setTCrossRestockNotes] = useState('');

  // Notifications/Toasts helper
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void refreshSuppliersFromApi().then(setSuppliers);
  }, []);

  useEffect(() => {
    const existingPanniTypes = db.getPanniTypes();
    if (existingPanniTypes.length === 0) {
      const defaultPanniType: PanniType = {
        id: 'pt_' + Math.random().toString(36).substr(2, 9),
        name: 'Panni Type 1',
        unit: 'pieces',
        quantity: 0,
        costPerUnit: 0,
        minThreshold: 100,
        conversionFactor: 1,
        createdAt: getTodayStr(),
      };
      const persisted = db.savePanniTypes([defaultPanniType]);
      setPanniTypes(persisted);
    } else {
      setPanniTypes(existingPanniTypes);
    }
  }, []);

  useEffect(() => {
    const existingHdPaperTypes = db.getHdPaperTypes();
    if (existingHdPaperTypes.length === 0) {
      const defaultHdPaperType: HdPaperType = {
        id: 'hdpt_' + Math.random().toString(36).substr(2, 9),
        name: 'HD Paper Type 1',
        unit: 'pieces',
        quantity: 0,
        costPerUnit: 0,
        minThreshold: 100,
        conversionFactor: 1,
        createdAt: getTodayStr(),
      };
      const persisted = db.saveHdPaperTypes([defaultHdPaperType]);
      setHdPaperTypes(persisted);
    } else {
      setHdPaperTypes(existingHdPaperTypes);
    }

    void refreshHdPaperTypesFromApi().then((apiTypes) => {
      if (apiTypes.length > 0) {
        setHdPaperTypes(apiTypes);
      }
    });
    // Load T Cross types from local DB or API
    const existingTCross = (db.getTCrosses && db.getTCrosses()) || [];
    if (existingTCross.length === 0) {
      const defaultTCross: TCross = {
        id: 'tcross_' + Math.random().toString(36).substr(2, 9),
        name: 'T Cross',
        unit: 'feet',
        quantity: 0,
        costPerUnit: 0,
        minThreshold: 0,
        conversionFactor: 1,
        createdAt: getTodayStr(),
      };
      const persisted = db.saveTCrosses ? db.saveTCrosses([defaultTCross]) : [defaultTCross];
      setTCrossTypes(persisted);
    } else {
      setTCrossTypes(existingTCross);
    }

    void refreshTCrossesFromApi().then((apiItems) => {
      if (apiItems.length > 0) {
        setTCrossTypes(apiItems);
      }
    });
  }, []);

  const getSuggestedConversionFactor = (unit: string, name: string) => {
    const normalizedName = name.toLowerCase();
    const normalizedUnit = unit.toLowerCase();

    if (normalizedName.includes('plaster')) return 25;
    if (normalizedName.includes('tape')) return 272;
    if (normalizedName.includes('brown paper')) return 500;
    if (normalizedName.includes('panni')) return 50;
    if (normalizedName.includes('packing shopper')) return 40;
    if (normalizedUnit === 'rolls') return 272;
    if (normalizedUnit === 'rims') return 500;
    if (normalizedUnit === 'kg') return 50;
    if (normalizedUnit === 'bags') return 25;
    return 1;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const resetPanniForm = () => {
    setEditingPanniType(null);
    setNewPanniTypeName('Panni Type 1');
    setNewPanniTypeUnit('pieces');
    setNewPanniTypeConversionFactor(1);
    setNewPanniTypeQuantity(0);
    setNewPanniTypeCost(0);
    setNewPanniTypeThreshold(100);
  };

  const persistPanniTypes = (next: PanniType[]) => {
    const persisted = db.savePanniTypes(next);
    setPanniTypes(persisted);
    return persisted;
  };

  const resetHdPaperForm = () => {
    setEditingHdPaperType(null);
    setNewHdPaperTypeName('HD Paper Type 1');
    setNewHdPaperTypeUnit('pieces');
    setNewHdPaperTypeConversionFactor(1);
    setNewHdPaperTypeQuantity(0);
    setNewHdPaperTypeCost(0);
    setNewHdPaperTypeThreshold(100);
  };

  const resetTCrossForm = () => {
    setEditingTCross(null);
    setNewTCrossName('T Cross');
    setNewTCrossUnit('feet');
    setNewTCrossConversionFactor(1);
    setNewTCrossQuantity(0);
    setNewTCrossCost(0);
    setNewTCrossThreshold(0);
  };

  const persistHdPaperTypes = (next: HdPaperType[]) => {
    const persisted = db.saveHdPaperTypes(next);
    setHdPaperTypes(persisted);
    return persisted;
  };

  const persistTCrossTypes = (next: TCross[]) => {
    const persisted = db.saveTCrosses ? db.saveTCrosses(next) : next;
    setTCrossTypes(persisted);
    return persisted;
  };

  const calculateAverageCostPerUnit = (existingQuantity: number, existingCostPerUnit: number, addedQuantity: number, totalCost: number) => {
    if (addedQuantity <= 0) {
      return existingCostPerUnit;
    }
    const nextQuantity = existingQuantity + addedQuantity;
    if (nextQuantity <= 0 || totalCost <= 0) {
      return existingCostPerUnit;
    }
    const previousValue = existingQuantity * existingCostPerUnit;
    return (previousValue + totalCost) / nextQuantity;
  };

  const handleCreateOrUpdatePanniType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPanniTypeName.trim()) return;

    const normalizedName = newPanniTypeName.trim();
    const duplicate = panniTypes.find((item) => item.id !== editingPanniType?.id && item.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) {
      showToast('error', 'A panni type with this name already exists.');
      return;
    }

    const nextPanniTypes = editingPanniType
      ? panniTypes.map((item) => item.id === editingPanniType.id ? {
          ...item,
          name: normalizedName,
          unit: newPanniTypeUnit,
          quantity: editingPanniType.quantity + newPanniTypeQuantity,
          costPerUnit: newPanniTypeCost > 0 ? newPanniTypeCost : item.costPerUnit,
          minThreshold: newPanniTypeThreshold,
          conversionFactor: newPanniTypeConversionFactor > 0 ? newPanniTypeConversionFactor : item.conversionFactor,
        } : item)
      : [...panniTypes, {
          id: 'pt_' + Math.random().toString(36).substr(2, 9),
          name: normalizedName,
          unit: newPanniTypeUnit,
          quantity: newPanniTypeQuantity,
          costPerUnit: newPanniTypeCost,
          minThreshold: newPanniTypeThreshold,
          conversionFactor: newPanniTypeConversionFactor > 0 ? newPanniTypeConversionFactor : 1,
          createdAt: getTodayStr(),
        }];

    persistPanniTypes(nextPanniTypes);
    resetPanniForm();
    setShowPanniTypeModal(false);
    showToast('success', editingPanniType ? 'Panni type updated.' : 'Panni type created.');
  };

  const handleCreateOrUpdateHdPaperType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHdPaperTypeName.trim()) return;

    const normalizedName = newHdPaperTypeName.trim();
    const duplicate = hdPaperTypes.find((item) => item.id !== editingHdPaperType?.id && item.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) {
      showToast('error', 'An HD paper type with this name already exists.');
      return;
    }

    const nextHdPaperTypes = editingHdPaperType
      ? hdPaperTypes.map((item) => item.id === editingHdPaperType.id ? {
          ...item,
          name: normalizedName,
          unit: newHdPaperTypeUnit,
          quantity: editingHdPaperType.quantity + newHdPaperTypeQuantity,
          costPerUnit: newHdPaperTypeCost > 0 ? newHdPaperTypeCost : item.costPerUnit,
          minThreshold: newHdPaperTypeThreshold,
          conversionFactor: newHdPaperTypeConversionFactor > 0 ? newHdPaperTypeConversionFactor : item.conversionFactor,
        } : item)
      : [...hdPaperTypes, {
          id: 'hdpt_' + Math.random().toString(36).substr(2, 9),
          name: normalizedName,
          unit: newHdPaperTypeUnit,
          quantity: newHdPaperTypeQuantity,
          costPerUnit: newHdPaperTypeCost,
          minThreshold: newHdPaperTypeThreshold,
          conversionFactor: newHdPaperTypeConversionFactor > 0 ? newHdPaperTypeConversionFactor : 1,
          createdAt: getTodayStr(),
        }];

    persistHdPaperTypes(nextHdPaperTypes);
    resetHdPaperForm();
    setShowHdPaperTypeModal(false);
    showToast('success', editingHdPaperType ? 'HD paper type updated.' : 'HD paper type created.');
  };

  const handleCreateOrUpdateTCross = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTCrossName.trim()) return;

    const normalizedName = newTCrossName.trim();
    const duplicate = tCrossTypes.find((item) => item.id !== editingTCross?.id && item.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) {
      showToast('error', 'A T Cross entry with this name already exists.');
      return;
    }

    const next = editingTCross
      ? tCrossTypes.map((item) => item.id === editingTCross.id ? {
          ...item,
          name: normalizedName,
          unit: newTCrossUnit,
          quantity: editingTCross.quantity + newTCrossQuantity,
          costPerUnit: newTCrossCost > 0 ? newTCrossCost : item.costPerUnit,
          minThreshold: newTCrossThreshold,
          conversionFactor: newTCrossConversionFactor > 0 ? newTCrossConversionFactor : item.conversionFactor,
        } : item)
      : [...tCrossTypes, {
          id: 'tcross_' + Math.random().toString(36).substr(2, 9),
          name: normalizedName,
          unit: newTCrossUnit,
          quantity: newTCrossQuantity,
          costPerUnit: newTCrossCost,
          minThreshold: newTCrossThreshold,
          conversionFactor: newTCrossConversionFactor > 0 ? newTCrossConversionFactor : 1,
          createdAt: getTodayStr(),
        }];

    persistTCrossTypes(next);
    resetTCrossForm();
    setShowTCrossTypeModal(false);
    showToast('success', editingTCross ? 'T Cross updated.' : 'T Cross created.');
  };

  const handleDeletePanniType = (id: string, name: string) => {
    if (confirm(`Delete ${name}? This will remove the panni type from the inventory.`)) {
      const remaining = panniTypes.filter((item) => item.id !== id);
      if (remaining.length === 0) {
        persistPanniTypes([{
          id: 'pt_' + Math.random().toString(36).substr(2, 9),
          name: 'Panni Type 1',
          unit: 'pieces',
          quantity: 0,
          costPerUnit: 0,
          minThreshold: 100,
          conversionFactor: 1,
          createdAt: getTodayStr(),
        }]);
      } else {
        persistPanniTypes(remaining);
      }
      showToast('success', `${name} deleted.`);
    }
  };

  const handleDeleteHdPaperType = (id: string, name: string) => {
    if (confirm(`Delete ${name}? This will remove the HD paper type from the inventory.`)) {
      const remaining = hdPaperTypes.filter((item) => item.id !== id);
      if (remaining.length === 0) {
        persistHdPaperTypes([{
          id: 'hdpt_' + Math.random().toString(36).substr(2, 9),
          name: 'HD Paper Type 1',
          unit: 'pieces',
          quantity: 0,
          costPerUnit: 0,
          minThreshold: 100,
          conversionFactor: 1,
          createdAt: getTodayStr(),
        }]);
      } else {
        persistHdPaperTypes(remaining);
      }
      showToast('success', `${name} deleted.`);
    }
  };

  const handleDeleteTCross = (id: string, name: string) => {
    if (confirm(`Delete ${name}? This will remove the T Cross entry from the inventory.`)) {
      const remaining = tCrossTypes.filter((item) => item.id !== id);
      if (remaining.length === 0) {
        persistTCrossTypes([{
          id: 'tcross_' + Math.random().toString(36).substr(2, 9),
          name: 'T Cross',
          unit: 'feet',
          quantity: 0,
          costPerUnit: 0,
          minThreshold: 0,
          conversionFactor: 1,
          createdAt: getTodayStr(),
        }]);
      } else {
        persistTCrossTypes(remaining);
      }
      showToast('success', `${name} deleted.`);
    }
  };

  const handleRestockPanniType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPanniType || panniRestockQty <= 0) return;

    const nextPanniTypes = panniTypes.map((item) => item.id === selectedPanniType.id ? {
      ...item,
      quantity: item.quantity + panniRestockQty,
      costPerUnit: calculateAverageCostPerUnit(item.quantity, item.costPerUnit, panniRestockQty, panniRestockCost),
    } : item);

    persistPanniTypes(nextPanniTypes);
    setSelectedPanniType(null);
    setPanniRestockQty(0);
    setPanniRestockCost(0);
    setPanniRestockDate(getTodayStr());
    setPanniRestockNotes('');
    setShowPanniRestockModal(false);
    showToast('success', `Stock added to ${selectedPanniType.name}.`);
  };

  const handleRestockHdPaperType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHdPaperType || hdPaperRestockQty <= 0) return;

    const nextHdPaperTypes = hdPaperTypes.map((item) => item.id === selectedHdPaperType.id ? {
      ...item,
      quantity: item.quantity + hdPaperRestockQty,
      costPerUnit: calculateAverageCostPerUnit(item.quantity, item.costPerUnit, hdPaperRestockQty, hdPaperRestockCost),
    } : item);

    persistHdPaperTypes(nextHdPaperTypes);
    setSelectedHdPaperType(null);
    setHdPaperRestockQty(0);
    setHdPaperRestockCost(0);
    setHdPaperRestockDate(getTodayStr());
    setHdPaperRestockNotes('');
    setShowHdPaperRestockModal(false);
    showToast('success', `Stock added to ${selectedHdPaperType.name}.`);
  };

  const handleRestockTCross = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTCross || tCrossRestockQty <= 0) return;

    const next = tCrossTypes.map((item) => item.id === selectedTCross.id ? {
      ...item,
      quantity: item.quantity + tCrossRestockQty,
      costPerUnit: tCrossRestockCost > 0 ? calculateAverageCostPerUnit(item.quantity, item.costPerUnit, tCrossRestockQty, tCrossRestockCost) : item.costPerUnit,
    } : item);

    persistTCrossTypes(next);
    setSelectedTCross(null);
    setTCrossRestockQty(0);
    setTCrossRestockCost(0);
    setTCrossRestockDate(getTodayStr());
    setTCrossRestockNotes('');
    setShowTCrossRestockModal(false);
    showToast('success', `Stock added to ${selectedTCross.name}.`);
  };

  // Add a brand new raw material type
  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;

    const normalizedMaterialName = newMatName.trim();
    const isPanniMaterial = normalizedMaterialName.toLowerCase().includes('panni');
    if (materials.some((m) => m.name.toLowerCase() === normalizedMaterialName.toLowerCase())) {
      showToast('error', 'A raw material with this name already exists.');
      return;
    }

    const selectedUnit = normalizedMaterialName.toLowerCase().includes('plaster') ? 'bags' : newMatUnit;
    const suggestedConversionFactor = getSuggestedConversionFactor(selectedUnit, normalizedMaterialName);
    const finalConversionFactor = newMatConversionFactor > 1 ? newMatConversionFactor : suggestedConversionFactor;

    const newMaterial: RawMaterial = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      name: normalizedMaterialName,
      quantity: newMatQuantity,
      unit: selectedUnit,
      costPerUnit: newMatCost,
      minThreshold: newMatThreshold,
      conversionFactor: finalConversionFactor > 0 ? finalConversionFactor : 1,
      updatedAt: restockDate
    };

    const updatedMaterials = [...materials, newMaterial];
    const persistedMaterials = db.saveMaterials(updatedMaterials);
    setMaterials(persistedMaterials);

    // If initial quantity is greater than zero, write an 'in' transaction
    if (newMatQuantity > 0) {
      const txs = db.getTransactions();
      const newTx: InventoryTransaction = {
        id: 'tx_' + Math.random().toString(36).substr(2, 9),
        materialId: newMaterial.id,
        materialName: newMaterial.name,
        type: 'in',
        quantity: newMatQuantity,
        cost: newMatQuantity * newMatCost,
        date: restockDate,
        notes: 'Initial stock setup'
      };
      txs.push(newTx);
      db.saveTransactions(txs);
      setTransactions(txs);
    }

    // Reset Form
    setNewMatName('');
    setNewMatUnit('kg');
    setNewMatConversionFactor(1);
    setNewMatQuantity(0);
    setNewMatCost(0);
    setNewMatThreshold(100);
    setShowAddMaterialModal(false);
    showToast('success', `${newMaterial.name} created successfully.`);
  };

  // Edit material threshold or base cost
  const handleUpdateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    const updated = materials.map(m => m.id === editingMaterial.id ? editingMaterial : m);
    const persisted = db.saveMaterials(updated);
    setMaterials(persisted);
    setEditingMaterial(null);
    showToast('success', 'Material parameters updated.');
  };

  // Delete material type
  const handleDeleteMaterial = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? This will remove the material from inventory list.`)) {
      const updated = materials.filter(m => m.id !== id);
      const persisted = db.saveMaterials(updated);
      setMaterials(persisted);
      showToast('success', `${name} deleted from materials list.`);
    }
  };

  // Handle restock (Add Stock)
  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || restockQty <= 0) return;

    adjustMaterialStock(
      selectedMaterial.id,
      restockQty,
      'in',
      restockCost,
      restockDate,
      restockNotes || `Restocked ${restockQty} ${selectedMaterial.unit}`
    );

    const updatedMaterials = db.getMaterials().map((material) => {
      if (material.id !== selectedMaterial.id) {
        return material;
      }

      return {
        ...material,
        quantity: material.quantity,
        costPerUnit: calculateAverageCostPerUnit(selectedMaterial.quantity, selectedMaterial.costPerUnit, restockQty, restockCost),
        updatedAt: restockDate,
      };
    });
    db.saveMaterials(updatedMaterials);
    setMaterials(updatedMaterials);

    let linkedSuppliers = suppliers;
    if (selectedSupplierId) {
      linkedSuppliers = ensureSupplierMaterialAssociation(selectedSupplierId, selectedMaterial.name);
      addSupplierLedgerEntry(
        selectedSupplierId,
        restockDate,
        'Purchase',
        'purchase_' + Math.random().toString(36).substr(2, 9),
        restockCost,
        0,
        `Stock purchase for ${selectedMaterial.name} (${restockQty} ${selectedMaterial.unit})`
      );
    }

    // Refresh state from DB
    setMaterials(db.getMaterials());
    setTransactions(db.getTransactions());
    setSuppliers(linkedSuppliers);

    // Reset
    setRestockQty(0);
    setRestockCost(0);
    setRestockNotes('');
    setSelectedSupplierId('');
    setShowRestockModal(false);
    setSelectedMaterial(null);
    showToast('success', `Stock increased for ${selectedMaterial.name}.`);
  };

  // Filter materials based on search & low stock toggle
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = filterLowStock ? m.quantity <= m.minThreshold : true;
    return matchesSearch && matchesLowStock;
  });

  const visibleMaterials = filteredMaterials.filter((m) => !m.name.toLowerCase().includes('panni') && !m.name.toLowerCase().includes('hd paper'));
  const panniStockTotal = panniTypes.reduce((sum, item) => sum + item.quantity, 0);
  const hdPaperStockTotal = hdPaperTypes.reduce((sum, item) => sum + item.quantity, 0);
  const panniLow = panniTypes.some((item) => item.quantity <= item.minThreshold);
  const hdPaperLow = hdPaperTypes.some((item) => item.quantity <= item.minThreshold);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 text-xs font-semibold shadow-lg ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          <FileCheck size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Controls Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Search & Low Stock Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search raw materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
            />
          </div>
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
              filterLowStock
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} />
            {filterLowStock ? 'Showing Low Stock' : 'Filter Low Stock'}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPanniTypeModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Boxes size={14} />
            Manage Panni Types
          </button>
          <button
            onClick={() => setShowTCrossTypeModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Boxes size={14} />
            Manage T Cross
          </button>
          <button
            onClick={() => setShowHdPaperTypeModal(true)}
            className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Package size={14} />
            Manage HD Paper Types
          </button>
          <button
            onClick={() => setShowAddMaterialModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus size={14} />
            Create Material Type
          </button>
        </div>
      </div>

      {/* Grid Layout for Materials and History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Materials Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Material Stock Ledger</h3>
              <p className="text-[11px] text-slate-400 font-medium">Real-time inventory ledger quantities and costs</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded">
              {filteredMaterials.length} materials listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Material Name</th>
                  <th className="py-3 px-2 text-right">Available Qty</th>
                  <th className="py-3 px-2 text-right">Unit Cost</th>
                  <th className="py-3 px-2 text-right">Stock Value</th>
                  <th className="py-3 px-2 text-center">Alert Limit</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {visibleMaterials.length > 0 || panniTypes.length > 0 ? (
                  <>
                    <tr className={`hover:bg-slate-50/50 transition-colors ${panniLow ? 'bg-amber-50/20' : ''}`}>
                      <td className="py-3 px-2 font-semibold">
                        <button
                          type="button"
                          onClick={() => setExpandedPanni((value) => !value)}
                          className="flex items-center gap-2 text-left"
                        >
                          {expandedPanni ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                          <div>
                            <p className="text-slate-800">Panni</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Expandable stock types for different panni varieties</p>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold">
                        <span className={panniLow ? 'text-amber-600 font-extrabold' : 'text-slate-800'}>{panniStockTotal.toLocaleString()}</span>{' '}
                        <span className="text-[10px] font-normal text-slate-400">stock units</span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-500">—</td>
                      <td className="py-3 px-2 text-right font-mono font-semibold text-slate-800">—</td>
                      <td className="py-3 px-2 text-center font-mono text-slate-400">—</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => setShowPanniTypeModal(true)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPanni && panniTypes.map((panniType) => {
                      const isLow = panniType.quantity <= panniType.minThreshold;
                      const stockValue = panniType.quantity * panniType.costPerUnit;
                      return (
                        <tr key={panniType.id} className={`bg-slate-50/60 hover:bg-slate-100/70 transition-colors ${isLow ? 'bg-amber-50/40' : ''}`}>
                          <td className="py-2.5 px-6 font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                              <div>
                                <p className="text-slate-800">{panniType.name}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{getConversionLabel(panniType.unit)}: {panniType.conversionFactor}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">
                            <span className={isLow ? 'text-amber-600 font-extrabold' : 'text-slate-800'}>{panniType.quantity.toLocaleString()}</span>{' '}
                            <span className="text-[10px] font-normal text-slate-400">{panniType.unit}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-500">Rs. {panniType.costPerUnit.toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">Rs. {Math.round(stockValue).toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-400">{panniType.minThreshold} {panniType.unit}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPanniType(panniType);
                                  setPanniRestockQty(0);
                                  setPanniRestockCost(0);
                                  setShowPanniRestockModal(true);
                                }}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                              >
                                Add Stock
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPanniType(panniType);
                                  setNewPanniTypeName(panniType.name);
                                  setNewPanniTypeUnit(panniType.unit);
                                  setNewPanniTypeConversionFactor(panniType.conversionFactor);
                                  setNewPanniTypeQuantity(0);
                                  setNewPanniTypeCost(panniType.costPerUnit);
                                  setNewPanniTypeThreshold(panniType.minThreshold);
                                  setShowPanniTypeModal(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                                title="Edit Panni Type"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeletePanniType(panniType.id, panniType.name)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete Panni Type"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className={`hover:bg-slate-50/50 transition-colors ${false ? 'bg-emerald-50/20' : ''}`}>
                      <td className="py-3 px-2 font-semibold">
                        <button
                          type="button"
                          onClick={() => setExpandedTCross((value) => !value)}
                          className="flex items-center gap-2 text-left"
                        >
                          {expandedTCross ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                          <div>
                            <p className="text-slate-800">T Cross</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Frame material measured in feet</p>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold">
                        <span className={'text-slate-800'}>{tCrossTypes.reduce((s, it) => s + it.quantity, 0).toLocaleString()}</span>{' '}
                        <span className="text-[10px] font-normal text-slate-400">feet</span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-500">—</td>
                      <td className="py-3 px-2 text-right font-mono font-semibold text-slate-800">—</td>
                      <td className="py-3 px-2 text-center font-mono text-slate-400">—</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => setShowTCrossTypeModal(true)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTCross && tCrossTypes.map((tc) => {
                      const isLow = tc.quantity <= tc.minThreshold;
                      const stockValue = tc.quantity * tc.costPerUnit;
                      return (
                        <tr key={tc.id} className={`bg-slate-50/60 hover:bg-slate-100/70 transition-colors ${isLow ? 'bg-emerald-50/40' : ''}`}>
                          <td className="py-2.5 px-6 font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                              <div>
                                <p className="text-slate-800">{tc.name}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{getConversionLabel(tc.unit)}: {tc.conversionFactor}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">
                            <span className={isLow ? 'text-emerald-600 font-extrabold' : 'text-slate-800'}>{tc.quantity.toLocaleString()}</span>{' '}
                            <span className="text-[10px] font-normal text-slate-400">{tc.unit}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-500">Rs. {tc.costPerUnit.toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">Rs. {Math.round(stockValue).toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-400">{tc.minThreshold} {tc.unit}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTCross(tc);
                                  setTCrossRestockQty(0);
                                  setTCrossRestockCost(0);
                                  setShowTCrossRestockModal(true);
                                }}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                              >
                                Add Stock
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTCross(tc);
                                  setNewTCrossName(tc.name);
                                  setNewTCrossUnit(tc.unit);
                                  setNewTCrossConversionFactor(tc.conversionFactor);
                                  setNewTCrossQuantity(0);
                                  setNewTCrossCost(tc.costPerUnit);
                                  setNewTCrossThreshold(tc.minThreshold);
                                  setShowTCrossTypeModal(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                                title="Edit T Cross"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteTCross(tc.id, tc.name)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete T Cross"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className={`hover:bg-slate-50/50 transition-colors ${hdPaperLow ? 'bg-slate-900/5' : ''}`}>
                      <td className="py-3 px-2 font-semibold">
                        <button
                          type="button"
                          onClick={() => setExpandedHdPaper((value) => !value)}
                          className="flex items-center gap-2 text-left"
                        >
                          {expandedHdPaper ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                          <div>
                            <p className="text-slate-800">HD Paper</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Expandable stock types for different HD paper varieties</p>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold">
                        <span className={hdPaperLow ? 'text-slate-900 font-extrabold' : 'text-slate-800'}>{hdPaperStockTotal.toLocaleString()}</span>{' '}
                        <span className="text-[10px] font-normal text-slate-400">stock units</span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-500">—</td>
                      <td className="py-3 px-2 text-right font-mono font-semibold text-slate-800">—</td>
                      <td className="py-3 px-2 text-center font-mono text-slate-400">—</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => setShowHdPaperTypeModal(true)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedHdPaper && hdPaperTypes.map((hdPaperType) => {
                      const isLow = hdPaperType.quantity <= hdPaperType.minThreshold;
                      const stockValue = hdPaperType.quantity * hdPaperType.costPerUnit;
                      return (
                        <tr key={hdPaperType.id} className={`bg-slate-50/60 hover:bg-slate-100/70 transition-colors ${isLow ? 'bg-slate-900/5' : ''}`}>
                          <td className="py-2.5 px-6 font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-slate-900 animate-pulse' : 'bg-slate-300'}`} />
                              <div>
                                <p className="text-slate-800">{hdPaperType.name}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{getConversionLabel(hdPaperType.unit)}: {hdPaperType.conversionFactor}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">
                            <span className={isLow ? 'text-slate-900 font-extrabold' : 'text-slate-800'}>{hdPaperType.quantity.toLocaleString()}</span>{' '}
                            <span className="text-[10px] font-normal text-slate-400">{hdPaperType.unit}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-500">Rs. {hdPaperType.costPerUnit.toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">Rs. {Math.round(stockValue).toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-400">{hdPaperType.minThreshold} {hdPaperType.unit}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedHdPaperType(hdPaperType);
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
                                  setEditingHdPaperType(hdPaperType);
                                  setNewHdPaperTypeName(hdPaperType.name);
                                  setNewHdPaperTypeUnit(hdPaperType.unit);
                                  setNewHdPaperTypeConversionFactor(hdPaperType.conversionFactor);
                                  setNewHdPaperTypeQuantity(0);
                                  setNewHdPaperTypeCost(hdPaperType.costPerUnit);
                                  setNewHdPaperTypeThreshold(hdPaperType.minThreshold);
                                  setShowHdPaperTypeModal(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                                title="Edit HD Paper Type"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteHdPaperType(hdPaperType.id, hdPaperType.name)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete HD Paper Type"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleMaterials.map((mat) => {
                      const isLow = mat.quantity <= mat.minThreshold;
                      const stockValue = mat.quantity * mat.costPerUnit;
                      return (
                        <tr key={mat.id} className={`hover:bg-slate-50/50 transition-colors ${isLow ? 'bg-rose-50/20' : ''}`}>
                          <td className="py-3 px-2 font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
                              <div>
                                <p className="text-slate-800">{mat.name}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                  {getConversionLabel(mat.unit)}: {mat.conversionFactor}
                                </p>
                                {isLow && <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Critical Low</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold">
                            <span className={isLow ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                              {mat.quantity.toLocaleString()}
                            </span>{' '}
                            <span className="text-[10px] font-normal text-slate-400">{mat.unit}</span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-500">
                            Rs. {mat.costPerUnit.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-semibold text-slate-800">
                            Rs. {Math.round(stockValue).toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-400">
                            {mat.minThreshold} {mat.unit}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedMaterial(mat);
                                  setRestockCost(0);
                                  setRestockQty(0);
                                  setShowRestockModal(true);
                                }}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                              >
                                Add Stock
                              </button>
                              <button
                                onClick={() => setEditingMaterial(mat)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                                title="Edit Threshold"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete Material"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No materials matching search queries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={16} className="text-indigo-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Recent Stock Changes</h3>
            </div>
            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wider">
              Auditable Logs
            </span>
          </div>

          <div className="space-y-4 max-h-120 overflow-y-auto pr-1">
            {transactions.length > 0 ? (
              [...transactions]
                .reverse()
                .slice(0, 15)
                .map((tx) => (
                  <div key={tx.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-xs flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      {tx.type === 'in' ? (
                        <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <ArrowUpRight size={14} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                          <ArrowDownRight size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{tx.materialName}</span>
                        <span className="text-[10px] font-bold font-mono text-slate-400">{tx.date}</span>
                      </div>
                      <p className="text-slate-500 mt-1">
                        {tx.type === 'in' ? '+' : '-'}{tx.quantity.toLocaleString()} {tx.type === 'in' ? 'restocked' : 'consumed'}
                      </p>
                      {tx.cost > 0 && (
                        <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                          Cost: Rs. {tx.cost.toLocaleString()}
                        </p>
                      )}
                      {tx.notes && <p className="text-[10px] text-slate-400 mt-1 italic truncate">"{tx.notes}"</p>}
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-8">No stock transactions logged yet.</p>
            )}
          </div>
        </div>
      </div>

      {showPanniTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                <Boxes size={16} className="text-amber-600" />
                Manage Panni Types
              </h3>
              <button onClick={() => { setShowPanniTypeModal(false); resetPanniForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <form onSubmit={handleCreateOrUpdatePanniType} className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-700">{editingPanniType ? 'Update panni type' : 'Add new panni type'}</h4>
                  {editingPanniType && (
                    <button type="button" onClick={resetPanniForm} className="text-[10px] font-semibold text-slate-500">Cancel edit</button>
                  )}
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Panni Type Name</label>
                  <input
                    type="text"
                    required
                    value={newPanniTypeName}
                    onChange={(e) => setNewPanniTypeName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Stock Unit</label>
                    <select
                      value={newPanniTypeUnit}
                      onChange={(e) => setNewPanniTypeUnit(e.target.value)}
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
                      value={newPanniTypeThreshold}
                      onChange={(e) => setNewPanniTypeThreshold(parseInt(e.target.value) || 0)}
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
                      step="0.01"
                      required
                      value={newPanniTypeConversionFactor}
                      onChange={(e) => setNewPanniTypeConversionFactor(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Opening Stock Qty</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newPanniTypeQuantity}
                      onChange={(e) => setNewPanniTypeQuantity(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Cost Per Unit (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPanniTypeCost}
                    onChange={(e) => setNewPanniTypeCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                  />
                </div>
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer">
                  {editingPanniType ? 'Save Panni Type' : 'Create Panni Type'}
                </button>
              </form>

              <div className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700">Existing Panni Types</h4>
                  <span className="text-[10px] text-slate-400">{panniTypes.length} listed</span>
                </div>
                <div className="space-y-2">
                  {panniTypes.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.quantity.toLocaleString()} {item.unit} • Min {item.minThreshold} {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPanniType(item);
                            setPanniRestockQty(0);
                            setPanniRestockCost(0);
                            setShowPanniRestockModal(true);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                        >
                          Add Stock
                        </button>
                        <button
                          onClick={() => {
                            setEditingPanniType(item);
                            setNewPanniTypeName(item.name);
                            setNewPanniTypeUnit(item.unit);
                            setNewPanniTypeConversionFactor(item.conversionFactor);
                            setNewPanniTypeQuantity(0);
                            setNewPanniTypeCost(item.costPerUnit);
                            setNewPanniTypeThreshold(item.minThreshold);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeletePanniType(item.id, item.name)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={12} />
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

        {showTCrossTypeModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Boxes size={16} className="text-emerald-600" />
                  Manage T Cross
                </h3>
                <button onClick={() => { setShowTCrossTypeModal(false); resetTCrossForm(); }} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4 text-xs">
                <form onSubmit={handleCreateOrUpdateTCross} className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-700">{editingTCross ? 'Update T Cross' : 'Add T Cross'}</h4>
                    {editingTCross && (
                      <button type="button" onClick={resetTCrossForm} className="text-[10px] font-semibold text-slate-500">Cancel edit</button>
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={newTCrossName}
                      onChange={(e) => setNewTCrossName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Stock Unit</label>
                      <select
                        value={newTCrossUnit}
                        onChange={(e) => setNewTCrossUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800"
                      >
                        <option value="feet">feet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Min. Alert Threshold</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newTCrossThreshold}
                        onChange={(e) => setNewTCrossThreshold(parseInt(e.target.value) || 0)}
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
                        step="0.01"
                        required
                        value={newTCrossConversionFactor}
                        onChange={(e) => setNewTCrossConversionFactor(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Opening Stock Qty</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newTCrossQuantity}
                        onChange={(e) => setNewTCrossQuantity(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Cost Per Unit (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={newTCrossCost}
                      onChange={(e) => setNewTCrossCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-white text-slate-800 font-mono"
                    />
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer">
                    {editingTCross ? 'Save T Cross' : 'Create T Cross'}
                  </button>
                </form>

                <div className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700">Existing T Cross Entries</h4>
                    <span className="text-[10px] text-slate-400">{tCrossTypes.length} listed</span>
                  </div>
                  <div className="space-y-2">
                    {tCrossTypes.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                        <div>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.quantity.toLocaleString()} {item.unit} • Min {item.minThreshold} {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTCross(item);
                              setTCrossRestockQty(0);
                              setTCrossRestockCost(0);
                              setShowTCrossRestockModal(true);
                            }}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                          >
                            Add Stock
                          </button>
                          <button
                            onClick={() => {
                              setEditingTCross(item);
                              setNewTCrossName(item.name);
                              setNewTCrossUnit(item.unit);
                              setNewTCrossConversionFactor(item.conversionFactor);
                              setNewTCrossQuantity(0);
                              setNewTCrossCost(item.costPerUnit);
                              setNewTCrossThreshold(item.minThreshold);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteTCross(item.id, item.name)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={12} />
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

      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                <Package size={16} className="text-indigo-600" />
                Add New Raw Material
              </h3>
              <button onClick={() => setShowAddMaterialModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateMaterial} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Material Name</label>
                <input
                  type="text"
                  required
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  placeholder="e.g. Premium White Plaster"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Stock Unit</label>
                  <select
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="grams">grams (g)</option>
                    <option value="bags">bags</option>
                    <option value="rolls">rolls</option>
                    <option value="rims">rims</option>
                    <option value="pieces">pieces (pcs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Min. Alert Threshold</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMatThreshold}
                    onChange={(e) => setNewMatThreshold(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Conversion Factor</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={newMatConversionFactor}
                    onChange={(e) => setNewMatConversionFactor(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {getConversionLabel(newMatUnit)} • Suggested default: {getSuggestedConversionFactor(newMatUnit, newMatName.trim())}
                  </p>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Cost Per Unit (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newMatCost}
                    onChange={(e) => setNewMatCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100/50 pt-3">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMatQuantity}
                    onChange={(e) => setNewMatQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Inward Date</label>
                <input
                  type="date"
                  value={restockDate}
                  onChange={(e) => setRestockDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                Create and Seed Material
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Material Alert Thresholds */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">
                Edit Material Configuration
              </h3>
              <button onClick={() => setEditingMaterial(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateMaterial} className="p-5 space-y-4 text-xs">
              <p className="font-semibold text-slate-700">Adjust parameters for: <span className="text-indigo-600 font-bold">{editingMaterial.name}</span></p>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Standard Cost (Rs / {editingMaterial.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingMaterial.costPerUnit}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, costPerUnit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Minimum Alert Threshold ({editingMaterial.unit})</label>
                <input
                  type="number"
                  required
                  value={editingMaterial.minThreshold}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, minThreshold: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Quantity ({editingMaterial.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editingMaterial.quantity}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Set quantity to 0 or any value needed for production adjustments.</p>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Conversion Factor ({getConversionLabel(editingMaterial.unit)})</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={editingMaterial.conversionFactor ?? 1}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, conversionFactor: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {showPanniRestockModal && selectedPanniType && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus size={16} className="text-amber-600" />
                Add Panni Stock
              </h3>
              <button onClick={() => { setShowPanniRestockModal(false); setSelectedPanniType(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRestockPanniType} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                <p className="text-slate-700 font-medium">Selected Panni Type: <span className="font-bold text-slate-900">{selectedPanniType.name}</span></p>
                <p className="text-slate-400 mt-1 font-semibold uppercase text-[10px]">Current Quantity: <span className="font-mono text-amber-700 font-bold">{selectedPanniType.quantity} {selectedPanniType.unit}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Qty ({selectedPanniType.unit})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={panniRestockQty}
                    onChange={(e) => setPanniRestockQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Inward Date</label>
                  <input
                    type="date"
                    required
                    value={panniRestockDate}
                    onChange={(e) => setPanniRestockDate(e.target.value)}
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
                  value={panniRestockCost}
                  onChange={(e) => setPanniRestockCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Notes / Memo</label>
                <input
                  type="text"
                  value={panniRestockNotes}
                  onChange={(e) => setPanniRestockNotes(e.target.value)}
                  placeholder="e.g. Purchased new batch"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>
              <button type="submit" className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer">
                Add Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {showTCrossRestockModal && selectedTCross && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus size={16} className="text-emerald-600" />
                Add T Cross Stock
              </h3>
              <button onClick={() => { setShowTCrossRestockModal(false); setSelectedTCross(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRestockTCross} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <p className="text-slate-700 font-medium">Selected T Cross: <span className="font-bold text-slate-900">{selectedTCross.name}</span></p>
                <p className="text-slate-400 mt-1 font-semibold uppercase text-[10px]">Current Quantity: <span className="font-mono text-emerald-700 font-bold">{selectedTCross.quantity} {selectedTCross.unit}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Qty ({selectedTCross.unit})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={tCrossRestockQty}
                    onChange={(e) => setTCrossRestockQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Inward Date</label>
                  <input
                    type="date"
                    required
                    value={tCrossRestockDate}
                    onChange={(e) => setTCrossRestockDate(e.target.value)}
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
                  value={tCrossRestockCost}
                  onChange={(e) => setTCrossRestockCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Notes / Memo</label>
                <input
                  type="text"
                  value={tCrossRestockNotes}
                  onChange={(e) => setTCrossRestockNotes(e.target.value)}
                  placeholder="e.g. Purchased new batch"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>
              <button type="submit" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer">
                Add Stock
              </button>
            </form>
          </div>
        </div>
      )}

      <InventoryHdPaperModals
        showHdPaperTypeModal={showHdPaperTypeModal}
        setShowHdPaperTypeModal={setShowHdPaperTypeModal}
        showHdPaperRestockModal={showHdPaperRestockModal}
        setShowHdPaperRestockModal={setShowHdPaperRestockModal}
        selectedHdPaperType={selectedHdPaperType}
        setSelectedHdPaperType={setSelectedHdPaperType}
        newHdPaperTypeName={newHdPaperTypeName}
        setNewHdPaperTypeName={setNewHdPaperTypeName}
        newHdPaperTypeUnit={newHdPaperTypeUnit}
        setNewHdPaperTypeUnit={setNewHdPaperTypeUnit}
        newHdPaperTypeConversionFactor={newHdPaperTypeConversionFactor}
        setNewHdPaperTypeConversionFactor={setNewHdPaperTypeConversionFactor}
        newHdPaperTypeQuantity={newHdPaperTypeQuantity}
        setNewHdPaperTypeQuantity={setNewHdPaperTypeQuantity}
        newHdPaperTypeCost={newHdPaperTypeCost}
        setNewHdPaperTypeCost={setNewHdPaperTypeCost}
        newHdPaperTypeThreshold={newHdPaperTypeThreshold}
        setNewHdPaperTypeThreshold={setNewHdPaperTypeThreshold}
        editingHdPaperType={editingHdPaperType}
        resetHdPaperForm={resetHdPaperForm}
        handleCreateOrUpdateHdPaperType={handleCreateOrUpdateHdPaperType}
        hdPaperTypes={hdPaperTypes}
        setEditingHdPaperType={setEditingHdPaperType}
        hdPaperRestockQty={hdPaperRestockQty}
        setHdPaperRestockQty={setHdPaperRestockQty}
        hdPaperRestockCost={hdPaperRestockCost}
        setHdPaperRestockCost={setHdPaperRestockCost}
        hdPaperRestockDate={hdPaperRestockDate}
        setHdPaperRestockDate={setHdPaperRestockDate}
        hdPaperRestockNotes={hdPaperRestockNotes}
        setHdPaperRestockNotes={setHdPaperRestockNotes}
        handleRestockHdPaperType={handleRestockHdPaperType}
      />

      {/* MODAL 3: Inward Restock Quantity */}
      {showRestockModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                Add Raw Material Stock (Inward)
              </h3>
              <button onClick={() => setShowRestockModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRestock} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                <p className="text-slate-700 font-medium">Selected Material: <span className="font-bold text-slate-900">{selectedMaterial.name}</span></p>
                <p className="text-slate-400 mt-1 font-semibold uppercase text-[10px]">Current Quantity: <span className="font-mono text-indigo-700 font-bold">{selectedMaterial.quantity} {selectedMaterial.unit}</span></p>
              </div>

                      <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Qty ({selectedMaterial.unit})</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Inward Date</label>
                  <input
                    type="date"
                    required
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
              </div>

              {suppliers.some((supplier) =>
                supplier.supplierMaterials.some((item) => item.toLowerCase() === selectedMaterial.name.toLowerCase())
              ) && (
                <div>
                  <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                      const nextSupplierId = e.target.value;
                      setSelectedSupplierId(nextSupplierId);
                      if (nextSupplierId) {
                        setSuppliers(ensureSupplierMaterialAssociation(nextSupplierId, selectedMaterial.name));
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Select supplier for this stock --</option>
                    {suppliers
                      .filter((supplier) =>
                        supplier.supplierMaterials.some((item) => item.toLowerCase() === selectedMaterial.name.toLowerCase())
                      )
                      .map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Choose the supplier who supplied this stock. Leave blank if not supplied by a tracked supplier.</p>
                </div>
              )}

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Procurement Cost (Rs)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={restockCost}
                  onChange={(e) => setRestockCost(parseFloat(e.target.value) || 0)}
                  placeholder="Leave as 0 for free adjustment"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Automatically recalculates average item cost if greater than zero.</p>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">Restock Notes / Memo</label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Supplied by Chaudhary Wholesalers"
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                Procure Stock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
