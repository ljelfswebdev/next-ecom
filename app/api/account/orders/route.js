import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await dbConnect();

    const userId = session.user?.id || null;
    const email = session.user?.email || null;

    if (!userId && !email) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // Flexible query: by userId or email (for guest checkouts)
    const query = { $or: [] };
    if (userId) query.$or.push({ customerId: userId });
    if (email) query.$or.push({ customerEmail: email }, { email });

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    return new Response(JSON.stringify(orders), { status: 200 });
  } catch (err) {
    console.error('🔥 /api/account/orders error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}