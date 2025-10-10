// app/api/settings/route.js
import { dbConnect } from '@/lib/db';
import Settings from '@/models/Settings';

export async function GET() {
  await dbConnect();
  const s = await Settings.findOne({}).lean();

  const vatPercent = typeof s?.vatPercent === 'number' ? s.vatPercent : 20;
  const fx = s?.fx || { GBP:1, EUR:1.15, USD:1.28 };

  const zones = ['UK','EU','USA'];
  const currs = ['GBP','EUR','USD'];

  const baseShipping = s?.shipping || {};
  const shipping = {};
  for (const z of zones) {
    shipping[z] = {};
    const gbp = Number(baseShipping?.[z]?.GBP ?? 0);
    for (const c of currs) {
      const explicit = baseShipping?.[z]?.[c];
      if (typeof explicit === 'number') shipping[z][c] = +explicit.toFixed(2);
      else shipping[z][c] = +((gbp || 0) * (Number(fx?.[c] ?? 1))).toFixed(2);
    }
  }

  const freeOverGBP = {
    UK:  Number.isFinite(+s?.freeOverGBP?.UK)  ? +s.freeOverGBP.UK  : 0,
    EU:  Number.isFinite(+s?.freeOverGBP?.EU)  ? +s.freeOverGBP.EU  : 0,
    USA: Number.isFinite(+s?.freeOverGBP?.USA) ? +s.freeOverGBP.USA : 0,
  };

// app/api/settings/route.js  (snippet)
return Response.json({
  vatPercent,
  fx,
  shipping,
  freeOverGBP,
  hasCoupons: Array.isArray(s?.coupons) && s.coupons.length > 0, // ← this
  storeName: s?.storeName || '',
  supportEmail: s?.supportEmail || '',
  storeAddress: s?.storeAddress || '',
  contactNumber: s?.contactNumber || '',
});
}