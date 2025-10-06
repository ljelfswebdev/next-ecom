import mongoose, { Schema } from 'mongoose';

const ReviewSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true, required: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  userName:  { type: String, default: '' },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, default: '' },
}, { timestamps: true });

// optional: prevent multiple reviews per user per product
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);