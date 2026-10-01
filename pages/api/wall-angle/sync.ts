import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { WallAngle } from '../../../src/models/WallAngle';
import { syncRecords } from '../../../lib/sync-records';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' || !Array.isArray(req.body)) return res.status(405).json({ error: 'POST an array of Wall Angle items.' });
  try {
    await connectToDatabase();
    const count = await syncRecords(WallAngle, req.body, false, 'wall_angle_');
    return res.status(200).json({ success: true, count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}