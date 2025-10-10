// app/api/settings/route.js
import { dbConnect } from '@/lib/db';
import Settings from '@/models/Settings';

export async function GET() {
  await dbConnect();
  const s = await Settings.findOne({}).lean();

  const vatPercent = typeof s?.vatPercent === 'number' ? s.vatPercent : 20;

  // Keep fx/shipping logic even if UK-only
  const fx = s?.fx || { GBP: 1, EUR: 1.15, USD: 1.28 };

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
        const rate = Number(fx?.[c] ?? 1);
        shipping[z][c] = +(gbp * rate).toFixed(2);
      }
    }
  }

  // ✅ compute AND RETURN this
  const freeOverGBP = {
    UK:  typeof s?.freeOverGBP?.UK  === 'number' ? s.freeOverGBP.UK  : 0,
    EU:  typeof s?.freeOverGBP?.EU  === 'number' ? s.freeOverGBP.EU  : 0,
    USA: typeof s?.freeOverGBP?.USA === 'number' ? s.freeOverGBP.USA : 0,
  };

  const supportedCurrencies = s?.supportedCurrencies || ['GBP','EUR','USD'];

  // store info
  const storeName = s?.storeName || '';
  const supportEmail = s?.supportEmail || '';
  const storeAddress = s?.storeAddress || '';
  const contactNumber = s?.contactNumber || '';

  return Response.json({
    vatPercent,
    fx,
    shipping,
    supportedCurrencies,
    freeOverGBP,        // ← missing before
    storeName,
    supportEmail,
    storeAddress,
    contactNumber,
  });
}