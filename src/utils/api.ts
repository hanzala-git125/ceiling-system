import {
  User,
  RawMaterial,
  InventoryTransaction,
  Formula,
  FormulaHistory,
  WetProduction,
  DryProduction,
  FinalProduction,
  WasteRecord,
  Expense,
  Customer,
  CustomerLedgerEntry,
  Supplier,
  SupplierLedgerEntry,
  Sale,
  Payment,
  PanniType,
  TCross,
  HdPaperType,
  Operator,
  LabourLedgerEntry,
} from '../types';

// Helper to get today's date in YYYY-MM-DD format
export function getTodayStr(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return d.toISOString().split('T')[0];
}

// LocalStorage Keys - Exported for use throughout the app
export const KEYS = {
  USER: 'factory_erp_user',
  MATERIALS: 'factory_erp_materials',
  TRANSACTIONS: 'factory_erp_transactions',
  FORMULAS: 'factory_erp_formulas',
  FORMULA_HISTORY: 'factory_erp_formula_history',
  WET_PROD: 'factory_erp_wet_production',
  DRY_PROD: 'factory_erp_dry_production',
  FINAL_PROD: 'factory_erp_final_production',
  WASTE: 'factory_erp_waste',
  EXPENSES: 'factory_erp_expenses',
  CUSTOMERS: 'factory_erp_customers',
  LEDGER: 'factory_erp_ledger',
  SUPPLIERS: 'factory_erp_suppliers',
  SUPPLIER_LEDGER: 'factory_erp_supplier_ledger',
  SALES: 'factory_erp_sales',
  PAYMENTS: 'factory_erp_payments',
  PANNI_TYPES: 'factory_erp_panni_types',
  HD_PAPER_TYPES: 'factory_erp_hd_paper_types',
  TCROSS_TYPES: 'factory_erp_tcross_types',
  OPERATORS: 'factory_erp_operators',
  LABOUR_LEDGER: 'factory_erp_labour_ledger',
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

const LOGIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const API_CACHE_TTL_MS = 30 * 1000;
const API_CACHE_KEYS = {
  SUPPLIERS: 'factory_erp_api_cache_suppliers',
  SUPPLIER_LEDGER: 'factory_erp_api_cache_supplier_ledger',
};

function shouldUseCachedApiData(cacheKey: string): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const cachedAt = storage.getItem(cacheKey);
  if (!cachedAt) return false;

  return Date.now() - Number(cachedAt) < API_CACHE_TTL_MS;
}

function markApiCache(cacheKey: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(cacheKey, Date.now().toString());
}

// User Actions
export function getCurrentUser(): User | null {
  const storage = getStorage();
  if (!storage) return null;

  const storedValue = storage.getItem(KEYS.USER);
  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue);
    if (!parsed || typeof parsed !== 'object') {
      storage.removeItem(KEYS.USER);
      return null;
    }

    if (parsed.user && typeof parsed.expiresAt === 'number') {
      if (Date.now() > parsed.expiresAt) {
        storage.removeItem(KEYS.USER);
        return null;
      }
      return parsed.user as User;
    }

    storage.removeItem(KEYS.USER);
    return null;
  } catch (error) {
    storage.removeItem(KEYS.USER);
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  const storage = getStorage();
  if (!storage) return;

  if (user) {
    storage.setItem(KEYS.USER, JSON.stringify({
      user,
      expiresAt: Date.now() + LOGIN_SESSION_TTL_MS,
    }));
  } else {
    storage.removeItem(KEYS.USER);
  }
}

// CRUD generic getter & setters
export function getData<T>(key: string, defaultValue: T[] = []): T[] {
  const storage = getStorage();
  if (!storage) return defaultValue;

  const data = storage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

export function saveData<T>(key: string, data: T[]): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(key, JSON.stringify(data));

  fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, data }),
  }).catch((err) => {
    console.error(`Failed to push background sync for key ${key}:`, err);
  });
}

export async function refreshSuppliersFromApi(): Promise<Supplier[]> {
  if (typeof window === 'undefined') {
    return getData<Supplier>(KEYS.SUPPLIERS);
  }

  const storage = getStorage();
  if (storage) {
    const existingSuppliers = getData<Supplier>(KEYS.SUPPLIERS);
    if (existingSuppliers.length > 0 && shouldUseCachedApiData(API_CACHE_KEYS.SUPPLIERS)) {
      return existingSuppliers;
    }
  }

  try {
    const response = await fetch('/api/suppliers', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load suppliers from the API');
    }

    const payload = await response.json();
    const suppliers = Array.isArray(payload) ? payload : [];
    if (storage) {
      storage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
      markApiCache(API_CACHE_KEYS.SUPPLIERS);
    }
    return suppliers;
  } catch (error) {
    console.error('Failed to refresh suppliers from API:', error);
    return getData<Supplier>(KEYS.SUPPLIERS);
  }
}

export async function refreshPanniTypesFromApi(): Promise<PanniType[]> {
  if (typeof window === 'undefined') {
    return getData<PanniType>(KEYS.PANNI_TYPES);
  }

  try {
    const response = await fetch('/api/panni-types', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load panni types from the API');
    }

    const payload = await response.json();
    const panniTypes = Array.isArray(payload) ? payload : [];
    const storage = getStorage();
    if (storage) {
      storage.setItem(KEYS.PANNI_TYPES, JSON.stringify(panniTypes));
    }
    return panniTypes;
  } catch (error) {
    console.error('Failed to refresh panni types from API:', error);
    return getData<PanniType>(KEYS.PANNI_TYPES);
  }
}

export async function refreshTCrossesFromApi(): Promise<TCross[]> {
  if (typeof window === 'undefined') {
    return getData<TCross>(KEYS.TCROSS_TYPES);
  }

  try {
    const response = await fetch('/api/t-cross', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load T Cross types from the API');
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : [];
    const storage = getStorage();
    if (storage) {
      storage.setItem(KEYS.TCROSS_TYPES, JSON.stringify(items));
    }
    return items;
  } catch (error) {
    console.error('Failed to refresh T Cross types from API:', error);
    return getData<TCross>(KEYS.TCROSS_TYPES);
  }
}

export async function syncTCrossesToApi(items: TCross[]): Promise<TCross[]> {
  if (typeof window === 'undefined') {
    return items;
  }

  try {
    const response = await fetch('/api/t-cross', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });

    if (!response.ok) {
      throw new Error('Unable to sync T Cross types to the API');
    }

    return items;
  } catch (error) {
    console.error('Failed to sync T Cross types to API:', error);
    return items;
  }
}

export async function syncPanniTypesToApi(panniTypes: PanniType[]): Promise<PanniType[]> {
  if (typeof window === 'undefined') {
    return panniTypes;
  }

  try {
    const response = await fetch('/api/panni-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(panniTypes),
    });

    if (!response.ok) {
      throw new Error('Unable to sync panni types to the API');
    }

    return panniTypes;
  } catch (error) {
    console.error('Failed to sync panni types to API:', error);
    return panniTypes;
  }
}

export async function refreshHdPaperTypesFromApi(): Promise<HdPaperType[]> {
  if (typeof window === 'undefined') {
    return getData<HdPaperType>(KEYS.HD_PAPER_TYPES);
  }

  try {
    const response = await fetch('/api/ledger-types', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load HD paper types from the API');
    }

    const payload = await response.json();
    const types = Array.isArray(payload) ? payload : [];
    const storage = getStorage();
    if (storage) {
      storage.setItem(KEYS.HD_PAPER_TYPES, JSON.stringify(types));
    }
    return types;
  } catch (error) {
    console.error('Failed to refresh HD paper types from API:', error);
    return getData<HdPaperType>(KEYS.HD_PAPER_TYPES);
  }
}

export async function syncHdPaperTypesToApi(hdPaperTypes: HdPaperType[]): Promise<HdPaperType[]> {
  if (typeof window === 'undefined') {
    return hdPaperTypes;
  }

  try {
    const response = await fetch('/api/ledger-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hdPaperTypes),
    });

    if (!response.ok) {
      throw new Error('Unable to sync HD paper types to the API');
    }

    return hdPaperTypes;
  } catch (error) {
    console.error('Failed to sync HD paper types to API:', error);
    return hdPaperTypes;
  }
}

export async function syncSuppliersToApi(suppliers: Supplier[]): Promise<Supplier[]> {
  if (typeof window === 'undefined') {
    return suppliers;
  }

  try {
    const response = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suppliers),
    });

    if (!response.ok) {
      throw new Error('Unable to sync suppliers to the API');
    }

    return suppliers;
  } catch (error) {
    console.error('Failed to sync suppliers to API:', error);
    return suppliers;
  }
}

export function ensureSupplierMaterialAssociation(supplierId: string | null, materialName: string): Supplier[] {
  if (!supplierId || !materialName?.trim()) {
    return db.getSuppliers();
  }

  const normalizedName = materialName.trim();
  const suppliers = db.getSuppliers();
  const updatedSuppliers = suppliers.map((supplier) => {
    if (supplier.id !== supplierId) return supplier;

    const existingMaterials = supplier.supplierMaterials.filter(Boolean);
    const alreadyLinked = existingMaterials.some((item) => item.toLowerCase() === normalizedName.toLowerCase());
    if (alreadyLinked) return supplier;

    return {
      ...supplier,
      supplierMaterials: [...existingMaterials, normalizedName],
    };
  });

  const didChange = updatedSuppliers.some((supplier, index) => supplier !== suppliers[index]);
  if (didChange) {
    db.saveSuppliers(updatedSuppliers);
    return updatedSuppliers;
  }

  return suppliers;
}

export async function refreshSupplierLedgerFromApi(): Promise<SupplierLedgerEntry[]> {
  if (typeof window === 'undefined') {
    return getData<SupplierLedgerEntry>(KEYS.SUPPLIER_LEDGER);
  }

  const storage = getStorage();
  if (storage) {
    const existingLedger = getData<SupplierLedgerEntry>(KEYS.SUPPLIER_LEDGER);
    if (existingLedger.length > 0 && shouldUseCachedApiData(API_CACHE_KEYS.SUPPLIER_LEDGER)) {
      return existingLedger;
    }
  }

  try {
    const response = await fetch('/api/supplier-ledger', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load supplier ledger from the API');
    }

    const payload = await response.json();
    const ledgerEntries = Array.isArray(payload) ? payload : [];
    if (storage) {
      storage.setItem(KEYS.SUPPLIER_LEDGER, JSON.stringify(ledgerEntries));
      markApiCache(API_CACHE_KEYS.SUPPLIER_LEDGER);
    }
    return ledgerEntries;
  } catch (error) {
    console.error('Failed to refresh supplier ledger from API:', error);
    return getData<SupplierLedgerEntry>(KEYS.SUPPLIER_LEDGER);
  }
}

export async function syncSupplierLedgerToApi(ledgerEntries: SupplierLedgerEntry[]): Promise<SupplierLedgerEntry[]> {
  if (typeof window === 'undefined') {
    return ledgerEntries;
  }

  try {
    const response = await fetch('/api/supplier-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ledgerEntries),
    });

    if (!response.ok) {
      throw new Error('Unable to sync supplier ledger to the API');
    }

    return ledgerEntries;
  } catch (error) {
    console.error('Failed to sync supplier ledger to API:', error);
    return ledgerEntries;
  }
}

export function normalizeMaterial(material: RawMaterial): RawMaterial {
  const name = material?.name?.toLowerCase() || '';
  const unit = material?.unit?.toLowerCase() || '';

  let targetUnit = unit;
  const defaultConversionFactor = material.conversionFactor && material.conversionFactor > 0 ? material.conversionFactor : 1;
  let conversionFactor = defaultConversionFactor;
  let quantity = material.quantity || 0;

  if (name.includes('plaster')) {
    targetUnit = 'bags';
    conversionFactor = defaultConversionFactor > 0 ? defaultConversionFactor : 25;
    if (unit === 'kg') {
      quantity = quantity / conversionFactor;
    } else if (unit === 'g') {
      quantity = quantity / 1000 / conversionFactor;
    } else if (unit === 'pieces') {
      quantity = quantity / conversionFactor;
    }
  } else if (name.includes('tape')) {
    targetUnit = 'rolls';
    conversionFactor = defaultConversionFactor > 0 ? defaultConversionFactor : 272;
    if (unit === 'feet') {
      quantity = quantity / conversionFactor;
    }
  } else if (name.includes('brown paper')) {
    targetUnit = 'rims';
    conversionFactor = defaultConversionFactor > 0 ? defaultConversionFactor : 500;
    if (unit === 'pieces') {
      quantity = quantity / conversionFactor;
    }
  } else if (name.includes('panni')) {
    targetUnit = 'kg';
    conversionFactor = defaultConversionFactor > 0 ? defaultConversionFactor : 50;
    if (unit === 'pieces') {
      quantity = quantity / conversionFactor;
    }
  } else if (name.includes('packing shopper')) {
    targetUnit = 'kg';
    conversionFactor = defaultConversionFactor > 0 ? defaultConversionFactor : 40;
    if (unit === 'pieces') {
      quantity = quantity / conversionFactor;
    }
  }

  return {
    ...material,
    quantity: Math.round(quantity * 1000) / 1000,
    unit: targetUnit,
    conversionFactor,
    updatedAt: material.updatedAt || getTodayStr(),
  };
}

export function normalizeMaterials(materials: RawMaterial[]): RawMaterial[] {
  return materials.map(normalizeMaterial);
}

// Unified getters and setters for components
export const db = {
  getMaterials: () => {
    const materials = getData<RawMaterial>(KEYS.MATERIALS);
    const normalized = normalizeMaterials(materials);
    if (JSON.stringify(normalized) !== JSON.stringify(materials)) {
      saveData<RawMaterial>(KEYS.MATERIALS, normalized);
    }
    return normalized;
  },
  saveMaterials: (data: RawMaterial[]) => {
    const normalized = normalizeMaterials(data);
    saveData<RawMaterial>(KEYS.MATERIALS, normalized);
    return normalized;
  },

  getTransactions: () => getData<InventoryTransaction>(KEYS.TRANSACTIONS),
  saveTransactions: (data: InventoryTransaction[]) => saveData<InventoryTransaction>(KEYS.TRANSACTIONS, data),

  getFormulas: () => getData<Formula>(KEYS.FORMULAS),
  saveFormulas: (data: Formula[]) => saveData<Formula>(KEYS.FORMULAS, data),

  getFormulaHistory: () => getData<FormulaHistory>(KEYS.FORMULA_HISTORY),
  saveFormulaHistory: (data: FormulaHistory[]) => saveData<FormulaHistory>(KEYS.FORMULA_HISTORY, data),

  getWetProduction: () => getData<WetProduction>(KEYS.WET_PROD),
  saveWetProduction: (data: WetProduction[]) => saveData<WetProduction>(KEYS.WET_PROD, data),

  getDryProduction: () => getData<DryProduction>(KEYS.DRY_PROD),
  saveDryProduction: (data: DryProduction[]) => saveData<DryProduction>(KEYS.DRY_PROD, data),

  getFinalProduction: () => getData<FinalProduction>(KEYS.FINAL_PROD),
  saveFinalProduction: (data: FinalProduction[]) => saveData<FinalProduction>(KEYS.FINAL_PROD, data),

  getWasteRecords: () => getData<WasteRecord>(KEYS.WASTE),
  saveWasteRecords: (data: WasteRecord[]) => saveData<WasteRecord>(KEYS.WASTE, data),

  getExpenses: () => getData<Expense>(KEYS.EXPENSES),
  saveExpenses: (data: Expense[]) => saveData<Expense>(KEYS.EXPENSES, data),

  getCustomers: () => getData<Customer>(KEYS.CUSTOMERS),
  saveCustomers: (data: Customer[]) => saveData<Customer>(KEYS.CUSTOMERS, data),

  getLedger: () => getData<CustomerLedgerEntry>(KEYS.LEDGER),
  saveLedger: (data: CustomerLedgerEntry[]) => saveData<CustomerLedgerEntry>(KEYS.LEDGER, data),

  getSuppliers: () => getData<Supplier>(KEYS.SUPPLIERS),
  saveSuppliers: (data: Supplier[]) => {
    const normalized = data;
    saveData<Supplier>(KEYS.SUPPLIERS, normalized);
    void syncSuppliersToApi(normalized);
    return normalized;
  },

  getSupplierLedger: () => getData<SupplierLedgerEntry>(KEYS.SUPPLIER_LEDGER),
  saveSupplierLedger: (data: SupplierLedgerEntry[]) => {
    saveData<SupplierLedgerEntry>(KEYS.SUPPLIER_LEDGER, data);
    void syncSupplierLedgerToApi(data);
    return data;
  },

  getSales: () => getData<Sale>(KEYS.SALES),
  saveSales: (data: Sale[]) => saveData<Sale>(KEYS.SALES, data),

  getPayments: () => getData<Payment>(KEYS.PAYMENTS),
  savePayments: (data: Payment[]) => saveData<Payment>(KEYS.PAYMENTS, data),

  getOperators: () => getData<Operator>(KEYS.OPERATORS),
  saveOperators: (data: Operator[]) => saveData<Operator>(KEYS.OPERATORS, data),

  getLabourLedger: () => getData<LabourLedgerEntry>(KEYS.LABOUR_LEDGER),
  saveLabourLedger: (data: LabourLedgerEntry[]) => saveData<LabourLedgerEntry>(KEYS.LABOUR_LEDGER, data),

  getPanniTypes: () => getData<PanniType>(KEYS.PANNI_TYPES),
  savePanniTypes: (data: PanniType[]) => {
    saveData<PanniType>(KEYS.PANNI_TYPES, data);
    void syncPanniTypesToApi(data);
    return data;
  },

  getHdPaperTypes: () => getData<HdPaperType>(KEYS.HD_PAPER_TYPES),
  saveHdPaperTypes: (data: HdPaperType[]) => {
    saveData<HdPaperType>(KEYS.HD_PAPER_TYPES, data);
    void syncHdPaperTypesToApi(data);
    return data;
  },
  getTCrosses: () => getData<TCross>(KEYS.TCROSS_TYPES),
  saveTCrosses: (data: TCross[]) => {
    saveData<TCross>(KEYS.TCROSS_TYPES, data);
    void syncTCrossesToApi(data);
    return data;
  },
};

// HELPER BUSINESS LOGICS

export function getConversionLabel(unit: string): string {
  const normalized = unit?.toLowerCase() || '';
  if (normalized === 'rolls') return 'Feet per roll';
  if (normalized === 'rims') return 'Pieces per rim';
  if (normalized === 'bags') return 'Kg per bag';
  if (normalized === 'kg') return 'Pieces per kg';
  if (normalized === 'grams') return 'Pieces per gram';
  return 'Units per stock item';
}

export function getMaterialConversionFactor(material: RawMaterial | null | undefined): number {
  if (!material) return 1;
  if (typeof material.conversionFactor === 'number' && material.conversionFactor > 0) {
    return material.conversionFactor;
  }

  const name = material.name?.toLowerCase() || '';
  const unit = material.unit?.toLowerCase() || '';

  if (name.includes('plaster')) return 25;
  if (name.includes('tape')) return 272;
  if (name.includes('brown paper')) return 500;
  if (name.includes('panni')) return 50;
  if (name.includes('packing shopper')) return 40;
  if (unit === 'rolls') return 272;
  if (unit === 'rims') return 500;
  if (unit === 'kg') return 50;

  return 1;
}

export function convertFormulaAmountToStock(amount: number, formulaUnit: string, material: RawMaterial | null | undefined) {
  const normalizedFormulaUnit = formulaUnit?.toLowerCase() || '';
  const normalizedMaterialUnit = material?.unit?.toLowerCase() || '';
  const conversionFactor = getMaterialConversionFactor(material);

  if (normalizedFormulaUnit === 'g' && normalizedMaterialUnit === 'kg') {
    return { amount: amount / 1000, unit: 'kg' };
  }
  if (normalizedFormulaUnit === 'g' && normalizedMaterialUnit === 'bags' && conversionFactor > 0) {
    return { amount: amount / 1000 / conversionFactor, unit: 'bags' };
  }
  if (normalizedFormulaUnit === 'kg' && normalizedMaterialUnit === 'g') {
    return { amount: amount * 1000, unit: 'g' };
  }
  if (normalizedFormulaUnit === 'kg' && normalizedMaterialUnit === 'bags' && conversionFactor > 0) {
    return { amount: amount / conversionFactor, unit: 'bags' };
  }
  if (normalizedFormulaUnit === 'feet' && normalizedMaterialUnit === 'rolls' && conversionFactor > 0) {
    return { amount: amount / conversionFactor, unit: 'rolls' };
  }
  if (normalizedFormulaUnit === 'pieces' && conversionFactor > 0 && ['rims', 'kg', 'rolls', 'pieces'].includes(normalizedMaterialUnit)) {
    return { amount: amount / conversionFactor, unit: normalizedMaterialUnit || 'pieces' };
  }
  if (normalizedFormulaUnit === normalizedMaterialUnit) {
    return { amount, unit: normalizedMaterialUnit || normalizedFormulaUnit };
  }

  return { amount, unit: normalizedMaterialUnit || normalizedFormulaUnit };
}

// 1. Log Material Transaction & update materials main quantity
export function adjustMaterialStock(
  materialId: string,
  quantityDelta: number,
  type: 'in' | 'out',
  cost: number,
  date: string,
  notes: string
) {
  const materials = db.getMaterials();
  const index = materials.findIndex((m) => m.id === materialId);
  if (index !== -1) {
    const mat = materials[index];
    if (type === 'in') {
      mat.quantity += quantityDelta;
    } else {
      mat.quantity -= quantityDelta;
    }
    mat.updatedAt = date;
    db.saveMaterials(materials);

    const txs = db.getTransactions();
    const newTx: InventoryTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      materialId,
      materialName: mat.name,
      type,
      quantity: quantityDelta,
      cost,
      date,
      notes,
      unit: mat.unit,
    };
    txs.push(newTx);
    db.saveTransactions(txs);
  }
}

// 2. Add Customer Ledger entry
export function addLedgerEntry(
  customerId: string,
  date: string,
  type: CustomerLedgerEntry['type'],
  referenceId: string,
  debit: number,
  credit: number,
  description: string
) {
  const ledger = db.getLedger();
  const customerLedgers = ledger.filter((l) => l.customerId === customerId);

  let lastBalance = 0;
  if (customerLedgers.length > 0) {
    const sorted = [...customerLedgers].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    lastBalance = sorted[sorted.length - 1].balance;
  } else {
    const customers = db.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      lastBalance = cust.openingBalance;
    }
  }

  const newBalance = lastBalance + debit - credit;

  const newEntry: CustomerLedgerEntry = {
    id: 'led_' + Math.random().toString(36).substr(2, 9),
    customerId,
    date,
    type,
    referenceId,
    debit,
    credit,
    balance: newBalance,
    description,
  };

  ledger.push(newEntry);
  db.saveLedger(ledger);
  recalculateCustomerLedger(customerId);
}

// 2b. Add Supplier Ledger entry
export function addSupplierLedgerEntry(
  supplierId: string,
  date: string,
  type: SupplierLedgerEntry['type'],
  referenceId: string,
  debit: number,
  credit: number,
  description: string
) {
  const ledger = db.getSupplierLedger();
  const supplierLedgers = ledger.filter((l) => l.supplierId === supplierId);

  let lastBalance = 0;
  if (supplierLedgers.length > 0) {
    const sorted = [...supplierLedgers].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    lastBalance = sorted[sorted.length - 1].balance;
  } else {
    const suppliers = db.getSuppliers();
    const supp = suppliers.find((s) => s.id === supplierId);
    if (supp) {
      lastBalance = supp.openingBalance;
    }
  }

  const newBalance = lastBalance + debit - credit;

  const newEntry: SupplierLedgerEntry = {
    id: 'sled_' + Math.random().toString(36).substr(2, 9),
    supplierId,
    date,
    type,
    referenceId,
    debit,
    credit,
    balance: newBalance,
    description,
  };

  ledger.push(newEntry);
  db.saveSupplierLedger(ledger);
  recalculateSupplierLedger(supplierId);
}

// Recalculate customer ledger balance from scratch
export function recalculateCustomerLedger(customerId: string) {
  const ledger = db.getLedger();
  const otherCustomersEntries = ledger.filter((l) => l.customerId !== customerId);
  const thisCustomerEntries = ledger.filter((l) => l.customerId === customerId);

  thisCustomerEntries.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    if (a.type === 'Opening Balance') return -1;
    if (b.type === 'Opening Balance') return 1;
    return 0;
  });

  const customers = db.getCustomers();
  const cust = customers.find((c) => c.id === customerId);
  let runningBalance = cust ? cust.openingBalance : 0;

  const updatedEntries = thisCustomerEntries.map((entry) => {
    if (entry.type === 'Opening Balance') {
      runningBalance = entry.debit;
      return { ...entry, balance: runningBalance };
    }
    runningBalance = runningBalance + entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  db.saveLedger([...otherCustomersEntries, ...updatedEntries]);
}

// Recalculate supplier ledger balance from scratch
export function recalculateSupplierLedger(supplierId: string) {
  const ledger = db.getSupplierLedger();
  const otherSupplierEntries = ledger.filter((l) => l.supplierId !== supplierId);
  const thisSupplierEntries = ledger.filter((l) => l.supplierId === supplierId);

  thisSupplierEntries.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    if (a.type === 'Opening Balance') return -1;
    if (b.type === 'Opening Balance') return 1;
    return 0;
  });

  const suppliers = db.getSuppliers();
  const supp = suppliers.find((s) => s.id === supplierId);
  let runningBalance = supp ? supp.openingBalance : 0;

  const updatedEntries = thisSupplierEntries.map((entry) => {
    if (entry.type === 'Opening Balance') {
      runningBalance = entry.debit;
      return { ...entry, balance: runningBalance };
    }
    runningBalance = runningBalance + entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  db.saveSupplierLedger([...otherSupplierEntries, ...updatedEntries]);
}

// 3. Delete Customer Ledger entries
export function deleteLedgerByReference(referenceId: string, customerId: string) {
  const ledger = db.getLedger();
  const filtered = ledger.filter((l) => !(l.referenceId === referenceId && l.customerId === customerId));
  db.saveLedger(filtered);
  recalculateCustomerLedger(customerId);
}

export function deleteCustomerLedgerEntry(entryId: string, customerId: string) {
  const ledger = db.getLedger();
  const entryToDelete = ledger.find((entry) => entry.id === entryId && entry.customerId === customerId);
  const filtered = ledger.filter((entry) => !(entry.id === entryId && entry.customerId === customerId));
  db.saveLedger(filtered);
  if (entryToDelete) {
    recalculateCustomerLedger(customerId);
  }
}

// 3b. Delete Supplier Ledger entries
export function deleteSupplierLedgerByReference(referenceId: string, supplierId: string) {
  const ledger = db.getSupplierLedger();
  const filtered = ledger.filter((l) => !(l.referenceId === referenceId && l.supplierId === supplierId));
  db.saveSupplierLedger(filtered);
  recalculateSupplierLedger(supplierId);
}

export function deleteSupplierLedgerEntry(entryId: string, supplierId: string) {
  const ledger = db.getSupplierLedger();
  const entryToDelete = ledger.find((entry) => entry.id === entryId && entry.supplierId === supplierId);
  const filtered = ledger.filter((entry) => !(entry.id === entryId && entry.supplierId === supplierId));
  db.saveSupplierLedger(filtered);
  if (entryToDelete) {
    recalculateSupplierLedger(supplierId);
  }
}

export function deleteLabourLedgerEntry(entryId: string, operatorId: string) {
  const ledger = db.getLabourLedger();
  const entryToDelete = ledger.find((entry) => entry.id === entryId && entry.operatorId === operatorId);
  const filtered = ledger.filter((entry) => !(entry.id === entryId && entry.operatorId === operatorId));
  db.saveLabourLedger(filtered);

  if (entryToDelete) {
    const operators = db.getOperators();
    const operator = operators.find((item) => item.id === operatorId);
    if (operator) {
      const delta = entryToDelete.type === 'earning' ? -entryToDelete.amount : entryToDelete.amount;
      operator.balanceDue = Math.max(0, operator.balanceDue + delta);
      db.saveOperators(operators);
    }
  }
}

// Get outstanding balance for customer
export function getCustomerOutstandingBalance(customerId: string): number {
  const ledger = db.getLedger().filter((l) => l.customerId === customerId);
  if (ledger.length === 0) {
    const customers = db.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    return cust ? cust.openingBalance : 0;
  }

  const sorted = [...ledger].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sorted[sorted.length - 1].balance;
}

// Get outstanding balance for supplier
export function getSupplierOutstandingBalance(supplierId: string): number {
  const ledger = db.getSupplierLedger().filter((l) => l.supplierId === supplierId);
  if (ledger.length === 0) {
    const suppliers = db.getSuppliers();
    const supp = suppliers.find((s) => s.id === supplierId);
    return supp ? supp.openingBalance : 0;
  }

  const sorted = [...ledger].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sorted[sorted.length - 1].balance;
}
