import { dbConnect } from '@/lib/db';
import mongoose from 'mongoose';
import Product from '@/models/Product';
import Order from '@/models/Order';
import Settings from '@/models/Settings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyVat, convertFromGBP } from '@/lib/pricing'; // keep your helpers or inline if you prefer

export async function POST(req) {
  await dbConnect();
  const body = await req.json();

  const {
    email,
    customerName,
    items,                 // [{ productId, variantId, sku, qty, unitPriceExVatGBP, ... }]
    currency='GBP',
    zone='UK',
    billingAddress,
    shippingAddress,
    saveToAccount=false,
  } = body;

  if (!email || !Array.isArray(items) || items.length===0) {
    return new Response('Missing fields', { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const settings = await Settings.findOne({}).lean();
  const vat = settings?.vatPercent ?? 20;
  const fx = settings?.fx || { GBP:1 };
  const shippingGBP = settings?.shipping?.[zone]?.GBP ?? 0;

  // open transaction
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    // 1) Validate items, compute enriched lines, and reserve stock
    let subtotalExVatGBP = 0;
    const enriched = [];

    for (const it of items) {
      const qty = Math.max(1, parseInt(it.qty || 1,10));
      const product = await Product.findById(it.productId).session(mongoSession);
      if (!product) throw new Error(`Product not found: ${it.productId}`);

      const variant = (product.variants || []).find(v =>
        String(v._id) === String(it.variantId) || v.sku === it.sku
      );
      if (!variant) throw new Error(`Variant not found for product ${product.title}`);

      // authoritative unit price on server
      const unitEx = typeof variant.priceExVatGBP === 'number'
        ? variant.priceExVatGBP
        : product.basePriceExVat;

      // stock check via conditional update (atomic)
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
      subtotalExVatGBP += lineEx;
      const lineInc = applyVat(lineEx, vat);

      enriched.push({
        productId: product._id,
        title: product.title,
        image: product.images?.[0],
        variantId: variant._id,
        sku: variant.sku,
        variant: { size: variant.options?.size || it.variant?.size, color: variant.options?.color || it.variant?.color },
        qty,
        unitPriceExVatGBP: unitEx,
        vatPercent: vat,
        lineVat: +(lineInc - lineEx).toFixed(2),
        lineTotalIncVatGBP: +lineInc.toFixed(2),
      });
    }

    const vatTotalGBP = +(subtotalExVatGBP * (vat/100)).toFixed(2);
    const grandTotalGBP = +(subtotalExVatGBP + vatTotalGBP + (shippingGBP||0)).toFixed(2);
    const displayTotal = convertFromGBP ? convertFromGBP(grandTotalGBP, fx, currency) : grandTotalGBP;

    // Optionally update account addresses if logged in and requested
    if (saveToAccount && session?.user) {
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(session.user.id, {
        $set: {
          name: customerName || session.user.name || '',
          'addresses.billing': billingAddress || {},
          'addresses.shipping': shippingAddress || billingAddress || {},
        }
      }, { session: mongoSession });
    }

    // 2) Create order
    const order = await Order.create([{
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
        shippingGBP: shippingGBP || 0,
        grandTotalGBP,
        grandTotalDisplay: displayTotal,
      },
      status: 'created',
    }], { session: mongoSession });

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    // (send emails here if you want; non-blocking)

    return new Response(JSON.stringify(order[0]), { status: 201 });

  } catch (err) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    console.error('Order error:', err?.message);
    return new Response(err?.message || 'Order error', { status: 400 });
  }
}