import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  await dbConnect();
  const order = await Order.findById(params.id).lean();
  if (!order) return new Response('Not found', { status: 404 });

  let customer = null;
  if (order.userId) {
    customer = await User.findById(order.userId)
      .select('name email addresses')
      .lean();
  }

  return Response.json({ order, customer });
}

// Optional: allow status updates from admin
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.json(); // { status?: 'created'|'paid'|'shipped'|'cancelled', note?: string }
  await dbConnect();
  const order = await Order.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true }
  ).lean();

  if (!order) return new Response('Not found', { status: 404 });
  return Response.json(order);
}