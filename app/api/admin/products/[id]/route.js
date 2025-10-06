import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

async function assertStaff() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
    return { res: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) };
  }
  return {};
}

export async function GET(_req, { params }) {
  const guard = await assertStaff(); if (guard.res) return guard.res;
  await dbConnect();
  try {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }
    const p = await Product.findById(id);
    if (!p) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(p), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Server error' }), { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const guard = await assertStaff(); if (guard.res) return guard.res;
  await dbConnect();
  try {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }
    const body = await req.json();
    const updated = await Product.findByIdAndUpdate(id, body, { new: true });
    if (!updated) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Server error' }), { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const guard = await assertStaff(); if (guard.res) return guard.res;
  await dbConnect();
  try {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Server error' }), { status: 500 });
  }
}