import { dbConnect } from '@/lib/db';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function ensureAdmin(session){
  return session && (session.user?.role === 'admin' || session.user?.role === 'staff');
}

export async function GET() {
  await dbConnect();
  const pages = await Page.find({}).sort({ updatedAt: -1 }).lean();
  return new Response(JSON.stringify(pages), { status: 200 });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if(!ensureAdmin(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const body = await req.json();
  // very basic guard
  const page = await Page.create({
    title: body.title,
    slug: body.slug,
    status: body.status || 'draft',
    blocks: Array.isArray(body.blocks) ? body.blocks : [],
  });
  return new Response(JSON.stringify(page), { status: 201 });
}