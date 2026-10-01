import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { WetProduction } from '../../../src/models/WetProduction';
import { syncRecords } from '../../../lib/sync-records';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await connectToDatabase();
    const data = req.body;
    const sanitizedData = Array.isArray(data)
      ? data.map(({ maiaUsed: _maiaUsed, ...rest }) => rest)
      : [];
    const count = await syncRecords(WetProduction, sanitizedData);
    return res.json({ success: true, count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
