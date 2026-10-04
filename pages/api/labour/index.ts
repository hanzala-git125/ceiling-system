import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { Operator } from '../../../src/models/Operator';

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
      const operators = await Operator.find().sort({ name: 1 });
      return res.status(200).json(operators);
    }

    if (req.method === 'POST') {
      const payload = sanitizeRawPayload(req.body);

      if (Array.isArray(payload)) {
        await Operator.deleteMany({});
        if (payload.length > 0) {
          await Operator.insertMany(payload);
        }
        return res.status(200).json({ success: true, count: payload.length });
      }

      if (payload && typeof payload === 'object') {
        const operatorPayload = payload as any;
        if (!operatorPayload.id) {
          operatorPayload.id = `op_${Math.random().toString(36).substr(2, 9)}`;
        }

        const operator = await Operator.findOneAndUpdate(
          { id: operatorPayload.id },
          { $set: operatorPayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(operator);
      }

      return res.status(400).json({ error: 'Expected an operator payload or array.' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Operator id is required.' });
      }

      const deleted = await Operator.findOneAndDelete({ id });
      if (!deleted) {
        return res.status(404).json({ error: 'Operator not found.' });
      }

      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
