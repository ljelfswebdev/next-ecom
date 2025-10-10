// models/PasswordResetToken.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  used: { type: Boolean, default: false },
  usedAt: Date,
}, { timestamps: true });

export default mongoose.models.PasswordResetToken
  || mongoose.model('PasswordResetToken', schema);