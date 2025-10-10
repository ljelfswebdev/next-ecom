// models/Settings.js
import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: { type: String, trim: true, uppercase: true, required: true, index: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  amount: { type: Number, required: true, min: 0 },
  appliesTo: {
    scope: { type: String, enum: ['all', 'categories', 'products'], default: 'all' },
    ids:   { type: [String], default: [] }, // store ObjectId strings or slugs
  },
  validFrom: Date,
  validTo: Date,
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usedCount:  { type: Number, default: 0 },
  enabled:    { type: Boolean, default: true },
}, { _id: true });

const SettingsSchema = new mongoose.Schema({
  vatPercent: { type: Number, default: 20 },

  baseCurrency: { type: String, default: 'GBP' },
  supportedCurrencies: { type: [String], default: ['GBP','EUR','USD'] },
  fx: {
    GBP: { type: Number, default: 1 },
    EUR: { type: Number, default: 1.15 },
    USD: { type: Number, default: 1.28 },
    lastUpdatedAt: Date,
    source: { type: String, default: 'manual' }
  },

  shipping: {
    UK:  { GBP: Number, EUR: Number, USD: Number },
    EU:  { GBP: Number, EUR: Number, USD: Number },
    USA: { GBP: Number, EUR: Number, USD: Number },
  },

  // NEW: free delivery thresholds (GBP baseline)
  freeOverGBP: {
    UK:  { type: Number, default: 0 },
    EU:  { type: Number, default: 0 },
    USA: { type: Number, default: 0 },
  },

  // Store info
  storeName: { type: String, default: '' },
  supportEmail: { type: String, default: '' },
  storeAddress: { type: String, default: '' },
  contactNumber: { type: String, default: '' },

  // NEW: coupons
  coupons: { type: [CouponSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);