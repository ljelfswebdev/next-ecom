// app/api/admin/categories/[id]/route.js
import { dbConnect } from '@/lib/db';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin','staff'].includes(session.user?.role)) {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();
  const body = await req.json();
  const c = await Category.findByIdAndUpdate(params.id, {
    title: body.title,
    slug: (body.slug || '').replace(/^\//,''),
    description: body.description || '',
    status: body.status || 'published'
  }, { new: true });
  if (!c) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(c), { status: 200 });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin','staff'].includes(session.user?.role)) {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();
  await Category.findByIdAndDelete(params.id);
  return new Response('OK', { status: 200 });
}