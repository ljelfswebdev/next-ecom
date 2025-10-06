import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

async function assertStaff() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
    return { res: new Response('Forbidden', { status: 403 }) };
  }
  return {};
}

export async function GET(_req, { params }) {
  const guard = await assertStaff(); if (guard.res) return guard.res;
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(params.id)) return new Response('Invalid id', { status: 400 });
  const order = await Order.findById(params.id).lean();
  if (!order) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(order), { status: 200 });
}

export async function PATCH(req, { params }) {
  const guard = await assertStaff(); if (guard.res) return guard.res;
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(params.id)) return new Response('Invalid id', { status: 400 });
  const body = await req.json();
  const updated = await Order.findByIdAndUpdate(params.id, body, { new: true });
  if (!updated) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(updated), { status: 200 });
}