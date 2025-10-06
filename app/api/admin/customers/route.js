import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const q = (searchParams.get('q') || '').trim();

  const filter = {};
  if (q) {
    filter.$or = [
      { email: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(filter);
  const customers = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
    .select('name email role createdAt addresses')
    .lean();

  return new Response(JSON.stringify({ total, page, limit, customers }), { status: 200 });
}