import { dbConnect } from '@/lib/db';
import Menu from '@/models/Menu';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function can(session){ return session?.user && ['admin','staff'].includes(session.user.role); }

export async function GET(_req, { params }){
  const session = await getServerSession(authOptions);
  if (!can(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const m = await Menu.findById(params.id).lean();
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(m), { status: 200 });
}

export async function PATCH(req, { params }){
  const session = await getServerSession(authOptions);
  if (!can(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const body = await req.json();
  const updated = await Menu.findByIdAndUpdate(
    params.id,
    {
      $set: {
        title: body.title,
        slug:  body.slug,
        status: body.status,
        items: Array.isArray(body.items) ? body.items : [],
      }
    },
    { new: true }
  ).lean();
  if (!updated) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(updated), { status: 200 });
}

export async function DELETE(_req, { params }){
  const session = await getServerSession(authOptions);
  if (!can(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  await Menu.findByIdAndDelete(params.id);
  return new Response('ok', { status: 200 });
}