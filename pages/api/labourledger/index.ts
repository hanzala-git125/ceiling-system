import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { LabourLedgerEntry } from '../../../src/models/LabourLedgerEntry';

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
      const ledger = await LabourLedgerEntry.find().sort({ date: 1 });
      return res.status(200).json(ledger);
    }

    if (req.method === 'POST') {
      const payload = sanitizeRawPayload(req.body);

      if (Array.isArray(payload)) {
        await LabourLedgerEntry.deleteMany({});
        if (payload.length > 0) {
          await LabourLedgerEntry.insertMany(payload);
        }
        return res.status(200).json({ success: true, count: payload.length });
      }

      if (payload && typeof payload === 'object') {
        const entryPayload = payload as any;
        if (!entryPayload.id) {
          entryPayload.id = `labour_${Math.random().toString(36).substr(2, 9)}`;
        }

        const entry = await LabourLedgerEntry.findOneAndUpdate(
          { id: entryPayload.id },
          { $set: entryPayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(entry);
      }

      return res.status(400).json({ error: 'Expected a labour ledger payload or array.' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Ledger entry id is required.' });
      }

      const deleted = await LabourLedgerEntry.findOneAndDelete({ id });
      if (!deleted) {
        return res.status(404).json({ error: 'Labour ledger entry not found.' });
      }

      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
