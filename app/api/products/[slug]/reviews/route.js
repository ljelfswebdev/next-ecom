import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
import Review from '@/models/Review';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function getProductBySlug(slug) {
  await dbConnect();
  return Product.findOne({ slug }).lean();
}

export async function GET(_req, { params }) {
  const { slug } = params;
  const product = await getProductBySlug(slug);
  if (!product) return new Response('Not found', { status: 404 });

  const reviews = await Review.find({ productId: product._id })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({
    reviews: reviews.map(r => ({
      _id: r._id.toString(),
      userName: r.userName || 'Customer',
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
    ratingAvg: product.ratingAvg ?? 0,
    ratingCount: product.ratingCount ?? 0,
  });
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const { slug } = params;
  const body = await req.json();
  const { rating, comment } = body || {};

  if (!rating || rating < 1 || rating > 5) {
    return new Response('Rating must be 1–5', { status: 400 });
  }

  const product = await getProductBySlug(slug);
  if (!product) return new Response('Not found', { status: 404 });

  // upsert: allow exactly one review per user; update if they re-submit
  const doc = await Review.findOneAndUpdate(
    { productId: product._id, userId: session.user.id },
    {
      $set: {
        productId: product._id,
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Customer',
        rating: Number(rating),
        comment: (comment || '').toString().slice(0, 4000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // recompute aggregates + denormalize on product
  const agg = await Review.aggregate([
    { $match: { productId: product._id } },
    { $group: { _id: '$productId', count: { $sum: 1 }, avg: { $avg: '$rating' } } },
    { $project: { _id: 0, count: 1, avg: { $round: ['$avg', 1] } } },
  ]);

  const { count = 0, avg = 0 } = agg[0] || {};
  await Product.findByIdAndUpdate(product._id, {
    $set: { ratingCount: count, ratingAvg: avg },
  });

  return Response.json({ ok: true, reviewId: doc._id, ratingCount: count, ratingAvg: avg });
}