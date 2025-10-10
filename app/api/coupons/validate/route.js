// app/api/coupons/validate/route.js
import { dbConnect } from '@/lib/db';
import Settings from '@/models/Settings';

export async function GET(req) {
  await dbConnect();
  const url = new URL(req.url);
  const codeRaw = (url.searchParams.get('code') || '').trim().toUpperCase();
  if (!codeRaw) return new Response('Missing code', { status: 400 });

  const s = await Settings.findOne({}).lean();
  const now = new Date();

  const found = (s?.coupons || []).find(c => {
    if (!c?.enabled) return false;
    if ((c.code || '').toUpperCase() !== codeRaw) return false;
    if (c.validFrom && new Date(c.validFrom) > now) return false;
    if (c.validTo && now > new Date(c.validTo)) return false;
    if (c.usageLimit > 0 && (c.usedCount || 0) >= c.usageLimit) return false;
    return true;
  });

  if (!found) return new Response('Invalid or expired code', { status: 404 });

  // Return only what the cart needs to calculate locally
  const safe = {
    code: found.code,
    type: found.type,              // 'percent' | 'fixed'
    amount: found.amount,          // number
    appliesTo: {
      scope: found.appliesTo?.scope || 'all',
      ids: (found.appliesTo?.ids || []).map(String),
    },
  };
  return Response.json(safe);
}