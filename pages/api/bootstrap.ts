import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../lib/mongoose';

// Import models
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
  OPERATORS: 'factory_erp_operators',
  LABOUR_LEDGER: 'factory_erp_labour_ledger',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Try to connect to database; if it fails, return empty collections so
  // the frontend can boot in offline/cached mode instead of failing.
  let connected = false;
  try {
    await connectToDatabase();
    connected = true;
  } catch (err: any) {
    console.warn('Bootstrap: MongoDB connection failed, returning empty datasets.', err.message || err);
  }

  try {
    if (connected) {
      const users = await User.find();
      const rawmaterials = await RawMaterial.find();
      const inventorytransactions = await InventoryTransaction.find();
      const formulas = await Formula.find();
      const formulahistories = await FormulaHistory.find();
      const wetproductions = await WetProduction.find();
      const dryproductions = await DryProduction.find();
      const finalproductions = await FinalProduction.find();
      const wasterecords = await WasteRecord.find();
      const expenses = await Expense.find();
      const customers = await Customer.find();
      const customerledgerentries = await CustomerLedgerEntry.find();
      const suppliers = await Supplier.find();
      const supplierledgerentries = await SupplierLedgerEntry.find();
      const sales = await Sale.find();
      const payments = await Payment.find();
      const panniTypes = await PanniType.find();
      const operators = await Operator.find();
      const labourLedger = await LabourLedgerEntry.find();

      return res.status(200).json({
        [KEYS.USER]: users[0] || null,
        [KEYS.MATERIALS]: rawmaterials,
        [KEYS.TRANSACTIONS]: inventorytransactions,
        [KEYS.FORMULAS]: formulas,
        [KEYS.FORMULA_HISTORY]: formulahistories,
        [KEYS.WET_PROD]: wetproductions,
        [KEYS.DRY_PROD]: dryproductions,
        [KEYS.FINAL_PROD]: finalproductions,
        [KEYS.WASTE]: wasterecords,
        [KEYS.EXPENSES]: expenses,
        [KEYS.CUSTOMERS]: customers,
        [KEYS.LEDGER]: customerledgerentries,
        [KEYS.SUPPLIERS]: suppliers,
        [KEYS.SUPPLIER_LEDGER]: supplierledgerentries,
        [KEYS.SALES]: sales,
        [KEYS.PAYMENTS]: payments,
        [KEYS.PANNI_TYPES]: panniTypes,
        [KEYS.OPERATORS]: operators,
        [KEYS.LABOUR_LEDGER]: labourLedger,
      });
    }

    // Not connected: return empty/default datasets so the app can use cached data
    return res.status(200).json({
      [KEYS.USER]: null,
      [KEYS.MATERIALS]: [],
      [KEYS.TRANSACTIONS]: [],
      [KEYS.FORMULAS]: [],
      [KEYS.FORMULA_HISTORY]: [],
      [KEYS.WET_PROD]: [],
      [KEYS.DRY_PROD]: [],
      [KEYS.FINAL_PROD]: [],
      [KEYS.WASTE]: [],
      [KEYS.EXPENSES]: [],
      [KEYS.CUSTOMERS]: [],
      [KEYS.LEDGER]: [],
      [KEYS.SUPPLIERS]: [],
      [KEYS.SUPPLIER_LEDGER]: [],
      [KEYS.SALES]: [],
      [KEYS.PAYMENTS]: [],
      [KEYS.PANNI_TYPES]: [],
      [KEYS.OPERATORS]: [],
      [KEYS.LABOUR_LEDGER]: [],
    });
  } catch (error: any) {
    console.error('Bootstrap API error during fetch:', error);
    res.status(500).json({ error: error.message });
  }
}
