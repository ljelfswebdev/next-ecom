
import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
export async function GET(req, { params }) {
  await dbConnect();
  const p = await Product.findOne({ slug: params.slug, status: 'published' });
  if (!p) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(p), { status: 200 });
}
