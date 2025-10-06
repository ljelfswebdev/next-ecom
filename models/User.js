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

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true, required: true },
  passwordHash: String,
  role: { type: String, enum: ['admin', 'staff', 'user'], default: 'user' },
  addresses: {
    billing: AddressSchema,
    shipping: AddressSchema,
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);