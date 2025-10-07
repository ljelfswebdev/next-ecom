import mongoose, { Schema } from 'mongoose';

const BlockSchema = new Schema({
  // oneOf by 'type'
  type: { type: String, required: true, enum: ['banner','text','imageText','gallery','parallax'] },

  // shared
  headline: String,
  subheadline: String,
  textHtml: String,           // for rich text blocks (save sanitized HTML)
  image: String,              // single image url
  images: [String],           // gallery
  align: { type: String, enum:['left','right','center'], default:'center' }, // for imageText/banner
  ctaLabel: String,
  ctaHref: String,
  // parallax settings
  height: { type: Number, default: 480 },
  overlayOpacity: { type: Number, default: 0.3 },
}, { _id: false });

const PageSchema = new Schema({
  title: { type: String, required: true },
  slug:  { type: String, required: true, unique: true, index: true },
  status:{ type: String, enum:['draft','published'], default: 'draft' },
  blocks:[ BlockSchema ],
}, { timestamps: true });

export default mongoose.models.Page || mongoose.model('Page', PageSchema);