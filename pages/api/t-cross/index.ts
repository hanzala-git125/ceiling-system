import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { TCross } from '../../../src/models/TCross';

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
        await TCross.deleteMany({});
        if (payload.length > 0) {
          await TCross.insertMany(payload);
        }
        return res.status(200).json({ success: true, count: payload.length });
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

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
