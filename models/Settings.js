
import mongoose from 'mongoose';
const SettingsSchema = new mongoose.Schema({
  vatPercent: { type: Number, default: 20 },
  baseCurrency: { type: String, default: 'GBP' },
  supportedCurrencies: { type: [String], default: ['GBP','EUR','USD'] },
  fx: { GBP: { type: Number, default: 1 }, EUR: { type: Number, default: 1.15 }, USD: { type: Number, default: 1.28 }, lastUpdatedAt: Date, source: { type: String, default: 'manual' } },
  shipping: { UK: { GBP: Number, EUR: Number, USD: Number }, EU: { GBP: Number, EUR: Number, USD: Number }, USA: { GBP: Number, EUR: Number, USD: Number } },
  supportEmail: String,
  storeName: String,
},{ timestamps:true });
export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

