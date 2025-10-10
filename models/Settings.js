// models/Settings.js
import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  vatPercent: { type: Number, default: 20 },

  // Currency (kept but UK-only is fine)
  baseCurrency: { type: String, default: 'GBP' },
  supportedCurrencies: { type: [String], default: ['GBP','EUR','USD'] },
  fx: {
    GBP: { type: Number, default: 1 },
    EUR: { type: Number, default: 1.15 },
    USD: { type: Number, default: 1.28 },
    lastUpdatedAt: Date,
    source: { type: String, default: 'manual' }
  },

  // Shipping (you can keep UK-only values if that’s all you use)
  shipping: {
    UK: { GBP: Number, EUR: Number, USD: Number },
    EU: { GBP: Number, EUR: Number, USD: Number },
    USA: { GBP: Number, EUR: Number, USD: Number }
  },

  // 🔥 NEW store info fields
  storeName: { type: String, default: '' },
  supportEmail: { type: String, default: '' },
  storeAddress: { type: String, default: '' },
  contactNumber: { type: String, default: '' },
},{ timestamps:true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);