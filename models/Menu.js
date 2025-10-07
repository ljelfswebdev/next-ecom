import mongoose, { Schema } from 'mongoose';

const MenuItemSchema = new Schema({
  label: { type: String, required: true },
  type: { type: String, enum: ['page','custom'], required: true },
  // if type === 'page'
  pageId: { type: Schema.Types.ObjectId, ref: 'Page' },
  // if type === 'custom'
  href: { type: String },

  target: { type: String, enum: ['_self','_blank'], default: '_self' },

  children: [{ type: Object }], // nested MenuItemSchema snapshots; we'll validate lightly
}, { _id: true });

const MenuSchema = new Schema({
  title: { type: String, required: true },
  slug:  { type: String, required: true, unique: true }, // e.g. "main"
  status:{ type: String, enum: ['draft','published'], default: 'published' },
  items: { type: [MenuItemSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.Menu || mongoose.model('Menu', MenuSchema);