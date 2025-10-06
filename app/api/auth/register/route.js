
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { hash } from 'bcryptjs';

export async function POST(req) {
  const { email, password, name } = await req.json();
  if (!email || !password) return new Response('Missing fields', { status: 400 });
  await dbConnect();
  const exists = await User.findOne({ email });
  if (exists) return new Response('Email in use', { status: 400 });
  const passwordHash = await hash(password, 10);
  await User.create({ email, passwordHash, name, role: 'customer' });
  return new Response(JSON.stringify({ ok: true }), { status: 201 });
}
