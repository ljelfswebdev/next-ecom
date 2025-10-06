
import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';
import Settings from '@/models/Settings';
import { sendOrderConfirmation } from '@/lib/email';
import { applyVat, convertFromGBP } from '@/lib/pricing';

export async function POST(req) {
  const body = await req.json();
  const { email, items, currency='GBP', zone='UK' } = body;
  if (!email || !items?.length) return new Response('Missing fields', { status: 400 });
  await dbConnect();
  const settings = await Settings.findOne({});
  const vat = settings?.vatPercent ?? 20;
  const fx = settings?.fx || { GBP:1, EUR:1.15, USD:1.28 };

  let subtotalExVatGBP = 0;
  const enriched = items.map(it => {
    const unitEx = it.unitPriceExVatGBP ?? 0;
    const lineEx = unitEx * it.qty;
    subtotalExVatGBP += lineEx;
    const lineInc = applyVat(lineEx, vat);
    return { ...it, vatPercent: vat, lineVat: lineInc - lineEx, lineTotalIncVatGBP: lineInc };
  });

  const shippingGBP = settings?.shipping?.[zone]?.GBP ?? 0;
  const vatTotalGBP = enriched.reduce((a,b)=> a + (b.lineVat||0), 0);
  const grandTotalGBP = Math.round((subtotalExVatGBP + vatTotalGBP + shippingGBP) * 100)/100;
  const displayTotal = convertFromGBP(grandTotalGBP, fx, currency);

  const order = await Order.create({
    email, items: enriched, currency, fxRateUsed: fx?.[currency] || 1,
    totals: { subtotalExVatGBP, vatTotalGBP, shippingGBP, grandTotalGBP, grandTotalDisplay: displayTotal },
    status: 'created',
  });

  try {
    const fmt = new Intl.NumberFormat(undefined,{style:'currency',currency}).format(displayTotal);
    await sendOrderConfirmation({ to: email, orderId: order._id, totalFormatted: fmt });
  } catch (e) {
    console.error('Email error', e?.message);
  }

  return new Response(JSON.stringify(order), { status: 201 });
}
