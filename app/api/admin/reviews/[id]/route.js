import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Review from '@/models/Review';
import Product from '@/models/Product';

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();
  const rev = await Review.findByIdAndDelete(params.id).lean();
  if (!rev) return new Response('Not found', { status: 404 });

  // recompute product aggregates
  const agg = await Review.aggregate([
    { $match: { productId: rev.productId } },
    { $group: { _id: '$productId', count: { $sum: 1 }, avg: { $avg: '$rating' } } },
    { $project: { _id: 0, count: 1, avg: { $round: ['$avg', 1] } } },
  ]);
  const { count = 0, avg = 0 } = agg[0] || {};
  await Product.findByIdAndUpdate(rev.productId, { $set: { ratingCount: count, ratingAvg: avg } });

  return Response.json({ ok: true });
}