import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  line1: String,
  line2: String,
  city: String,
  region: String,
  postcode: String,
  country: String,
}, { _id:false });

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: String,
  image: String,
  // variant snapshot
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sku: { type: String, required: true },
  variant: {
    size: String,
    color: String,
  },
  qty: { type: Number, required: true, min: 1 },
  unitPriceExVatGBP: { type: Number, required: true },     // snapshot of price
  vatPercent: { type: Number, default: 20 },
  lineVat: Number,
  lineTotalIncVatGBP: Number,
}, { _id:false });

const OrderSchema = new mongoose.Schema({
  email: { type: String, required: true },
  customerName: String,
  billingAddress: AddressSchema,
  shippingAddress: AddressSchema,

  items: { type: [OrderItemSchema], default: [] },

  status: { type: String, enum: ['created','paid','shipped','cancelled','refunded'], default: 'created', index: true },

  currency: { type: String, default: 'GBP' },
  zone: { type: String, default: 'UK' },
  fxRateUsed: { type: Number, default: 1 },
  totals: {
    subtotalExVatGBP: Number,
    vatTotalGBP: Number,
    shippingGBP: Number,
    grandTotalGBP: Number,
    grandTotalDisplay: Number,
  },

  // (coming later) orderNumber, etc.
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);