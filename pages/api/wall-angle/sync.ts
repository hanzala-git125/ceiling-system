import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { WallAngle } from '../../../src/models/WallAngle';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' || !Array.isArray(req.body)) return res.status(405).json({ error: 'POST an array of Wall Angle items.' });
  try {
    await connectToDatabase();
    await WallAngle.deleteMany({});
    const items = req.body.map((item: any) => ({ ...item, id: item.id || `wall_angle_${Math.random().toString(36).slice(2, 11)}` }));
    return res.status(200).json(await WallAngle.insertMany(items));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}