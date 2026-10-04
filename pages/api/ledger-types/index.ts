import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { HdPaperType } from '../../../src/models/HdPaperType';

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
      const types = await HdPaperType.find().sort({ name: 1 });
      return res.status(200).json(types);
    }

    if (req.method === 'POST') {
      const payload = sanitizeRawPayload(req.body);

      if (Array.isArray(payload)) {
        await HdPaperType.deleteMany({});
        if (payload.length > 0) {
          await HdPaperType.insertMany(payload);
        }
        return res.status(200).json({ success: true, count: payload.length });
      }

      if (payload && typeof payload === 'object') {
        const typePayload = payload as any;
        if (!typePayload.id) {
          typePayload.id = `hd_paper_type_${Math.random().toString(36).substr(2, 9)}`;
        }

        const typeInstance = await HdPaperType.findOneAndUpdate(
          { id: typePayload.id },
          { $set: typePayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(typeInstance);
      }

      return res.status(400).json({ error: 'Expected an hd paper type payload or array of hd paper types.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
