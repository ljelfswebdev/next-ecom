// models/Product.js
import mongoose from 'mongoose';

const { Schema, models, model } = mongoose;

/** --- Variant sub-schemas --- */
const VariantOptionsSchema = new Schema(
  {
    size:  { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const VariantSchema = new Schema(
  {
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      // Make SKU quick to look up. If you want global uniqueness, keep unique:true.
      // If you want per-product uniqueness only, remove `unique` here and enforce in code.
      unique: true,
      sparse: true,
      index: true,
    },
    barcode: { type: String, trim: true },
    options:  { type: VariantOptionsSchema, default: () => ({}) },
    stock:    { type: Number, default: 0, min: 0 },          // authoritative stock
    priceExVatGBP: { type: Number },                         // optional override (falls back to product.basePriceExVat)
  },
  { _id: true }
);

/** --- Product schema --- */
const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug:  { type: String, required: true, unique: true, index: true, trim: true },

    description: { type: String, default: '' },
    images:      { type: [String], default: [] },

    // For selectors; UI can also derive from variants
    sizesAvailable:  { type: [String], default: [] },
    colorsAvailable: { type: [String], default: [] },

    basePriceExVat: { type: Number, required: true, default: 0 }, // GBP baseline

    variants: { type: [VariantSchema], default: [] },

    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],

    status: { type: String, enum: ['draft','published'], default: 'published' },

    // optional SEO
    metaTitle:       { type: String, trim: true },
    metaDescription: { type: String, trim: true },
  },
  { timestamps: true }
);

/** --- Indexes --- */
// basic text search for title/description
ProductSchema.index({ title: 'text', description: 'text' });

/** --- Helpers --- */
// Find the first variant matching the provided options (any blank filter is ignored)
ProductSchema.methods.findVariantByOptions = function (size, color) {
  return (this.variants || []).find(v =>
    (size  ? v?.options?.size  === size  : true) &&
    (color ? v?.options?.color === color : true)
  );
};

// Safer getter to compute unit price (ex VAT) given a variantId (optional)
ProductSchema.methods.getUnitPriceExVat = function (variantId) {
  if (variantId) {
    const v = (this.variants || []).find(x => String(x._id) === String(variantId));
    if (v && typeof v.priceExVatGBP === 'number') return v.priceExVatGBP;
  }
  return this.basePriceExVat || 0;
};

// Optional: normalize slug on set (useful if you allow editing titles)
ProductSchema.pre('validate', function(next){
  if (this.slug) this.slug = String(this.slug).replace(/^\//,'').trim();
  next();
});

export default models.Product || model('Product', ProductSchema);