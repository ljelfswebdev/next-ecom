// app/api/admin/categories/route.js
import { dbConnect } from '@/lib/db';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  await dbConnect();
  const list = await Category.find({}).sort({ createdAt: -1 });
  return new Response(JSON.stringify(list), { status: 200 });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin','staff'].includes(session.user?.role)) {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();
  const body = await req.json();
  const c = await Category.create({
    title: body.title,
    slug: (body.slug || '').replace(/^\//,''),
    description: body.description || '',
    status: body.status || 'published'
  });
  return new Response(JSON.stringify(c), { status: 201 });
}