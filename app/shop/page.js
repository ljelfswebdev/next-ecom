
import Link from 'next/link';
async function getProducts(){ const r = await fetch(`${process.env.AUTH_URL || ''}/api/products`, { cache:'no-store' }); return r.json(); }
export default async function ShopPage(){
  const products = await getProducts();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {products.map(p => (
        <div key={p._id} className="card">
          {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-48 object-cover rounded-xl" />}
          <h3 className="font-semibold mt-2">{p.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>
          <Link href={`/product/${p.slug}`} className="btn mt-3">View</Link>
        </div>
      ))}
    </div>
  );
}
