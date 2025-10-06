
import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const filter = q ? { title: { $regex: q, $options: 'i' }, status:'published' } : { status:'published' };
  const products = await Product.find(filter).limit(50);
  return new Response(JSON.stringify(products), { status: 200 });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const body = await req.json();
  const p = await Product.create(body);
  return new Response(JSON.stringify(p), { status: 201 });
}
