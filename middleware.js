// middleware.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const url = req.nextUrl;
  if (!url.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // not logged in -> send to sign-in (keeps callback to admin page)
    const signin = new URL('/api/auth/signin', req.url);
    signin.searchParams.set('callbackUrl', url.pathname);
    return NextResponse.redirect(signin);
  }

  if (token.role !== 'admin') {
    // logged in but not admin
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};