import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const { name, email, password, billing, shipping, shipSame } = body;

  if (!email || !password) {
    return new Response('Email and password required', { status: 400 });
  }

  const exists = await User.findOne({ email });
  if (exists) return new Response('Email already in use', { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const doc = {
    name: name || '',
    email,
    passwordHash,
    addresses: {
      billing: billing || null,
      shipping: shipSame ? (billing || null) : (shipping || null),
    },
  };

  const user = await User.create(doc);
  return new Response(JSON.stringify({ id: user._id }), { status: 201 });
}