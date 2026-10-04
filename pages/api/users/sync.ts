import type { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongoose';
import { User } from '../../../src/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await connectToDatabase();
    const data = req.body;
    await User.deleteMany({});
    if (Array.isArray(data) && data.length > 0) {
      await User.insertMany(data);
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      await User.create(data);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
