import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  productName: { type: String, required: true, default: 'Plate 2*2' },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  discount: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true },
  date: { type: String, required: true },
  notes: { type: String },
  createdAt: { type: String, required: true },
  paidAmount: { type: Number },
  dueAmount: { type: Number },
  status: { type: String }
  ,tCrossFeet: { type: Number }
  ,tCrossRate: { type: Number }
  ,tCrossAmount: { type: Number }
  ,tCrossTypeId: { type: String }
  ,tCrossTypeName: { type: String }
  ,tCrossUnit: { type: String }
  ,wallAnglePieces: { type: Number }
  ,wallAngleRate: { type: Number }
  ,wallAngleAmount: { type: Number }
  ,wallAngleId: { type: String }
  ,wallAngleName: { type: String }
  ,wallAngleUnit: { type: String }
}, { timestamps: true });

export const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
