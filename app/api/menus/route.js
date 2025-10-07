import { dbConnect } from '@/lib/db';
import Menu from '@/models/Menu';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function can(session){ return session?.user && ['admin','staff'].includes(session.user.role); }

export async function GET(){
  const session = await getServerSession(authOptions);
  if (!can(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const list = await Menu.find({}).sort({ createdAt: -1 }).lean();
  return new Response(JSON.stringify(list), { status: 200 });
}

export async function POST(req){
  const session = await getServerSession(authOptions);
  if (!can(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const body = await req.json();
  const created = await Menu.create({
    title: body.title || 'Menu',
    slug:  (body.slug || 'main').replace(/\s+/g,'-').toLowerCase(),
    status: body.status || 'published',
    items:  Array.isArray(body.items) ? body.items : [],
  });
  return new Response(JSON.stringify(created), { status: 201 });
}