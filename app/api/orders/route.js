// app/api/orders/route.js
import { dbConnect } from '@/lib/db';
import mongoose from 'mongoose';
import Product from '@/models/Product';
import Order from '@/models/Order';
import Settings from '@/models/Settings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Small helpers (kept inline for simplicity)
const applyVat = (ex, pct) => +(ex * (1 + (pct ?? 0) / 100)).toFixed(2);
const convertFromGBP = (gbp, fx, currency = 'GBP') => {
  const rate = Number(fx?.[currency] ?? 1);
  return +(Number(gbp) * rate).toFixed(2);
};

export async function POST(req) {
  await dbConnect();
  const body = await req.json();

  const {
    email,
    customerName,
    items,                 // [{ productId, variantId, sku, qty, unitPriceExVatGBP, ... }]
    currency = 'GBP',
    zone = 'UK',
    billingAddress,
    shippingAddress,
    saveToAccount = false,
  } = body;

  if (!email || !Array.isArray(items) || items.length === 0) {
    return new Response('Missing fields', { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const settings = await Settings.findOne({}).lean();

  const vat = settings?.vatPercent ?? 20;
  const fx = settings?.fx || { GBP: 1 };

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    // 1) Validate items, compute enriched lines, and atomically decrement stock
    let subtotalExVatGBP = 0;
    const enriched = [];

    for (const it of items) {
      const qty = Math.max(1, parseInt(it.qty || '1', 10));

      const product = await Product.findById(it.productId).session(mongoSession);
      if (!product) throw new Error(`Product not found: ${it.productId}`);

      const variant = (product.variants || []).find(v =>
        String(v._id) === String(it.variantId) || v.sku === it.sku
      );
      if (!variant) throw new Error(`Variant not found for product ${product.title}`);

      // authoritative price on server
      const unitEx =
        typeof variant.priceExVatGBP === 'number'
          ? variant.priceExVatGBP
          : (product.basePriceExVat || 0);

      // atomic stock check/decrement
      const res = await Product.updateOne(
        {
          _id: product._id,
          'variants._id': variant._id,
          'variants.stock': { $gte: qty }
        },
        { $inc: { 'variants.$.stock': -qty } },
        { session: mongoSession }
      );

      if (res.modifiedCount !== 1) {
        throw new Error(`Insufficient stock for ${product.title} (${variant.sku}).`);
      }

      const lineEx = +(unitEx * qty).toFixed(2);
      const lineInc = applyVat(lineEx, vat);

      subtotalExVatGBP += lineEx;

      enriched.push({
        productId: product._id,
        title: product.title,
        image: product.images?.[0],
        variantId: variant._id,
        sku: variant.sku,
        variant: {
          size: variant.options?.size || it.variant?.size || '',
          color: variant.options?.color || it.variant?.color || ''
        },
        qty,
        unitPriceExVatGBP: unitEx,
        vatPercent: vat,
        lineVat: +(lineInc - lineEx).toFixed(2),
        lineTotalIncVatGBP: +lineInc.toFixed(2),
      });
    }

    // 2) Shipping with FREE threshold
    const flatGBP = Number(settings?.shipping?.[zone]?.GBP ?? 0);
    const freeThreshold = Number(settings?.freeOverGBP?.[zone] ?? 0);
    const shippingGBP =
      freeThreshold > 0 && subtotalExVatGBP >= freeThreshold ? 0 : flatGBP;

    // 3) Totals
    const vatTotalGBP = +(subtotalExVatGBP * (vat / 100)).toFixed(2);
    const grandTotalGBP = +(subtotalExVatGBP + vatTotalGBP + shippingGBP).toFixed(2);
    const displayTotal = convertFromGBP(grandTotalGBP, fx, currency);

    // 4) Optionally persist account address/name
    if (saveToAccount && session?.user) {
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(
        session.user.id,
        {
          $set: {
            name: customerName || session.user.name || '',
            'addresses.billing': billingAddress || {},
            'addresses.shipping': shippingAddress || billingAddress || {},
          }
        },
        { session: mongoSession }
      );
    }

    // 5) Create order
    const [order] = await Order.create([{
      email,
      customerName,
      billingAddress,
      shippingAddress,
      items: enriched,
      currency,
      zone,
      fxRateUsed: fx?.[currency] || 1,
      totals: {
        subtotalExVatGBP,
        vatTotalGBP,
        shippingGBP,
        grandTotalGBP,
        grandTotalDisplay: displayTotal,
        freeShippingThresholdGBP: freeThreshold, // optional: for audit
      },
      status: 'created',
    }], { session: mongoSession });

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    // (send emails asynchronously here if desired)

    return new Response(JSON.stringify(order), { status: 201 });
  } catch (err) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    console.error('Order error:', err?.message);
    return new Response(err?.message || 'Order error', { status: 400 });
  }
}