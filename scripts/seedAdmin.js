
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Missing MONGODB_URI'); process.exit(1); }

const userSchema = new mongoose.Schema({ role:String, email:String, passwordHash:String, name:String });
const settingsSchema = new mongoose.Schema({ vatPercent:Number, baseCurrency:String, supportedCurrencies:[String], fx:Object, shipping:Object, supportEmail:String, storeName:String });
const User = mongoose.model('User', userSchema);
const Settings = mongoose.model('Settings', settingsSchema);

(async () => {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'ecommerce' });
  const email = 'admin@demo.com'; const password = 'admin123';
  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ role:'admin', email, passwordHash, name:'Master Admin' });
    console.log('Seeded admin user:', email, password);
  } else {
    console.log('Admin already exists:', email);
  }
  const s = await Settings.findOne({});
  if (!s) {
    await Settings.create({
      vatPercent: parseFloat(process.env.DEFAULT_VAT_PERCENT || '20'),
      baseCurrency: 'GBP',
      supportedCurrencies: ['GBP','EUR','USD'],
      fx: { GBP:1, EUR:1.15, USD:1.28, source:'manual', lastUpdatedAt:new Date() },
      shipping: { UK:{ GBP:2.99, EUR:3.49, USD:3.99 }, EU:{ GBP:4.99, EUR:5.99, USD:6.49 }, USA:{ GBP:6.99, EUR:7.49, USD:8.99 } },
      supportEmail: process.env.STORE_SUPPORT_EMAIL || process.env.SMTP_USER,
      storeName: process.env.STORE_NAME || 'My Store',
    });
    console.log('Seeded default Settings.');
  } else {
    console.log('Settings already exist.');
  }
  await mongoose.disconnect(); process.exit(0);
})();
