import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../lib/mongoose';

import { User } from '../../src/models/User';
import { RawMaterial } from '../../src/models/RawMaterial';
import { InventoryTransaction } from '../../src/models/InventoryTransaction';
import { Formula } from '../../src/models/Formula';
import { FormulaHistory } from '../../src/models/FormulaHistory';
import { WetProduction } from '../../src/models/WetProduction';
import { DryProduction } from '../../src/models/DryProduction';
import { FinalProduction } from '../../src/models/FinalProduction';
import { WasteRecord } from '../../src/models/WasteRecord';
import { Expense } from '../../src/models/Expense';
import { Customer } from '../../src/models/Customer';
import { CustomerLedgerEntry } from '../../src/models/CustomerLedgerEntry';
import { Supplier } from '../../src/models/Supplier';
import { SupplierLedgerEntry } from '../../src/models/SupplierLedgerEntry';
import { Sale } from '../../src/models/Sale';
import { Payment } from '../../src/models/Payment';
import { PanniType } from '../../src/models/PanniType';
import { HdPaperType } from '../../src/models/HdPaperType';
import { TCross } from '../../src/models/TCross';
import { WallAngle } from '../../src/models/WallAngle';
import { Operator } from '../../src/models/Operator';
import { LabourLedgerEntry } from '../../src/models/LabourLedgerEntry';

const KEYS = {
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
  TCROSS_TYPES: 'factory_erp_tcross_types',
  WALL_ANGLE_TYPES: 'factory_erp_wall_angle_types',
  HD_PAPER_TYPES: 'factory_erp_hd_paper_types',
  OPERATORS: 'factory_erp_operators',
  LABOUR_LEDGER: 'factory_erp_labour_ledger',
};

const MODEL_MAP: Record<string, any> = {
  [KEYS.USER]: User,
  [KEYS.MATERIALS]: RawMaterial,
  [KEYS.TRANSACTIONS]: InventoryTransaction,
  [KEYS.FORMULAS]: Formula,
  [KEYS.FORMULA_HISTORY]: FormulaHistory,
  [KEYS.WET_PROD]: WetProduction,
  [KEYS.DRY_PROD]: DryProduction,
  [KEYS.FINAL_PROD]: FinalProduction,
  [KEYS.WASTE]: WasteRecord,
  [KEYS.EXPENSES]: Expense,
  [KEYS.CUSTOMERS]: Customer,
  [KEYS.LEDGER]: CustomerLedgerEntry,
  [KEYS.SUPPLIERS]: Supplier,
  [KEYS.SUPPLIER_LEDGER]: SupplierLedgerEntry,
  [KEYS.SALES]: Sale,
  [KEYS.PAYMENTS]: Payment,
  [KEYS.PANNI_TYPES]: PanniType,
  [KEYS.HD_PAPER_TYPES]: HdPaperType,
  [KEYS.OPERATORS]: Operator,
  [KEYS.TCROSS_TYPES]: TCross,
  [KEYS.WALL_ANGLE_TYPES]: WallAngle,
  [KEYS.LABOUR_LEDGER]: LabourLedgerEntry,
};

function sanitizeRawPayload(rawPayload: any) {
  if (Array.isArray(rawPayload)) {
    return rawPayload.map((item) => sanitizeRawPayload(item));
  }
  if (rawPayload && typeof rawPayload === 'object') {
    const { _id, __v, ...rest } = rawPayload;
    return rest;
  }
  return rawPayload;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key, data } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Missing storage key' });
  }

  const Model = MODEL_MAP[key];
  if (!Model) {
    return res.status(400).json({ error: 'Invalid storage key mapped to no MongoDB model' });
  }

  try {
    await connectToDatabase();

    const sanitizedData = sanitizeRawPayload(data);

    if (key === KEYS.USER) {
      await User.deleteMany({});
      if (sanitizedData && Object.keys(sanitizedData).length > 0) {
        await User.create(sanitizedData);
      }
      return res.json({ success: true });
    }

    const arrayData = Array.isArray(sanitizedData)
      ? sanitizedData
      : sanitizedData
      ? [sanitizedData]
      : [];

    // Deduplicate incoming array by `id` to avoid E11000 duplicate key errors.
    // If an item has no `id`, generate one to ensure uniqueness.
    const map = new Map<string, any>();
    for (const item of arrayData) {
      if (!item || typeof item !== 'object') continue;
      let itemId = item.id;
      if (!itemId) {
        // fallback id generation using model specific prefixes when possible
        const prefix = (key === KEYS.LEDGER && item.materialId) ? 'led_' : (key === KEYS.FINAL_PROD ? 'final_' : 'id_');
        itemId = `${prefix}${Math.random().toString(36).substr(2, 9)}`;
        item.id = itemId;
      }
      // keep the last occurrence of the id (overwrites earlier duplicates)
      map.set(itemId, item);
    }

    const finalArray = Array.from(map.values());

    await Model.deleteMany({});
    if (finalArray.length > 0) {
      try {
        // use unordered insert to allow partial success if unexpected duplicates remain
        await Model.insertMany(finalArray, { ordered: false });
      } catch (err: any) {
        // If duplicate key error still occurs, log and continue — we don't want a single dup to crash the whole sync
        console.error('Save API partial insert error:', err.message || err);
        if (err.code && err.code !== 11000) {
          throw err;
        }
      }
    }

    res.json({ success: true, count: finalArray.length });
  } catch (err: any) {
    console.error(`Save API error for key ${key}:`, err);
    res.status(500).json({ error: err.message });
  }
}
