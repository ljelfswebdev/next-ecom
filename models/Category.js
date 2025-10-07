// models/Category.js
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug:  { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft','published'], default: 'published' },
}, { timestamps: true });

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);