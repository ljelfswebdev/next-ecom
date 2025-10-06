// app/api/settings/route.js
import { dbConnect } from '@/lib/db';
import Settings from '@/models/Settings';

export async function GET() {
  await dbConnect();
  const s = await Settings.findOne({}).lean();

  // Defaults if nothing saved yet
  const vatPercent = typeof s?.vatPercent === 'number' ? s.vatPercent : 20;
  const fx = s?.fx || { GBP: 1, EUR: 1.15, USD: 1.28 };

  // We accept either:
  //  A) per-currency shipping: shipping.{zone}.{currency}
  //  B) GBP-only shipping and we derive others using fx
  const baseShipping = s?.shipping || {};
  const zones = ['UK','EU','USA'];
  const currs = ['GBP','EUR','USD'];

  const shipping = {};
  for (const z of zones) {
    shipping[z] = shipping[z] || {};
    const gbp = Number(baseShipping?.[z]?.GBP ?? 0);
    for (const c of currs) {
      const explicit = baseShipping?.[z]?.[c];
      if (typeof explicit === 'number') {
        shipping[z][c] = +explicit.toFixed(2);
      } else {
        // derive from GBP using fx when not explicitly set
        const rate = Number(fx?.[c] ?? 1);
        shipping[z][c] = +(gbp * rate).toFixed(2);
      }
    }
  }

  const supportedCurrencies = s?.supportedCurrencies || ['GBP','EUR','USD'];

  return Response.json({ vatPercent, fx, shipping, supportedCurrencies });
}