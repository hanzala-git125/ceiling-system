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
  try {
    await connectToDatabase();

    if (req.method === 'GET') {
      const panniTypes = await PanniType.find().sort({ name: 1 });
      return res.status(200).json(panniTypes);
    }

    if (req.method === 'POST') {
      const payload = sanitizeRawPayload(req.body);

      if (Array.isArray(payload)) {
        await PanniType.deleteMany({});
        if (payload.length > 0) {
          await PanniType.insertMany(payload);
        }
        return res.status(200).json({ success: true, count: payload.length });
      }

      if (payload && typeof payload === 'object') {
        const panniTypePayload = payload as any;
        if (!panniTypePayload.id) {
          panniTypePayload.id = `panni_type_${Math.random().toString(36).substr(2, 9)}`;
        }

        const panniType = await PanniType.findOneAndUpdate(
          { id: panniTypePayload.id },
          { $set: panniTypePayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(panniType);
      }

      return res.status(400).json({ error: 'Expected a panni type payload or array of panni types.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
