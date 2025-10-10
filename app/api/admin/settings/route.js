// app/api/admin/settings/route.js
import { dbConnect } from '@/lib/db';
import Settings from '@/models/Settings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function normalizeSettings(b) {
  const zones = ['UK','EU','USA'];
  const currs = ['GBP','EUR','USD'];

  const shipping = {};
  for (const z of zones) {
    shipping[z] = {};
    for (const c of currs) {
      const v = parseFloat(b?.shipping?.[z]?.[c]);
      if (Number.isFinite(v)) shipping[z][c] = +v.toFixed(2);
    }
  }
  const freeOverGBP = {};
  for (const z of zones) {
    const v = parseFloat(b?.freeOverGBP?.[z]);
    freeOverGBP[z] = Number.isFinite(v) ? +v.toFixed(2) : 0;
  }

  const couponsIn = Array.isArray(b?.coupons) ? b.coupons : [];
  const coupons = couponsIn.map(c => ({
    code: String(c?.code || '').toUpperCase().replace(/\s+/g,''),
    type: c?.type === 'fixed' ? 'fixed' : 'percent',
    amount: Math.max(0, parseFloat(c?.amount) || 0),
    appliesTo: {
      scope: ['all','categories','products'].includes(c?.appliesTo?.scope) ? c.appliesTo.scope : 'all',
      ids: Array.isArray(c?.appliesTo?.ids) ? c.appliesTo.ids.map(String).filter(Boolean) : [],
    },
    validFrom: c?.validFrom ? new Date(c.validFrom) : undefined,
    validTo:   c?.validTo   ? new Date(c.validTo)   : undefined,
    usageLimit: Math.max(0, parseInt(c?.usageLimit || 0,10)),
    usedCount: Math.max(0, parseInt(c?.usedCount || 0,10)),
    enabled: !!c?.enabled,
  })).filter(c => c.code && c.amount > 0);

  return {
    vatPercent: Number.isFinite(+b?.vatPercent) ? +b.vatPercent : 20,
    fx: {
      GBP: Number.isFinite(+b?.fx?.GBP) ? +b.fx.GBP : 1,
      EUR: Number.isFinite(+b?.fx?.EUR) ? +b.fx.EUR : 1.15,
      USD: Number.isFinite(+b?.fx?.USD) ? +b.fx.USD : 1.28,
    },
    supportedCurrencies: Array.isArray(b?.supportedCurrencies) && b.supportedCurrencies.length
      ? b.supportedCurrencies
      : ['GBP','EUR','USD'],

    shipping,
    freeOverGBP,

    storeName: String(b?.storeName || '').trim(),
    supportEmail: String(b?.supportEmail || '').trim(),
    storeAddress: String(b?.storeAddress || '').trim(),
    contactNumber: String(b?.contactNumber || '').trim(),

    coupons,
  };
}

export async function GET() {
  await dbConnect();
  const s = await Settings.findOne({}).lean();
  return Response.json(s || {});
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin','staff'].includes(session.user?.role)) {
    return new Response('Forbidden', { status: 403 });
  }

  await dbConnect();
  const body = await req.json();
  const doc = normalizeSettings(body);

  const updated = await Settings.findOneAndUpdate(
    {},
    { $set: doc },
    { new: true, upsert: true }
  ).lean();

  return Response.json(updated);
}