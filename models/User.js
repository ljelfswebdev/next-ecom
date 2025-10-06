
import mongoose from 'mongoose';
const AddressSchema = new mongoose.Schema({
  label: String, line1: String, line2: String, city: String, region: String, postcode: String, country: String, isDefault: Boolean,
},{ _id:false });
const UserSchema = new mongoose.Schema({
  role: { type: String, enum: ['admin','staff','customer'], default: 'customer' },
  email: { type: String, unique: true, required: true },
  passwordHash: String,
  name: String,
  phone: String,
  addresses: [AddressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
},{ timestamps:true });
export default mongoose.models.User || mongoose.model('User', UserSchema);
