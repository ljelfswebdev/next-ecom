// app/api/admin/orders/route.js
import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const status = searchParams.get('status'); // created|confirmed|fulfilled|cancelled
  const dateFrom = searchParams.get('date_from'); // YYYY-MM-DD
  const dateTo = searchParams.get('date_to');     // YYYY-MM-DD

  const q = {};
  if (status && status !== 'all') q.status = status;
  if (dateFrom || dateTo) {
    q.createdAt = {};
    if (dateFrom) q.createdAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
    if (dateTo)   q.createdAt.$lte = new Date(dateTo   + 'T23:59:59.999Z');
  }

  const total = await Order.countDocuments(q);
  const orders = await Order.find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return new Response(JSON.stringify({ total, page, limit, orders }), { status: 200 });
}