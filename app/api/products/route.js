// app/api/products/route.js
import { dbConnect } from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
  await dbConnect();
  const url = new URL(req.url);
  const category = url.searchParams.get('category'); // category slug, optional
  const sizes = url.searchParams.get('sizes');       // "XS,S,M"
  const colors = url.searchParams.get('colors');     // "red,blue"
  const sort = url.searchParams.get('sort');         // 'az'|'za'|'price-asc'|'price-desc'
  const qText = url.searchParams.get('q');           // optional search by title

  const q = { status: 'published' };

  // category (by slug)
  if (category) {
    const cat = await Category.findOne({ slug: category });
    if (cat) q.categoryIds = { $in: [cat._id] };
    else return new Response(JSON.stringify([]), { status: 200 });
  }

  // sizes/colors (any match)
  if (sizes) {
    const arr = sizes.split(',').map(s=>s.trim()).filter(Boolean);
    if (arr.length) q.sizesAvailable = { $in: arr };
  }
  if (colors) {
    const arr = colors.split(',').map(s=>s.trim()).filter(Boolean);
    if (arr.length) q.colorsAvailable = { $in: arr };
  }

  // quick text search on title
  if (qText) {
    q.title = { $regex: qText, $options: 'i' };
  }

  // sorting
  let sortObj = { createdAt: -1 };
  if (sort === 'az') sortObj = { title: 1 };
  if (sort === 'za') sortObj = { title: -1 };
  if (sort === 'price-asc')  sortObj = { basePriceExVat: 1 };
  if (sort === 'price-desc') sortObj = { basePriceExVat: -1 };

  const list = await Product.find(q).sort(sortObj);
  return new Response(JSON.stringify(list), { status: 200 });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin','staff'].includes(session.user?.role)) {
    return new Response('Forbidden', { status: 403 });
  }
  await dbConnect();
  const b = await req.json();
  const doc = await Product.create({
    title: b.title,
    slug: (b.slug || '').replace(/^\//,''),
    description: b.description || '',
    images: Array.isArray(b.images) ? b.images : [],
    basePriceExVat: parseFloat(b.basePriceExVat || 0),
    sizesAvailable: Array.isArray(b.sizesAvailable) ? b.sizesAvailable : [],
    colorsAvailable: Array.isArray(b.colorsAvailable) ? b.colorsAvailable : [],
    variants: Array.isArray(b.variants) ? b.variants : [],
    categoryIds: Array.isArray(b.categoryIds) ? b.categoryIds : [],
    category: b.category, // legacy
    status: b.status || 'published',
  });
  return new Response(JSON.stringify(doc), { status: 201 });
}