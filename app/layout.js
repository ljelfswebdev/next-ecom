
import './globals.css';
import Link from 'next/link';
import { Providers } from './providers';

export const metadata = { title: 'Ecom Store', description: 'Next.js + MongoDB Store' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="border-b bg-white">
            <div className="container flex items-center justify-between py-4">
              <Link href="/" className="font-bold text-lg">Ecom Store</Link>
              <nav className="flex items-center gap-4">
                <Link href="/shop" className="hover:underline">Shop</Link>
                <Link href="/cart" className="hover:underline">Cart</Link>
                <Link href="/account" className="hover:underline">Account</Link>
                <Link href="/admin" className="hover:underline">Admin</Link>
              </nav>
            </div>
          </header>
          <main className="container py-6">{children}</main>
          <footer className="container py-10 text-sm text-gray-500">© {new Date().getFullYear()} Ecom Store</footer>
        </Providers>
      </body>
    </html>
  );
}
