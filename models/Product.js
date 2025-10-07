// models/Product.js
import mongoose, { Schema } from 'mongoose';

const VariantSchema = new Schema({
  size:  String,
  color: String,
  sku:   String,
  stock: { type:Number, default: 0 },
}, { _id:false });

const ProductSchema = new Schema({
  title:       { type: String, required: true },
  slug:        { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '' },
  images:      { type: [String], default: [] },

  // base price in GBP, ex VAT
  basePriceExVat: { type: Number, required: true },

  // SIMPLE attributes
  sizesAvailable:  { type: [String], default: [] },  // ['XS','S',...]
  colorsAvailable: { type: [String], default: [] },  // ['red','blue','green']

  // OPTIONAL variant matrix (kept for future SKUs/inventory)
  variants: { type: [VariantSchema], default: [] },

  // NEW: categories (many-to-many)
  categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],

  // (old string category kept for backward-compat; no longer used for filtering)
  category: { type: String },

  // ratings
  ratingAvg:   { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },

  status: { type: String, enum:['draft','published'], default: 'published' },
}, { timestamps: true });

// helpful indexes for sorting/filtering
ProductSchema.index({ title: 1 });
ProductSchema.index({ basePriceExVat: 1 });
ProductSchema.index({ sizesAvailable: 1 });
ProductSchema.index({ colorsAvailable: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);