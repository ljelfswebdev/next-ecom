import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function GET(_req, { params }) {
  const { id } = params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return new Response('Not found', { status: 404 });
  }
  await dbConnect();
  const p = await Product.findById(id).select('_id title images').lean();
  if (!p) return new Response('Not found', { status: 404 });
  return Response.json(p);
}