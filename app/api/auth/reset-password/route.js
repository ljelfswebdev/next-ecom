import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import PasswordResetToken from '@/models/PasswordResetToken';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  await dbConnect();
  const { token, password } = await req.json();

  if (!token || !password) return new Response('Missing token/password', { status: 400 });

  const rec = await PasswordResetToken.findOne({ token });
  if (!rec) return new Response('Invalid token', { status: 400 });
  if (rec.used) return new Response('Token already used', { status: 400 });
  if (rec.expiresAt < new Date()) return new Response('Token expired', { status: 400 });

  const user = await User.findById(rec.userId);
  if (!user) return new Response('User not found', { status: 400 });

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(password, salt);
  await user.save();

  rec.used = true;
  rec.usedAt = new Date();
  await rec.save();

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}