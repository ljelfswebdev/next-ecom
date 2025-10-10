// app/api/admin/settings/route.js
import { dbConnect } from '@/lib/db';
import Settings from '@/models/Settings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  await dbConnect();
  let settings = await Settings.findOne({});
  if (!settings) settings = await Settings.create({});
  return new Response(JSON.stringify(settings), { status: 200 });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();
  const body = await req.json();
  const s = await Settings.findOneAndUpdate({}, body, { upsert: true, new: true });
  return new Response(JSON.stringify(s), { status: 200 });
}