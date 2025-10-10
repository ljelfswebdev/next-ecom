import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// tiny sanitizer to keep only fields we allow
function cleanProduct(b) {
  const safe = {};
  if (typeof b.title === 'string') safe.title = b.title;
  if (typeof b.slug === 'string') safe.slug = b.slug.replace(/^\//, '');
  if (typeof b.description === 'string') safe.description = b.description;
  if (Array.isArray(b.images)) safe.images = b.images.filter(Boolean);

  if (typeof b.basePriceExVat === 'number')
    safe.basePriceExVat = b.basePriceExVat;

  if (Array.isArray(b.sizesAvailable))
    safe.sizesAvailable = b.sizesAvailable.filter(Boolean);

  if (Array.isArray(b.colorsAvailable))
    safe.colorsAvailable = b.colorsAvailable.filter(Boolean);

  if (Array.isArray(b.categoryIds))
    safe.categoryIds = b.categoryIds;

  if (b.status === 'draft' || b.status === 'published')
    safe.status = b.status;

  // 🔥 variants: keep only expected shape
  if (Array.isArray(b.variants)) {
    safe.variants = b.variants
      .filter(v => v && typeof v === 'object')
      .map(v => ({
        _id: v._id,                       // keep if present (subdoc id)
        sku: String(v.sku || '').trim().toUpperCase(),
        barcode: v.barcode ? String(v.barcode).trim() : undefined,
        options: {
          size: v.options?.size ?? v.size ?? '',
          color: v.options?.color ?? v.color ?? '',
        },
        stock: Math.max(0, Number.isFinite(+v.stock) ? +v.stock : 0),
        priceExVatGBP: (v.priceExVatGBP === null || v.priceExVatGBP === '' || typeof v.priceExVatGBP === 'undefined')
          ? undefined
          : Number(v.priceExVatGBP),
      }));
  }

  return safe;
}

async function requireStaff() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'staff'].includes(session.user?.role)) {
    return { ok: false, res: new Response('Forbidden', { status: 403 }) };
  }
  return { ok: true };
}

export async function GET(_req, { params }) {
  await dbConnect();
  const doc = await Product.findById(params.id);
  if (!doc) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(doc), { status: 200 });
}

export async function PATCH(req, { params }) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.res;

  await dbConnect();
  const body = await req.json();
  const update = cleanProduct(body);

  try {
    const doc = await Product.findByIdAndUpdate(
      params.id,
      update,
      {
        new: true,
        runValidators: true,
        overwrite: false,
      }
    );
    if (!doc) return new Response('Not found', { status: 404 });
    return new Response(JSON.stringify(doc), { status: 200 });
  } catch (e) {
    console.error('PATCH product error', e);
    return new Response('Validation error', { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.res;

  await dbConnect();
  await Product.findByIdAndDelete(params.id);
  return new Response(null, { status: 204 });
}