
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
export default async function AdminPage(){
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role!=='admin' && role!=='staff')) return <div className="card">Forbidden. <Link href="/login" className="underline">Login</Link></div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/admin/products" className="card hover:bg-gray-50">Products</Link>
        <Link href="/admin/settings" className="card hover:bg-gray-50">Settings</Link>
        <Link href="/admin/orders" className="card hover:bg-gray-50">Orders</Link>
        <Link href="/admin/reviews" className="card hover:bg-gray-50">Reviews</Link>
        <Link href="/admin/pages" className="card hover:bg-gray-50">Pages</Link>
      </div>
    </div>
  );
}
