import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { Formula } from '../../../src/models/Formula';
import { syncRecords } from '../../../lib/sync-records';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await connectToDatabase();
    const data = req.body;
    const count = await syncRecords(Formula, data);
    return res.json({ success: true, count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
