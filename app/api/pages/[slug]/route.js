import { dbConnect } from '@/lib/db';
import Page from '@/models/Page';

export async function GET(_req, { params }) {
  await dbConnect();
  const page = await Page.findOne({ slug: params.slug }).lean();
  if(!page) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(page), { status: 200 });
}