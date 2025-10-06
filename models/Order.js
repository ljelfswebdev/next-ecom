
import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
  fullName: String,
  line1: String,
  line2: String,
  city: String,
  region: String,
  postcode: String,
  country: String,
  phone: String,
}, { _id: false });

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: String,
  variant: { size: String, color: String, sku: String },
  qty: Number,
  unitPriceExVatGBP: Number,
  vatPercent: Number,
  lineVat: Number,
  lineTotalIncVatGBP: Number,
},{ _id:false });

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  items: [OrderItemSchema],
  currency: { type: String, enum: ['GBP','EUR','USD'], default: 'GBP' },
  fxRateUsed: { type: Number, default: 1 },
  totals: {
    subtotalExVatGBP: Number,
    vatTotalGBP: Number,
    shippingGBP: Number,
    grandTotalGBP: Number,
    grandTotalDisplay: Number,
  },
  status: { type: String, enum: ['created','confirmed','fulfilled','cancelled'], default: 'created' },
  shippingAddress: Object,
  billingAddress: Object,
  notes: String,
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerEmail: String,
  customerName: String,
  billingAddress: AddressSchema,
  shippingAddress: AddressSchema,
},{ timestamps:true });



export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
