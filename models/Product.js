
import mongoose from 'mongoose';
const VariantSchema = new mongoose.Schema({
  sku: String, size: String, color: String, priceExVat: Number, stock: { type: Number, default: 0 },
},{ _id:false });
// ...existing imports
const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  description: String,
  images: [String],
  category: String,

  basePriceExVat: Number,

// models/Product.js
sizesAvailable: [{ type: String }],   // ['XS','S','M','L','XL','XXL']
colorsAvailable: [{ type: String }],  // ['red','blue','green']

  // (variants can still exist later if you want per-variant price/stock)
  variants: [{
    sku: String,
    size: String,
    color: String,
    priceExVat: Number,
    stock: { type: Number, default: 0 },
  }],

  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  status: { type: String, enum:['draft','published'], default:'published' },
},{ timestamps:true });
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
