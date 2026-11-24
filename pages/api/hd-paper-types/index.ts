import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { HdPaperType } from '../../../src/models/HdPaperType';

function sanitizeType(payload: any) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const { _id, __v, ...type } = payload;
  return type;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();

    if (req.method === 'GET') {
      const types = await HdPaperType.find().sort({ name: 1 });
      return res.status(200).json(types);
    }

    if (req.method === 'POST') {
      const payloads = (Array.isArray(req.body) ? req.body : [req.body])
        .map(sanitizeType)
        .filter((type): type is Record<string, any> => type !== null);

      if (payloads.length !== (Array.isArray(req.body) ? req.body.length : 1)) {
        return res.status(400).json({ error: 'Expected an HD paper type or array of HD paper types.' });
      }

      await Promise.all(payloads.map((typePayload) => {
        if (!typePayload.id) {
          typePayload.id = `hd_paper_type_${Math.random().toString(36).slice(2, 11)}`;
        }
        return HdPaperType.findOneAndUpdate(
          { id: typePayload.id },
          { $set: typePayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }));

      return res.status(200).json({ success: true, count: payloads.length });
    }

    if (req.method === 'DELETE') {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing HD paper type id.' });
      await HdPaperType.deleteOne({ id });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}