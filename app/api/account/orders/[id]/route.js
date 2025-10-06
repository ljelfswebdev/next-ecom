import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(_, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  const { id } = params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return new Response('Not found', { status: 404 });
  }

  await dbConnect();
  const order = await Order.findById(id).lean();
  if (!order) return new Response('Not found', { status: 404 });

  // Privacy: only the owner (email) can see it
  if (order.email !== session.user.email) {
    return new Response('Forbidden', { status: 403 });
  }

  return Response.json(order);
}