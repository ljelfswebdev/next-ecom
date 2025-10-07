'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import MainMenu from '@/components/MainMenu';

export default function Header() {
  const { data: session, status } = useSession(); // include both data and status
  const isAdmin = session?.user?.role === 'admin';

  return (
    <header className="flex items-center justify-between py-4">
      <Link href="/" className="font-bold text-lg">
        MyStore
      </Link>

      <nav className="flex items-center gap-4">
        <MainMenu slug="main"/>

        <Link href="/shop">Shop</Link>

        {isAdmin && (
          <Link href="/admin" className="btn">
            Admin
          </Link>
        )}

        {status === 'loading' ? (
          <span className="text-gray-500 text-sm">Loading...</span>
        ) : status === 'authenticated' ? (
          <>
            <Link href="/account" className="btn">
              Account
            </Link>
            <button
              className="btn"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn">
              Login
            </Link>
            <Link href="/register" className="btn">
              Create account
            </Link>
          </>
        )}

        <Link href="/cart" className="btn">
          Cart
        </Link>
      </nav>
    </header>
  );
}