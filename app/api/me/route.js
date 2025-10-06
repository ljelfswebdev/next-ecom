// app/api/me/route.js
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  await dbConnect();

  // get user either by id from session or fallback to email
  const query = session.user?.id
    ? { _id: session.user.id }
    : { email: session.user?.email };

  const user = await User.findOne(query).lean();
  if (!user) return new Response('Not found', { status: 404 });

  return Response.json({
    _id: user._id.toString(),
    email: user.email,
    name: user.name ?? '',
    addresses: user.addresses ?? { billing: {}, shipping: {} },
  });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  await dbConnect();

  const body = await req.json();
  const { name, addresses } = body || {};

  const query = session.user?.id
    ? { _id: session.user.id }
    : { email: session.user?.email };

  const next = await User.findOneAndUpdate(
    query,
    {
      ...(typeof name === 'string' ? { name } : {}),
      ...(addresses ? { addresses } : {}),
    },
    { new: true }
  ).lean();

  if (!next) return new Response('Not found', { status: 404 });

  return Response.json({
    _id: next._id.toString(),
    email: next.email,
    name: next.name ?? '',
    addresses: next.addresses ?? { billing: {}, shipping: {} },
  });
}