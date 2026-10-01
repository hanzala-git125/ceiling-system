import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { TCross } from '../../../src/models/TCross';
import { syncRecords } from '../../../lib/sync-records';

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
      const items = await TCross.find().sort({ name: 1 });
      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      const payload = sanitizeRawPayload(req.body);

      if (Array.isArray(payload)) {
        const count = await syncRecords(TCross, payload);
        return res.status(200).json({ success: true, count });
      }

      if (payload && typeof payload === 'object') {
        const itemPayload = payload as any;
        if (!itemPayload.id) {
          itemPayload.id = `tcross_${Math.random().toString(36).substr(2, 9)}`;
        }

        const item = await TCross.findOneAndUpdate(
          { id: itemPayload.id },
          { $set: itemPayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(item);
      }

      return res.status(400).json({ error: 'Expected a T Cross payload or array of items.' });
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      await TCross.findOneAndDelete({ id });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
