import mongoose from 'mongoose';

const TCrossSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true, default: 'feet' },
  quantity: { type: Number, required: true, default: 0 },
  costPerUnit: { type: Number, required: true, default: 0 },
  minThreshold: { type: Number, required: true, default: 0 },
  conversionFactor: { type: Number, required: true, default: 1 },
  createdAt: { type: String, required: true }
}, { timestamps: true });

export const TCross = mongoose.models.TCross || mongoose.model('TCross', TCrossSchema);
