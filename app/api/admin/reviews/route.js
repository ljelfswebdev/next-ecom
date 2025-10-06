// app/api/admin/reviews/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Review from '@/models/Review';
import Product from '@/models/Product';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q        = searchParams.get('q') || '';           // text search in comment / userName
  const rating   = Number(searchParams.get('rating')||0); // 1..5
  const slug     = searchParams.get('slug') || '';        // product slug filter
  const pid      = searchParams.get('productId') || '';   // productId filter
  const from     = searchParams.get('from');              // ISO date
  const to       = searchParams.get('to');                // ISO date
  const limit    = Math.min(Number(searchParams.get('limit')||20), 100);
  const cursor   = searchParams.get('cursor');            // pagination by createdAt

  const match = {};
  if (rating >= 1 && rating <= 5) match.rating = rating;
  if (q) match.$or = [
    { comment: { $regex: q, $options: 'i' } },
    { userName: { $regex: q, $options: 'i' } },
  ];
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to)   match.createdAt.$lte = new Date(to);
  }
  if (pid) match.productId = pid;

  // resolve slug -> productId
  if (slug && !pid) {
    const p = await Product.findOne({ slug }).select('_id').lean();
    match.productId = p?._id || null;
  }

  // cursor pagination (createdAt)
  if (cursor) {
    match.createdAt = match.createdAt || {};
    match.createdAt.$lt = new Date(cursor);
  }

  // join products for titles/slugs
  const items = await Review.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: limit + 1 },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $project: {
        _id: 1, productId: 1, userId: 1, userName: 1, rating: 1, comment: 1, createdAt: 1,
        productTitle: '$product.title', productSlug: '$product.slug'
    } }
  ]);

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

  return Response.json({ items, nextCursor });
}