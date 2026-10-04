import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { SupplierLedgerEntry } from '../../../src/models/SupplierLedgerEntry';

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
  try {
    await connectToDatabase();

    if (req.method === 'GET') {
      const ledgerEntries = await SupplierLedgerEntry.find().sort({ date: 1, createdAt: 1 });
      return res.status(200).json(ledgerEntries);
    }

    if (req.method === 'POST') {
      const payload = sanitizeRawPayload(req.body);

      if (Array.isArray(payload)) {
        await SupplierLedgerEntry.deleteMany({});
        if (payload.length > 0) {
          await SupplierLedgerEntry.insertMany(payload);
        }
        return res.status(200).json({ success: true, count: payload.length });
      }

      if (payload && typeof payload === 'object') {
        const ledgerPayload = payload as any;
        if (!ledgerPayload.id) {
          ledgerPayload.id = `sled_${Math.random().toString(36).substr(2, 9)}`;
        }

        const ledgerEntry = await SupplierLedgerEntry.findOneAndUpdate(
          { id: ledgerPayload.id },
          { $set: ledgerPayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(ledgerEntry);
      }

      return res.status(400).json({ error: 'Expected a ledger entry payload or array of entries.' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Ledger entry id is required.' });
      }

      const deleted = await SupplierLedgerEntry.findOneAndDelete({ id });
      if (!deleted) {
        return res.status(404).json({ error: 'Ledger entry not found.' });
      }

      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
