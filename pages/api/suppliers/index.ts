import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { Supplier } from '../../../src/models/Supplier';

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
      const suppliers = await Supplier.find().sort({ createdAt: 1, name: 1 });
      return res.status(200).json(suppliers);
    }

    if (req.method === 'POST') {
      const payload = sanitizeRawPayload(req.body);

      if (Array.isArray(payload)) {
        await Supplier.deleteMany({});
        if (payload.length > 0) {
          await Supplier.insertMany(payload);
        }
        return res.status(200).json({ success: true, count: payload.length });
      }

      if (payload && typeof payload === 'object') {
        const supplierPayload = payload as any;
        if (!supplierPayload.id) {
          supplierPayload.id = `supp_${Math.random().toString(36).substr(2, 9)}`;
        }

        const supplier = await Supplier.findOneAndUpdate(
          { id: supplierPayload.id },
          { $set: supplierPayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(supplier);
      }

      return res.status(400).json({ error: 'Expected a supplier payload or array of suppliers.' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Supplier id is required.' });
      }

      const deleted = await Supplier.findOneAndDelete({ id });
      if (!deleted) {
        return res.status(404).json({ error: 'Supplier not found.' });
      }

      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
