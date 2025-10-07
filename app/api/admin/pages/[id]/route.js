import { dbConnect } from '@/lib/db';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

function ensureAdmin(session){
  return session && (session.user?.role === 'admin' || session.user?.role === 'staff');
}

export async function GET(_req, { params }) {
  await dbConnect();
  const page = await Page.findById(params.id).lean();
  if(!page) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(page), { status: 200 });
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if(!ensureAdmin(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const body = await req.json();
  const page = await Page.findByIdAndUpdate(
    params.id,
    { $set: {
      title: body.title,
      slug: body.slug,
      status: body.status,
      blocks: Array.isArray(body.blocks)? body.blocks : [],
    }},
    { new: true }
  );
  if(!page) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(page), { status: 200 });
}

export async function DELETE(_req, { params }) {
  const session = await getServerSession(authOptions);
  if(!ensureAdmin(session)) return new Response('Forbidden', { status: 403 });
  await dbConnect();
  const ok = await Page.findByIdAndDelete(params.id);
  if(!ok) return new Response('Not found', { status: 404 });
  return new Response('Deleted', { status: 204 });
}