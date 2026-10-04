import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { WallAngle } from '../../../src/models/WallAngle';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    if (req.method === 'GET') {
      return res.status(200).json(await WallAngle.find().sort({ name: 1 }));
    }
    if (req.method === 'POST') {
      const payload = req.body;
      if (Array.isArray(payload)) {
        await WallAngle.deleteMany({});
        return res.status(200).json(await WallAngle.insertMany(payload));
      }
      const item = { ...payload };
      if (!item.id) item.id = `wall_angle_${Math.random().toString(36).slice(2, 11)}`;
      return res.status(200).json(await WallAngle.findOneAndUpdate({ id: item.id }, { $set: item }, { new: true, upsert: true }));
    }
    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      await WallAngle.findOneAndDelete({ id });
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}