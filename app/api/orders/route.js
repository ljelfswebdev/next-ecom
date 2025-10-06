import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';
import Settings from '@/models/Settings';
import { sendOrderConfirmation } from '@/lib/email';
import { applyVat, convertFromGBP } from '@/lib/pricing';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';

export async function POST(req) {
  const {
    email,
    items,
    currency = 'GBP',
    zone = 'UK',

    // NEW: optional customer details
    billingAddress,
    shippingAddress,
    customerName,
    saveToAccount, // boolean: if logged in, persist these addresses to the profile
  } = await req.json();

  if (!email || !items?.length) {
    return new Response('Missing fields', { status: 400 });
  }

  await dbConnect();

  // Load global settings (VAT, shipping, FX)
  const settings = await Settings.findOne({});
  const vat = settings?.vatPercent ?? 20;
  const fx = settings?.fx || { GBP: 1, EUR: 1.15, USD: 1.28 };

  // Calculate line totals
  let subtotalExVatGBP = 0;
  const enriched = (items || []).map((it) => {
    const unitEx = it.unitPriceExVatGBP ?? 0;
    const qty = it.qty || 1;
    const lineEx = unitEx * qty;
    subtotalExVatGBP += lineEx;

    const lineInc = applyVat(lineEx, vat);
    return {
      ...it,
      qty,
      vatPercent: vat,
      lineVat: +(lineInc - lineEx).toFixed(2),
      lineTotalIncVatGBP: +lineInc.toFixed(2),
    };
  });

  // Shipping (stored/valued in GBP internally)
  const shippingGBP = settings?.shipping?.[zone]?.GBP ?? 0;

  // Totals in GBP
  const vatTotalGBP = enriched.reduce((a, b) => a + (b.lineVat || 0), 0);
  const grandTotalGBP = Math.round((subtotalExVatGBP + vatTotalGBP + shippingGBP) * 100) / 100;

  // Display total in chosen currency
  const displayTotal = convertFromGBP(grandTotalGBP, fx, currency);

  // Who's placing the order?
  const session = await getServerSession(authOptions);
  const customerId = session?.user?.id || null;

  // Build order document
  const orderDoc = {
    // keep your existing field for backward compatibility
    email,

    // NEW: explicit customer fields used in Admin & CSV
    customerId,                             // ObjectId or null
    customerEmail: email,                   // duplicate of email for clarity
    customerName: customerName || billingAddress?.fullName || '',

    billingAddress: billingAddress || null, // full AddressSchema object
    shippingAddress: shippingAddress || null,

    items: enriched,
    currency,
    fxRateUsed: fx?.[currency] || 1,
    totals: {
      subtotalExVatGBP,
      vatTotalGBP,
      shippingGBP,
      grandTotalGBP,
      grandTotalDisplay: displayTotal,      // number in display currency
    },
    status: 'created',
  };

  const order = await Order.create(orderDoc);

  // Optionally persist addresses back to the user's profile
  if (saveToAccount && customerId) {
    await User.findByIdAndUpdate(
      customerId,
      {
        // only update name if a new one was provided
        ...(customerName ? { name: customerName } : {}),
        addresses: {
          billing: billingAddress || null,
          shipping: shippingAddress || null,
        },
      },
      { new: true }
    );
  }

  // Send confirmation email (uses display currency)
  try {
    const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(displayTotal);
    await sendOrderConfirmation({ to: email, orderId: order._id, totalFormatted: fmt });
  } catch (e) {
    console.error('Email error', e?.message);
    // don’t fail order on email issues
  }

  return new Response(JSON.stringify(order), { status: 201 });
}