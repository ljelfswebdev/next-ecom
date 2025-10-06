
import Link from 'next/link';
export default function Home() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">Welcome to the Store</h1>
        <p className="text-gray-600">Browse products, add to cart, and checkout (email only).</p>
        <div className="mt-4"><Link href="/shop" className="btn btn-primary">Go to Shop</Link></div>
      </div>
    </div>
  );
}
