import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { PanniType } from '../../../src/models/PanniType';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectToDatabase();
    const data = sanitizeRawPayload(req.body);
    const items = Array.isArray(data) ? data : data ? [data] : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (!item.id) {
        item.id = `panni_type_${Math.random().toString(36).substr(2, 9)}`;
      }
      await PanniType.findOneAndUpdate(
        { id: item.id },
        { $set: item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    return res.json({ success: true, count: items.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
