import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// normalize incoming variants to the schema shape
function normalizeVariants(arr = []) {
  return arr.map(v => ({
    _id: v._id || new mongoose.Types.ObjectId(),
    sku: (v.sku || '').trim().toUpperCase() || undefined,
    barcode: (v.barcode || '').trim() || undefined,
    options: {
      size:  v?.options?.size  ?? v.size  ?? '',
      color: v?.options?.color ?? v.color ?? '',
    },
    stock: Number.isFinite(+v.stock) ? +v.stock : 0,
    priceExVatGBP:
      v.priceExVatGBP === '' || v.priceExVatGBP == null
        ? undefined
        : +v.priceExVatGBP,
  }));
}

export async function GET(_req, { params }) {
  await dbConnect();
  const doc = await Product.findById(params.id).lean();
  if (!doc) return new NextResponse('Not found', { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(req, { params }) {
  await dbConnect();
  const body = await req.json();

  const update = {
    title: body.title,
    slug: body.slug?.replace(/^\//,''),
    description: body.description ?? '',
    images: Array.isArray(body.images) ? body.images : [],
    sizesAvailable: Array.isArray(body.sizesAvailable) ? body.sizesAvailable : [],
    colorsAvailable: Array.isArray(body.colorsAvailable) ? body.colorsAvailable : [],
    basePriceExVat: Number(body.basePriceExVat) || 0,
    categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds : [],
    status: body.status === 'draft' ? 'draft' : 'published',
  };

  if (Array.isArray(body.variants)) {
    update.variants = normalizeVariants(body.variants);
  }

  const doc = await Product.findByIdAndUpdate(
    params.id,
    update,
    { new: true, runValidators: true }
  );

  if (!doc) return new NextResponse('Not found', { status: 404 });
  return NextResponse.json(doc);
}