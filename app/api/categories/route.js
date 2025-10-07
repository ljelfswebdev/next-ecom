// app/api/categories/route.js
import { dbConnect } from '@/lib/db';
import Category from '@/models/Category';

export async function GET() {
  await dbConnect();
  const list = await Category.find({ status: 'published' })
    .sort({ title: 1 })
    .select('title slug');
  return new Response(JSON.stringify(list), { status: 200 });
}