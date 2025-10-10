import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const { oldPassword, newPassword } = await req.json();
  if (!oldPassword || !newPassword) return new Response('Missing fields', { status: 400 });

  const user = await User.findById(session.user.id);
  if (!user) return new Response('User not found', { status: 400 });

  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) return new Response('Old password incorrect', { status: 400 });

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}